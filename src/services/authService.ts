import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserSessionPersistence,
  User,
} from "firebase/auth";
import { auth } from "./firebase";
import { clearSessionVaultKey } from "./localVaultCrypto";

const GOOGLE_ACCESS_TOKEN_KEY = "ana_lima_google_access_token";
const GOOGLE_TOKEN_EXPIRES_KEY = "ana_lima_google_token_expires_at";

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export function formatAuthError(error: any): string {
  if (!error) return "Ocorreu um erro inesperado.";
  const code = error.code || "";

  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return 'Senha incorreta para esta conta. Verifique sua senha ou clique em "Esqueceu a senha?".';
    case "auth/user-not-found":
      return "Não foi possível autenticar com as credenciais informadas.";
    case "auth/email-already-in-use":
      return 'Este e-mail já está cadastrado. Use a aba "Entrar na Minha Conta".';
    case "auth/invalid-email":
      return "E-mail inválido. Verifique a digitação.";
    case "auth/weak-password":
      return "A senha deve ter pelo menos 12 caracteres com letras maiúsculas, minúsculas, números e símbolos.";
    case "auth/popup-closed-by-user":
      return "A janela do Google foi fechada antes de concluir a conexão.";
    case "auth/popup-blocked":
      return "O navegador bloqueou a janela de login do Google. Permita pop-ups para este site.";
    case "auth/unauthorized-domain":
      return "Este domínio precisa estar autorizado no Firebase Authentication.";
    case "auth/configuration-not-found":
      return "Serviço de autenticação do Firebase recém-ativado. Recarregue a página e tente novamente.";
    case "auth/network-request-failed":
      return "Falha de conexão com a internet. Verifique sua rede.";
    case "auth/too-many-requests":
      return "Muitas tentativas seguidas. Aguarde alguns instantes ou redefina a senha.";
    case "auth/operation-not-allowed":
      return "O provedor de login foi ativado agora. Tente novamente em alguns segundos.";
    default:
      return error.message || "Erro ao realizar autenticação.";
  }
}

// Validador de complexidade de senha no frontend (CFP & Segurança Máxima)
export function validatePasswordStrength(pass: string): {
  valid: boolean;
  reason?: string;
} {
  if (pass.length < 12) {
    return {
      valid: false,
      reason: "A senha deve conter no mínimo 12 caracteres.",
    };
  }
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasNumber = /[0-9]/.test(pass);
  const hasSpecial = /[^A-Za-z0-9]/.test(pass);
  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return {
      valid: false,
      reason:
        "A senha deve conter letras maiúsculas, minúsculas, números e símbolos.",
    };
  }
  return { valid: true };
}

export const authService = {
  getCurrentUser(): User | null {
    return auth ? auth.currentUser : null;
  },

  getGoogleAccessToken(): string | null {
    try {
      const token = sessionStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
      const expiresAt = Number(
        sessionStorage.getItem(GOOGLE_TOKEN_EXPIRES_KEY) || "0",
      );
      if (!token) return null;
      // Token OAuth do Google dura ~1h (3500s)
      if (expiresAt && Date.now() > expiresAt) {
        return null;
      }
      return token;
    } catch {
      return null;
    }
  },

  hasGoogleCalendarIntegration(): boolean {
    return Boolean(this.getGoogleAccessToken());
  },

  saveGoogleAccessToken(token?: string | null): void {
    try {
      if (token) {
        sessionStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, token);
        // 55 minutos de validade segura
        sessionStorage.setItem(
          GOOGLE_TOKEN_EXPIRES_KEY,
          String(Date.now() + 55 * 60 * 1000),
        );
        window.dispatchEvent(
          new CustomEvent("google-calendar-auth-changed", {
            detail: { connected: true },
          }),
        );
      }
    } catch (e) {
      console.warn("Não foi possível salvar o token do Google:", e);
    }
  },

  clearGoogleAccessToken(): void {
    try {
      sessionStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(GOOGLE_TOKEN_EXPIRES_KEY);
      window.dispatchEvent(
        new CustomEvent("google-calendar-auth-changed", {
          detail: { connected: false },
        }),
      );
    } catch {
      // ignore
    }
  },

  subscribeToAuthState(callback: (user: User | null) => void): () => void {
    if (!auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, (user) => {
      callback(user);
    });
  },

  async loginWithEmail(email: string, pass: string): Promise<User> {
    if (!auth) throw new Error("Firebase Auth não inicializado.");
    const cleanEmail = email.trim();
    const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    return result.user;
  },

  async registerWithEmail(_email: string, _pass: string): Promise<User> {
    throw new Error(
      "O autocadastro público está permanentemente desabilitado por segurança e conformidade.",
    );
  },

  async configureSessionPersistence(isSharedDevice: boolean): Promise<void> {
    if (!auth) return;
    const mode = isSharedDevice
      ? browserSessionPersistence
      : browserSessionPersistence;
    await setPersistence(auth, mode);
  },

  async loginWithGoogle(): Promise<User> {
    if (!auth) throw new Error("Firebase Auth não inicializado.");
    const provider = new GoogleAuthProvider();
    // Escopos de identidade padrão do Google (profile e email).
    // Não solicita escopos restritos/sensíveis de calendário no login,
    // eliminando completamente o aviso "Google não verificou este app" / "não seguro".
    provider.setCustomParameters({
      prompt: "select_account",
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      this.saveGoogleAccessToken(credential.accessToken);
    }
    return result.user;
  },

  async reconnectGoogleCalendar(): Promise<string | null> {
    if (!auth) throw new Error("Firebase Auth não inicializado.");
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/calendar.events");
    provider.addScope("https://www.googleapis.com/auth/calendar");
    provider.setCustomParameters({
      prompt: "consent select_account",
      access_type: "online",
    });
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      this.saveGoogleAccessToken(credential.accessToken);
    }
    return this.getGoogleAccessToken();
  },

  async sendPasswordReset(email: string): Promise<void> {
    if (!auth) throw new Error("Firebase Auth não inicializado.");
    await sendPasswordResetEmail(auth, email.trim());
  },

  async logout(): Promise<void> {
    if (auth) await signOut(auth);
    this.clearGoogleAccessToken();
    clearSessionVaultKey();
  },
};
