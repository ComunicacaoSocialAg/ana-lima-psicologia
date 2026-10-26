import React, { useState } from "react";
import {
  X,
  Lock,
  Mail,
  Key,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { authService, formatAuthError } from "../../services/authService";
import { DandelionLogo } from "../common/DandelionLogo";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === "login") {
        await authService.loginWithEmail(email, password);
        setSuccessMessage(
          "Login efetuado com sucesso! Verificando sincronização com o servidor.",
        );
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 800);
      } else if (mode === "forgot") {
        await authService.sendPasswordReset(email);
        setSuccessMessage(
          "E-mail de redefinição de senha enviado! Verifique sua caixa de entrada.",
        );
        setTimeout(() => setMode("login"), 3000);
      }
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await authService.loginWithGoogle();
      setSuccessMessage(
        "Conectado com sucesso! Verificando sincronização com o servidor.",
      );
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header com Identidade Visual Dente de Leão (#1C2B22 & #F7F5F0) */}
        <div className="bg-[#1C2B22] text-[#F7F5F0] p-6 relative border-b border-[#F7F5F0]/15">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#F7F5F0]/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 mb-2">
            <DandelionLogo
              size={48}
              variant="light"
              rounded="2xl"
              className="shadow-md ring-2 ring-[#F7F5F0]/25"
            />
            <div>
              <h2 className="text-lg font-bold leading-tight text-[#F7F5F0]">
                Acesso ao consultório
              </h2>
              <p className="text-xs text-[#F7F5F0]/80">
                Consultório de Psicologia • Ana Lima (CRP 04/60205)
              </p>
            </div>
          </div>

          <p className="text-xs text-[#F7F5F0]/90 leading-relaxed mt-2">
            Acesse seus pacientes, agendamentos e prontuários simultaneamente no
            computador e no celular com acesso restrito à sua conta.
          </p>
        </div>

        {/* Cabeçalho de Acesso Exclusivo */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
          <span>
            {mode === "login"
              ? "Acesso Restrito da Psicóloga Titular"
              : "Recuperação de Senha"}
          </span>
          <span className="text-[10px] text-slate-400 font-normal">
            Autocadastro desativado
          </span>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Atenção</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              E-mail da Psicóloga
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu e-mail de acesso"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Senha de Acesso
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                    }}
                    className="text-[11px] text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando...
              </span>
            ) : mode === "login" ? (
              <>
                <span>Entrar e Sincronizar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <span>Enviar Link de Recuperação</span>
            )}
          </button>

          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium mt-2"
            >
              ← Voltar para o Login
            </button>
          )}

          {/* Divisor */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-white px-2 text-slate-400">
                Ou use sua conta Google
              </span>
            </div>
          </div>

          {/* Botão Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium rounded-xl text-xs shadow-2xs transition-all flex items-center justify-center gap-2.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Conectar Google (Agenda, Meet & Nuvem)</span>
          </button>

          {/* Rodapé de Segurança */}
          <div className="pt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Acesso autenticado e cofre local protegido por senha.</span>
          </div>
        </form>
      </div>
    </div>
  );
};

// Ícone amigável de nuvem
const CloudSyncIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"
    />
  </svg>
);
