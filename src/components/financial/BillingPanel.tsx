import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { callBackend } from "../../services/backend";
import { useApp } from "../../context/AppContext";
import {
  QrCode,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  X,
} from "lucide-react";
const money = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v / 100,
  );
const labels: Record<string, string> = {
  per_session: "Após a sessão",
  monthly: "Fechamento mensal",
  plan: "Plano mensal — quatro sessões",
  social: "Atendimento social",
  reserved: "Reservada",
  issuing: "Emissão em andamento",
  review: "Revisão necessária",
  pending: "Aguardando pagamento",
  overdue: "Vencida",
  confirmed: "Pagamento confirmado; saldo a liberar",
  received: "Recebido",
  refunded: "Estornada",
  refund_pending: "Estorno solicitado",
  canceled: "Cancelada",
  partially_refunded: "Estornada parcialmente",
  disputed: "Contestada",
};
interface Charge {
  id: string;
  patientId: string;
  patientName: string;
  mode: string;
  month: string;
  amountCents: number;
  dueDate: string;
  status: string;
  invoiceUrl?: string;
  providerId?: string;
  environment: string;
  legacyPaymentIds?: string[];
  sessionIds?: string[];
  previewHash?: string;
  paidAt?: string;
  availableAt?: string;
  netCents?: number;
  refundCents?: number;
  needsReview?: boolean;
  reissuedAs?: string;
  pixPayload?: string;
  pixEncodedImage?: string;
  pixExpirationDate?: string;
}
interface BillingPolicy {
  mode: string;
  priceCents: number | null;
  dueDay: number;
  effectiveFrom: string;
  billingType: string;
  payer: string;
  automatic: boolean;
}
interface Preview {
  drafts: Charge[];
  review: string[];
}
export function BillingPanel() {
  const { patients, sessions, currentUser } = useApp();
  const [patientId, setPatientId] = useState("");
  const [policies, setPolicies] = useState<Record<string, BillingPolicy>>({});
  const [charges, setCharges] = useState<Charge[]>([]);
  const [mode, setMode] = useState("per_session");
  const [price, setPrice] = useState("");
  const [day, setDay] = useState("5");
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("PIX");
  const [payer, setPayer] = useState("patient");
  const [automatic, setAutomatic] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [socialIds, setSocialIds] = useState<string[]>([]);
  const [socialAmount, setSocialAmount] = useState("");
  const [socialDue, setSocialDue] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [operation, setOperation] = useState(() => crypto.randomUUID());
  const [activePixCharge, setActivePixCharge] = useState<Charge | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  useEffect(() => {
    if (!db || !currentUser) return;
    const base = ["users", currentUser.uid];
    const clean = [
      onSnapshot(
        collection(db, ...(base as [string, string]), "billingPolicies"),
        (s) =>
          setPolicies(
            Object.fromEntries(
              s.docs.map((d) => [d.id, d.data() as BillingPolicy]),
            ),
          ),
        () => setError("Não foi possível carregar as modalidades."),
      ),
      onSnapshot(
        collection(db, ...(base as [string, string]), "charges"),
        (s) =>
          setCharges(s.docs.map((d) => ({ ...d.data(), id: d.id }) as Charge)),
        () => setError("Não foi possível carregar as cobranças."),
      ),
    ];
    return () => clean.forEach((f) => f());
  }, [currentUser]);
  useEffect(() => {
    const p = policies[patientId];
    setMode(p?.mode || "per_session");
    setPrice(p?.priceCents ? String(p.priceCents / 100) : "");
    setDay(String(p?.dueDay || 5));
    setFrom(p?.effectiveFrom || new Date().toISOString().slice(0, 10));
    setMethod(p?.billingType || "PIX");
    setPayer(
      p?.payer ||
        (patients.find((p) => p.id === patientId)?.isMinor
          ? "guardian"
          : "patient"),
    );
    setAutomatic(p?.automatic || false);
    setPreview(null);
    setSocialIds([]);
    setOperation(crypto.randomUUID());
  }, [patientId, policies]);
  const task = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
      setError(
        (e as Error).message ||
          "Não foi possível concluir. Confira a sincronização e tente conciliar.",
      );
    } finally {
      setBusy(false);
    }
  };
  const openPixModal = async (c: Charge) => {
    setActivePixCharge(c);
    setPixCopied(false);
    if (!c.pixPayload && c.providerId) {
      setPixLoading(true);
      try {
        const qr = await callBackend<{
          encodedImage: string;
          payload: string;
          expirationDate?: string;
        }>("getPixQrCode", { chargeId: c.id });
        setActivePixCharge((prev) =>
          prev && prev.id === c.id
            ? {
                ...prev,
                pixEncodedImage: qr.encodedImage,
                pixPayload: qr.payload,
                pixExpirationDate: qr.expirationDate,
              }
            : prev,
        );
      } catch (err) {
        setError((err as Error).message || "Não foi possível carregar o Pix.");
      } finally {
        setPixLoading(false);
      }
    }
  };
  const confirmedTotal = charges
    .filter((c) =>
      ["confirmed", "received", "partially_refunded"].includes(c.status),
    )
    .reduce((sum, c) => sum + c.amountCents - (c.refundCents || 0), 0);
  const availableTotal = charges
    .filter(
      (c) =>
        ["received", "partially_refunded"].includes(c.status) &&
        c.netCents != null,
    )
    .reduce((sum, c) => sum + (c.netCents ?? 0) - (c.refundCents || 0), 0);
  const selected = charges
    .filter((c) => c.patientId === patientId)
    .sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""));
  const patient = patients.find((p) => p.id === patientId);
  const action = (name: string, c: Charge) =>
    void task(async () => {
      if (
        name === "cancelBilling" &&
        !window.confirm(
          "Cancelar a cobrança no Asaas? O histórico será preservado.",
        )
      )
        return;
      if (
        name === "refundBilling" &&
        !window.confirm(
          `Solicitar estorno integral de ${money(c.amountCents)}? Confirme também sua conta Google se necessário.`,
        )
      )
        return;
      await callBackend(name, { chargeId: c.id });
      setMessage("Operação registrada. Aguarde a conciliação do Asaas.");
    });
  return (
    <section className="bg-white border rounded-2xl p-5 space-y-4">
      <header>
        <h2 className="text-xl font-bold">Cobranças Asaas</h2>
        <p className="text-sm text-slate-600">
          A prévia usa sessões realizadas e faltas cobráveis. Confira valor,
          pagador e ambiente antes de emitir.
        </p>
      </header>
      <div className="grid sm:grid-cols-2 gap-3">
        <p>
          Confirmados: <strong>{money(confirmedTotal)}</strong>
        </p>
        <p>
          Líquido de recebimentos informado pelo Asaas:{" "}
          <strong>{money(availableTotal)}</strong>
          {charges.some(
            (c) =>
              ["received", "partially_refunded"].includes(c.status) &&
              c.netCents == null,
          ) && (
            <small className="block">
              Há recebimentos sem valor líquido informado; esses valores não
              estão neste total.
            </small>
          )}
        </p>
      </div>
      <p role="alert" className="text-rose-800">
        {error}
      </p>
      <p role="status" className="text-emerald-800">
        {message}
      </p>
      <label className="block">
        Paciente
        <select
          className="border rounded p-2 w-full"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        >
          <option value="">Selecione</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {patient && (
        <>
          <form
            className="grid sm:grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void task(async () => {
                await callBackend("saveBillingPolicy", {
                  patientId,
                  policy: {
                    mode,
                    priceCents:
                      mode === "social"
                        ? null
                        : Math.round(Number(price) * 100),
                    effectiveFrom: from,
                    dueDay: Number(day),
                    billingType: method,
                    payer,
                    automatic,
                  },
                });
                setMessage(
                  "Modalidade salva. O histórico anterior foi preservado.",
                );
                setPreview(null);
              });
            }}
          >
            <label>
              Modalidade
              <select
                className="border rounded p-2 block w-full"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value);
                  setAutomatic(false);
                  setPreview(null);
                }}
              >
                {["per_session", "monthly", "plan", "social"].map((m) => (
                  <option key={m} value={m}>
                    {labels[m]}
                  </option>
                ))}
              </select>
            </label>
            {mode !== "social" && (
              <label>
                Valor {mode === "plan" ? "mensal do plano" : "por sessão"} (R$)
                <input
                  className="border rounded p-2 block w-full"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
            )}
            <label>
              Vigência a partir de
              <input
                className="border rounded p-2 block w-full"
                type="date"
                required
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Dia de vencimento mensal
              <input
                className="border rounded p-2 block w-full"
                type="number"
                min="1"
                max="28"
                required
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </label>
            <label>
              Forma de Pagamento
              <div className="border rounded p-2 bg-slate-50 text-slate-800 text-sm flex items-center justify-between">
                <span className="font-semibold text-emerald-800">Pix (Asaas)</span>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  Exclusivo
                </span>
              </div>
            </label>
            <label>
              Pagador
              <select
                className="border rounded p-2 block w-full"
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
              >
                <option value="patient" disabled={!!patient.isMinor}>
                  Paciente
                </option>
                <option value="guardian">Responsável legal</option>
              </select>
            </label>
            <label className="sm:col-span-2">
              <input
                type="checkbox"
                disabled={mode === "social"}
                checked={automatic}
                onChange={(e) => setAutomatic(e.target.checked)}
              />{" "}
              Emitir automaticamente conforme esta modalidade após a vigência.
              Os meios de pagamento têm taxas; notificações pagas ficam
              desativadas.
            </label>
            <p className="text-sm sm:col-span-2">
              Planos cobrem quatro sessões no mês. Sessões extras e atendimento
              social exigem revisão. Férias, créditos e exceções não geram
              ajustes automáticos.
            </p>
            <button
              className="bg-emerald-800 text-white p-2 rounded"
              disabled={busy}
            >
              Salvar modalidade
            </button>
          </form>
          <div className="border-t pt-4 flex flex-wrap gap-3 items-end">
            <label>
              Competência
              <input
                className="border rounded p-2 block"
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setPreview(null);
                }}
              />
            </label>
            <button
              disabled={busy || !policies[patientId]}
              className="border rounded p-2"
              onClick={() =>
                void task(async () =>
                  setPreview(
                    await callBackend<Preview>("previewBilling", {
                      patientId,
                      month,
                    }),
                  ),
                )
              }
            >
              Calcular prévia
            </button>
          </div>
          {preview && (
            <div className="space-y-3">
              {preview.review.map((text) => (
                <p key={text} className="bg-amber-50 p-3">
                  {text}
                </p>
              ))}
              {preview.drafts.length === 0 && (
                <p>Sem novas cobranças automáticas para esta competência.</p>
              )}
              {preview.drafts.map((d) => (
                <article
                  key={d.id}
                  className="border rounded p-3 flex flex-wrap gap-4 items-center"
                >
                  <div>
                    <strong>{money(d.amountCents)}</strong>
                    <p>
                      {d.sessionIds?.length || 0} sessões · vence {d.dueDate}
                    </p>
                    <p className="text-xs">
                      {d.sessionIds
                        ?.map(
                          (id) => sessions.find((s) => s.id === id)?.date || id,
                        )
                        .join(", ")}
                    </p>
                  </div>
                  <button
                    disabled={busy}
                    className="bg-emerald-800 text-white rounded p-2"
                    onClick={() =>
                      void task(async () => {
                        if (
                          !window.confirm(
                            `Emitir ${money(d.amountCents)} para ${patient.name}, vencendo ${d.dueDate}?`,
                          )
                        )
                          return;
                        const c = await callBackend<Charge>("issueBilling", {
                          patientId,
                          month,
                          previewHash: d.previewHash,
                        });
                        setMessage(
                          `Cobrança no ambiente ${c.environment}: ${labels[c.status] || c.status}.`,
                        );
                        setPreview(null);
                      })
                    }
                  >
                    Confirmar emissão
                  </button>
                </article>
              ))}
            </div>
          )}
          {policies[patientId]?.mode === "social" && (
            <form
              className="border rounded p-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void task(async () => {
                  if (
                    !window.confirm(
                      "Confirma o valor social e as sessões selecionadas?",
                    )
                  )
                    return;
                  await callBackend("socialBilling", {
                    patientId,
                    sessionIds: socialIds,
                    amountCents: Math.round(Number(socialAmount) * 100),
                    dueDate: socialDue,
                    operationId: operation,
                  });
                  setOperation(crypto.randomUUID());
                  setSocialIds([]);
                  setMessage("Cobrança social registrada.");
                });
              }}
            >
              <h3 className="font-semibold">Definir cobrança social</h3>
              <p>
                Sem regra automática: selecione as sessões, valor e vencimento
                acordados.
              </p>
              {sessions
                .filter(
                  (s) =>
                    s.patientId === patientId &&
                    s.date.startsWith(month) &&
                    ["completed", "missed_chargeable"].includes(s.status),
                )
                .map((s) => (
                  <label className="block" key={s.id}>
                    <input
                      type="checkbox"
                      checked={socialIds.includes(s.id)}
                      onChange={(e) =>
                        setSocialIds((ids) =>
                          e.target.checked
                            ? [...ids, s.id]
                            : ids.filter((id) => id !== s.id),
                        )
                      }
                    />{" "}
                    {s.date} — {s.startTime}
                  </label>
                ))}
              <label>
                Valor acordado (R$)
                <input
                  className="border rounded p-2 block"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={socialAmount}
                  onChange={(e) => setSocialAmount(e.target.value)}
                />
              </label>
              <label>
                Vencimento
                <input
                  className="border rounded p-2 block"
                  type="date"
                  required
                  value={socialDue}
                  onChange={(e) => setSocialDue(e.target.value)}
                />
              </label>
              <button
                className="bg-emerald-800 text-white rounded p-2"
                disabled={busy || !socialIds.length}
              >
                Confirmar cobrança social
              </button>
            </form>
          )}
          <h3 className="font-semibold">Histórico de cobranças</h3>
          <div className="space-y-3">
            {selected.length === 0 && (
              <p>Nenhuma cobrança integrada para este paciente.</p>
            )}
            {selected.map((c) => (
              <article key={c.id} className="border rounded p-3 space-y-2">
                <div className="flex justify-between">
                  <strong>{money(c.amountCents)}</strong>
                  <span>
                    {c.environment === "sandbox"
                      ? "Sandbox — simulação"
                      : "Produção"}
                  </span>
                </div>
                <p>
                  {labels[c.status] || c.status} · {c.dueDate}
                </p>
                {c.netCents != null && (
                  <p className="text-xs text-slate-500">
                    Taxa Asaas: <strong>{money(c.amountCents - c.netCents)}</strong> · Líquido: <strong>{money(c.netCents)}</strong>
                  </p>
                )}
                {c.needsReview && (
                  <p className="text-amber-900">
                    Revise a cobertura, os valores ou as exceções desta
                    cobrança.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {c.status !== "canceled" && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold hover:bg-emerald-100"
                      disabled={busy}
                      onClick={() => void openPixModal(c)}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Ver Pix (QR Code / Copia e Cola)
                    </button>
                  )}
                  <button
                    className="underline text-xs"
                    disabled={busy}
                    onClick={() => action("reconcileBilling", c)}
                  >
                    Conciliar
                  </button>
                  {c.status === "review" && (
                    <button
                      className="underline"
                      disabled={busy}
                      onClick={() => action("retryBilling", c)}
                    >
                      Tentar novamente após conciliar
                    </button>
                  )}
                  {c.status === "canceled" && !c.reissuedAs && (
                    <button
                      className="underline"
                      disabled={busy}
                      onClick={() =>
                        void task(async () => {
                          const dueDate = window.prompt(
                            "Novo vencimento (AAAA-MM-DD):",
                          );
                          if (!dueDate) return;
                          await callBackend("reissueBilling", {
                            chargeId: c.id,
                            dueDate,
                            operationId: "reissue-" + c.id,
                          });
                          setMessage(
                            "Reemissão registrada; cobertura transferida sem duplicar o histórico.",
                          );
                        })
                      }
                    >
                      Reemitir
                    </button>
                  )}
                  {c.invoiceUrl && (
                    <>
                      <a
                        className="underline"
                        href={c.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Abrir cobrança
                      </a>
                      <a
                        className="underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`https://wa.me/${(patient.isMinor ? patient.guardianPhone || patient.phone : patient.phone).replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Segue o link de pagamento combinado: " + c.invoiceUrl)}`}
                      >
                        Preparar WhatsApp
                      </a>
                    </>
                  )}
                  {["pending", "overdue"].includes(c.status) && (
                    <button
                      className="underline"
                      disabled={busy}
                      onClick={() => action("cancelBilling", c)}
                    >
                      Cancelar
                    </button>
                  )}
                  {["received", "confirmed"].includes(c.status) && (
                    <button
                      className="underline"
                      disabled={busy}
                      onClick={() => action("refundBilling", c)}
                    >
                      Solicitar estorno
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {activePixCharge && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-700" />
                  Cobrança Pix — Asaas
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Paciente: <strong>{activePixCharge.patientName}</strong>
                </p>
              </div>
              <button
                onClick={() => setActivePixCharge(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-600">Valor da cobrança:</span>
                <p className="text-base font-bold text-emerald-900">
                  {money(activePixCharge.amountCents)}
                </p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-full font-bold">
                {labels[activePixCharge.status] || activePixCharge.status}
              </span>
            </div>

            {pixLoading ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-700" />
                <p className="text-xs font-semibold">Obtendo dados Pix no Asaas...</p>
              </div>
            ) : (
              <>
                {activePixCharge.pixEncodedImage && (
                  <div className="text-center space-y-1">
                    <img
                      src={`data:image/png;base64,${activePixCharge.pixEncodedImage}`}
                      alt="QR Code Pix"
                      className="w-48 h-48 mx-auto border p-2 rounded-xl bg-white shadow-xs"
                    />
                    <p className="text-[11px] text-slate-500">
                      Aponte o app do banco para escanear o QR Code
                    </p>
                  </div>
                )}

                {activePixCharge.pixPayload && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Código Pix Copia e Cola:
                    </label>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={activePixCharge.pixPayload}
                        className="w-full text-xs font-mono bg-slate-50 border rounded p-2 text-slate-700 select-all"
                      />
                      <button
                        onClick={() => {
                          if (activePixCharge.pixPayload) {
                            navigator.clipboard.writeText(activePixCharge.pixPayload);
                            setPixCopied(true);
                            setTimeout(() => setPixCopied(false), 2500);
                          }
                        }}
                        className="px-3 py-2 bg-emerald-800 text-white rounded text-xs font-semibold shrink-0 hover:bg-emerald-700 flex items-center gap-1"
                      >
                        {pixCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-slate-50 border rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Vencimento da cobrança:</span>
                    <strong>{activePixCharge.dueDate}</strong>
                  </div>
                  {activePixCharge.pixExpirationDate && (
                    <div className="flex justify-between text-slate-500">
                      <span>Validade do QR Code:</span>
                      <span>{activePixCharge.pixExpirationDate}</span>
                    </div>
                  )}
                  {activePixCharge.netCents != null && (
                    <>
                      <div className="flex justify-between text-slate-500 border-t pt-1">
                        <span>Taxa do Asaas:</span>
                        <span>{money(activePixCharge.amountCents - activePixCharge.netCents)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-800 font-semibold">
                        <span>Líquido a receber:</span>
                        <span>{money(activePixCharge.netCents)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  {patient && (
                    <a
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://wa.me/${(patient.isMinor ? patient.guardianPhone || patient.phone : patient.phone).replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Olá, ${patient.name}! Segue a cobrança Pix referente aos atendimentos no valor de ${money(activePixCharge.amountCents)}.\n\n*Código Pix Copia e Cola:*\n${activePixCharge.pixPayload || "Acesse o link abaixo:"}\n\n*Link da Fatura Digital:*\n${activePixCharge.invoiceUrl || ""}\n\nQualquer dúvida estou à disposição! Ana Lima.`
                      )}`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Enviar Pix por WhatsApp
                    </a>
                  )}

                  <div className="flex justify-between gap-2">
                    <button
                      className="px-3 py-1.5 border rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                      disabled={busy}
                      onClick={() => {
                        void action("reconcileBilling", activePixCharge);
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Conciliar / Atualizar
                    </button>
                    {activePixCharge.invoiceUrl && (
                      <a
                        className="px-3 py-1.5 border rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                        href={activePixCharge.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir Fatura
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
