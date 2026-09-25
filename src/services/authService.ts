import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  sendPasswordResetEmail,
  updateProfile,
  User 
} from 'firebase/auth';
import { auth } from './firebase';

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export function formatAuthError(error: any): string {
  if (!error) return 'Ocorreu um erro inesperado.';
  const code = error.code || '';

  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Senha incorreta ou credenciais inválidas.';
    case 'auth/user-not-found':
      return 'Nenhuma conta encontrada com este e-mail.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado. Tente entrar ou recupere a senha.';
    case 'auth/invalid-email':
      return 'E-mail inválido. Verifique a digitação.';
    case 'auth/weak-password':
      return 'A senha é muito fraca. Digite pelo menos 6 caracteres.';
    case 'auth/popup-closed-by-user':
      return 'A janela do Google foi fechada antes de concluir o login.';
    case 'auth/network-request-failed':
      return 'Falha de conexão com a internet. Verifique sua rede.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas sem sucesso. Aguarde alguns minutos ou redefina a senha.';
    case 'auth/operation-not-allowed':
      return 'O método de login ainda não foi ativado no Firebase Console. Ative o provedor Email/Senha em Authentication.';
    default:
      return error.message || 'Erro ao realizar autenticação.';
  }
}

export const authService = {
  getCurrentUser(): User | null {
    return auth ? auth.currentUser : null;
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
    if (!auth) throw new Error('Firebase Auth não inicializado.');
    const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return result.user;
  },

  async registerWithEmail(email: string, pass: string, displayName = 'Ana Lima'): Promise<User> {
    if (!auth) throw new Error('Firebase Auth não inicializado.');
    const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (displayName && result.user) {
      try {
        await updateProfile(result.user, { displayName });
      } catch (e) {
        console.warn('Erro ao atualizar displayName:', e);
      }
    }
    return result.user;
  },

  async loginWithGoogle(): Promise<User> {
    if (!auth) throw new Error('Firebase Auth não inicializado.');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    return result.user;
  },

  async sendPasswordReset(email: string): Promise<void> {
    if (!auth) throw new Error('Firebase Auth não inicializado.');
    await sendPasswordResetEmail(auth, email.trim());
  },

  async logout(): Promise<void> {
    if (!auth) return;
    await signOut(auth);
  }
};
