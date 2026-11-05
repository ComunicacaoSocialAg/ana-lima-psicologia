import React, { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { authService } from "../../services/authService";
import { AuthModal } from "./AuthModal";
import { DandelionLogo } from "../common/DandelionLogo";
import { ShieldCheck, AlertCircle } from "lucide-react";

export const OWNER_UID = "psHLxoIeGfRNqQSwTbPUVxFCU8H2";

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    authService.getCurrentUser(),
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [unauthorizedError, setUnauthorizedError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthState(async (user) => {
      setIsLoading(false);
      if (user) {
        if (user.uid === OWNER_UID) {
          setCurrentUser(user);
          setUnauthorizedError(null);
        } else {
          setCurrentUser(null);
          setUnauthorizedError(
            `Acesso negado: a conta conectada (${user.email || "desconhecida"}) não possui autorização para este consultório.`,
          );
          try {
            await authService.logout();
          } catch (e) {
            console.warn("Erro ao desconectar usuário não autorizado:", e);
          }
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1C2B22] flex flex-col items-center justify-center p-6 text-[#F7F5F0]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <DandelionLogo size={64} variant="light" rounded="2xl" className="shadow-lg ring-2 ring-[#F7F5F0]/20" />
          <div className="text-center">
            <h1 className="text-lg font-semibold text-white tracking-wide">Ana Lima • Psicologia Clínica</h1>
            <p className="text-xs text-[#F7F5F0]/70 mt-1">Verificando credenciais seguras…</p>
          </div>
        </div>
      </div>
    );
  }

  // Usuário não autenticado ou não autorizado: bloqueio total da aplicação
  if (!currentUser || currentUser.uid !== OWNER_UID) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        {unauthorizedError && (
          <div className="mb-4 max-w-md w-full bg-rose-950/90 border border-rose-500/50 text-rose-200 p-4 rounded-2xl text-xs flex items-start gap-3 shadow-xl">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-rose-100 mb-0.5">Conta Não Autorizada</span>
              <span>{unauthorizedError}</span>
            </div>
          </div>
        )}
        <AuthModal
          isOpen={true}
          onClose={() => {}}
          canClose={false}
          onSuccess={() => {
            const user = authService.getCurrentUser();
            if (user && user.uid === OWNER_UID) {
              setCurrentUser(user);
              setUnauthorizedError(null);
            }
          }}
        />
      </div>
    );
  }

  // Usuário titular validado e autenticado
  return <>{children}</>;
};
