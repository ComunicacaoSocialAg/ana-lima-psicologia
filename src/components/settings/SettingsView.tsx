import { storageService } from "../../services/storageService";
import { getLegacyRecovery, listOutbox } from "../../services/localVaultCrypto";
import React, { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { authService } from "../../services/authService";
import {
  validateOrDecryptBackup,
  exportEncryptedBackup,
} from "../../services/backupService";
import {
  exportAllDataToXlsx,
  exportPatientsToCsv,
  exportFinancialToCsv,
} from "../../services/exportService";

export function SettingsView() {
  const {
    settings,
    updateSettings,
    triggerEncryptedBackup,
    lockApp,
    patients,
    sessions,
    records,
    assessments,
    payments,
  } = useApp();
  const [form, setForm] = useState(settings);
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [includeRecordsInExcel, setIncludeRecordsInExcel] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
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

      {/* Exportação de Dados em Planilhas (Excel e CSV) */}
      <section className="bg-white border rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            <span>Exportação de Dados (Planilhas Excel & CSV)</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Exporte os dados da clínica em planilhas estruturadas para o Microsoft Excel e LibreOffice.
            O processamento ocorre 100% no seu navegador com proteção contra injeção de fórmulas e compatibilidade direta com acentuação brasileira.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-sm text-slate-800 block">
                Pasta de Trabalho Completa (.xlsx)
              </span>
              <span className="text-xs text-slate-500">
                Arquivo com abas separadas: Pacientes ({patients.length}), Sessões ({sessions.length}), Financeiro ({payments.length}) e Escalas ({assessments.length}).
              </span>
            </div>

            <button
              disabled={exportingXlsx}
              onClick={async () => {
                setExportingXlsx(true);
                setError("");
                setMessage("");
                try {
                  await exportAllDataToXlsx({
                    patients,
                    sessions,
                    payments,
                    assessments,
                    records,
                    includeClinicalRecords: includeRecordsInExcel,
                  });
                  setMessage("Planilha Excel (.xlsx) gerada e baixada com sucesso!");
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setExportingXlsx(false);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors shrink-0 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{exportingXlsx ? "Gerando planilha..." : "Baixar Tudo em Excel (.xlsx)"}</span>
            </button>
          </div>

          <label className="flex items-start gap-2.5 pt-2 border-t border-slate-200 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeRecordsInExcel}
              onChange={(e) => setIncludeRecordsInExcel(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <div>
              <span className="font-medium text-slate-800">
                Incluir aba com histórico de Prontuários & Evoluções Clínicas ({records.length} registros)
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ⚠️ <strong>Atenção Ética (CFP 001/2009 e LGPD):</strong> Os prontuários contêm anotações íntimas de saúde mental.
                Ao exportar em arquivo Excel aberto, guarde o arquivo em computador protegido por senha ou biometria.
              </p>
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              exportPatientsToCsv(patients);
              setMessage("Arquivo CSV de pacientes gerado com sucesso.");
            }}
            className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Baixar Pacientes em CSV ({patients.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              exportFinancialToCsv(payments, patients);
              setMessage("Arquivo CSV financeiro gerado com sucesso.");
            }}
            className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Baixar Financeiro em CSV ({payments.length})</span>
          </button>
        </div>
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
