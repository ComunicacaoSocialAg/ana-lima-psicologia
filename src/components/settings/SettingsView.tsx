import { storageService } from "../../services/storageService";
import { getLegacyRecovery, listOutbox } from "../../services/localVaultCrypto";
import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { authService } from "../../services/authService";
import {
  validateOrDecryptBackup,
  exportEncryptedBackup,
} from "../../services/backupService";
export function SettingsView() {
  const { settings, updateSettings, triggerEncryptedBackup, lockApp } =
    useApp();
  const [form, setForm] = useState(settings);
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <p role="alert" className="text-rose-800">
        {error}
      </p>
      <p role="status">{message}</p>
      <form
        className="bg-white p-5 border rounded-xl space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          updateSettings(form);
          setMessage(
            "Configurações gravadas localmente. Aguarde a sincronização.",
          );
        }}
      >
        {(
          [
            "psychologistName",
            "crp",
            "cpf",
            "email",
            "phone",
            "address",
            "pixKey",
            "bankDetails",
            "defaultOnlineLink",
          ] as const
        ).map((k) => (
          <label className="block" key={k}>
            {
              {
                psychologistName: "Nome profissional",
                crp: "CRP",
                cpf: "CPF",
                email: "E-mail",
                phone: "Telefone",
                address: "Endereço",
                pixKey: "Chave Pix para pagamentos externos",
                bankDetails: "Dados bancários",
                defaultOnlineLink: "Link de atendimento",
              }[k]
            }
            <input
              className="block w-full border rounded p-2"
              value={form[k] || ""}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          </label>
        ))}
        <label className="block">
          Bloquear após minutos sem uso
          <input
            className="border rounded p-2 block"
            type="number"
            min="1"
            max="30"
            value={form.idleTimeoutMinutes}
            onChange={(e) =>
              setForm({
                ...form,
                idleTimeoutMinutes: Math.min(
                  30,
                  Math.max(1, Number(e.target.value)),
                ),
              })
            }
          />
        </label>
        <button className="bg-emerald-800 text-white p-2 rounded">
          Salvar configurações
        </button>
      </form>
      <section className="bg-white border rounded-xl p-5 space-y-3">
        <h2 className="text-xl font-semibold">Acesso e Google Agenda</h2>
        <button className="border rounded p-2" onClick={lockApp}>
          Bloquear agora
        </button>
        <button
          className="border rounded p-2 ml-2"
          onClick={async () => {
            try {
              await authService.reconnectGoogleCalendar();
              setMessage("Google Agenda autorizado nesta sessão.");
            } catch {
              setError("Não foi possível conectar a agenda.");
            }
          }}
        >
          Conectar Google Agenda
        </button>
        <p>
          O desbloqueio confirma a conta da titular. Tokens de agenda ficam
          apenas durante esta sessão do navegador.
        </p>
      </section>
      <section className="bg-white border rounded-xl p-5 space-y-3">
        <h2 className="text-xl font-semibold">Recuperação criptografada</h2>
        <p>
          O arquivo inclui dados locais, cópia anterior à migração e registros
          financeiros integrados. Use uma senha guardada em local seguro.
        </p>
        <label className="block">
          Senha do arquivo
          <input
            className="border rounded p-2 block"
            type="password"
            minLength={12}
            autoComplete="new-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
        </label>
        <button
          disabled={busy || pass.length < 12}
          className="border rounded p-2"
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await triggerEncryptedBackup(pass);
              setMessage(
                "Arquivo criptografado preparado para download. Confira se foi salvo.",
              );
              setPass("");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Exportar recuperação criptografada
        </button>
        <button
          disabled={busy || pass.length < 12}
          className="border rounded p-2"
          onClick={async () => {
            if (
              !window.confirm(
                "Esta cópia contém dados locais e pendências, mas não o financeiro completo do servidor. Continuar?",
              )
            )
              return;
            try {
              await exportEncryptedBackup(
                {
                  ...storageService.getFullBackupData(),
                  legacyRecovery: getLegacyRecovery(),
                  pendingOperations: listOutbox(),
                },
                pass,
              );
              setMessage(
                "Cópia local de contingência preparada. O financeiro do servidor requer exportação completa.",
              );
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Exportar cópia local de contingência
        </button>
        <label className="block">
          Verificar arquivo de recuperação
          <input
            type="file"
            accept=".json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setError("");
              try {
                if (file.size > 50 * 1024 * 1024)
                  throw Error("Arquivo acima do limite de 50 MB.");
                const value = await validateOrDecryptBackup(
                  await file.text(),
                  pass,
                );
                if (!value) throw Error("Formato inválido.");
                setMessage(
                  `Arquivo validado: ${value.data.patients.length} pacientes, ${value.data.sessions.length} sessões e ${value.data.clinicalRecords.length} registros. A restauração deve ocorrer primeiro em ambiente isolado.`,
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          />
        </label>
        <p>
          Verificar o arquivo não altera o banco. A recuperação completa usa o
          procedimento documentado e um ambiente isolado.
        </p>
      </section>
    </main>
  );
}
