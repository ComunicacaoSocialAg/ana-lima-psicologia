import { storageService } from "../../services/storageService";
import React, { useEffect, useState } from "react";
import { authService } from "../../services/authService";
import {
  unlockVault,
  hasVault,
  clearSessionVaultKey,
  flushVault,
} from "../../services/localVaultCrypto";
import { AuthModal } from "./AuthModal";
export const OWNER_UID = "psHLxoIeGfRNqQSwTbPUVxFCU8H2";
export function AccessGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "login" | "vault" | "open">(
    "loading",
  );
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const existing = hasVault();
  useEffect(
    () =>
      authService.subscribeToAuthState(async (user) => {
        setState("loading");
        try {
          await flushVault();
        } catch {
          setError(
            "Uma gravação local falhou. Preserve este navegador para recuperação.",
          );
        }
        storageService.clearInMemory();
        clearSessionVaultKey();
        setPass("");
        setConfirm("");
        if (user?.uid === OWNER_UID) setState("vault");
        else {
          setState("login");
          if (user) {
            setError("Esta conta não tem acesso ao consultório.");
            void authService.logout();
          }
        }
      }),
    [],
  );
  if (state === "open") return <>{children}</>;
  if (state === "loading")
    return <main className="p-8">Verificando acesso…</main>;
  if (state === "login")
    return (
      <main>
        <AuthModal isOpen onClose={() => {}} />
        <p role="alert">{error}</p>
      </main>
    );
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form
        className="bg-white border rounded-2xl p-8 max-w-md space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          if (!existing && pass !== confirm) {
            setError("As senhas não conferem.");
            return;
          }
          setBusy(true);
          try {
            await unlockVault(pass);
            setPass("");
            setConfirm("");
            setState("open");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1 className="text-xl font-bold">
          {existing
            ? "Desbloquear dados deste dispositivo"
            : "Proteger dados deste dispositivo"}
        </h1>
        <p>
          Use uma senha própria para o cofre. Ela não é enviada ao servidor.
          Guarde-a em um gerenciador de senhas: não há recuperação desta senha.
        </p>
        <label className="block">
          Senha do cofre
          <input
            className="border p-3 w-full"
            type="password"
            autoComplete={existing ? "current-password" : "new-password"}
            minLength={12}
            required
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
        </label>
        {!existing && (
          <label className="block">
            Repita a senha
            <input
              className="border p-3 w-full"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
        )}
        <p role="alert" className="text-rose-700">
          {error}
        </p>
        <button
          disabled={busy}
          className="bg-emerald-800 text-white p-3 rounded w-full"
        >
          {busy ? "Protegendo…" : "Continuar"}
        </button>
      </form>
    </main>
  );
}
