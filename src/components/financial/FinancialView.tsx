import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  FileSpreadsheet,
  MessageSquare,
  Plus,
  Search,
  Filter,
  BarChart3,
  Receipt,
  CreditCard,
  Layers,
  Download,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { Payment, PaymentStatus, PaymentMethod } from "../../types";
import { WhatsAppModal } from "../common/WhatsAppModal";
import { PatientAutocomplete } from "../common/PatientAutocomplete";
import { generateReceiptPdf } from "../../services/pdfService";
import { formatDateBR } from "../../utils/dateUtils";
import { exportFinancialToCsv } from "../../services/exportService";
import { BillingPanel } from "./BillingPanel";
import {
  FinancialPeriod,
  createDefaultPeriod,
  filterPaymentsByPeriod,
  getPreviousPeriod,
  calculateFinancialMetrics,
  formatBRL,
} from "../../utils/financialAnalytics";
import { FinancialPeriodSelector } from "./FinancialPeriodSelector";
import { FinancialMetricsCards } from "./FinancialMetricsCards";
import { FinancialReportsView } from "./FinancialReportsView";
import { FinancialClosingView } from "./FinancialClosingView";

type FinancialTab = "entries" | "reports" | "closing" | "asaas";

export const FinancialView: React.FC = () => {
  const {
    payments: allPayments,
    patients,
    settings,
    savePayment,
    isPrivacyMode,
    currentUser,
  } = useApp();

  // Controle de abas principais
  const [activeTab, setActiveTab] = useState<FinancialTab>("entries");

  // Controle de Período Temporal (padrão: Mês Vigente)
  const [period, setPeriod] = useState<FinancialPeriod>(() => createDefaultPeriod());

  // Integração com Asaas / Firestore
  const [coverage, setCoverage] = useState<Set<string>>(new Set());
  const [integrated, setIntegrated] = useState<
    { amountCents: number; status: string; refundCents?: number }[]
  >([]);

  useEffect(() => {
    if (!db || !currentUser) return;
    const a = onSnapshot(
      collection(db, "users", currentUser.uid, "legacyCoverage"),
      (s) => setCoverage(new Set(s.docs.map((d) => d.id))),
    );
    const b = onSnapshot(
      collection(db, "users", currentUser.uid, "charges"),
      (s) =>
        setIntegrated(
          s.docs.map(
            (d) =>
              d.data() as {
                amountCents: number;
                status: string;
                refundCents?: number;
              },
          ),
        ),
    );
    return () => {
      a();
      b();
    };
  }, [currentUser]);

  // Pagamentos válidos (excluindo os cobertos por conciliação)
  const payments = useMemo(() => {
    return allPayments.filter((p) => !coverage.has(p.id));
  }, [allPayments, coverage]);

  // Pagamentos filtrados pelo período selecionado
  const periodPayments = useMemo(() => {
    return filterPaymentsByPeriod(payments, period);
  }, [payments, period]);

  // Pagamentos do período anterior (para cálculo de variação comparativa %)
  const prevPeriod = useMemo(() => {
    return getPreviousPeriod(period);
  }, [period]);

  const prevPeriodPayments = useMemo(() => {
    return filterPaymentsByPeriod(payments, prevPeriod);
  }, [payments, prevPeriod]);

  // Métricas dinâmicas do período
  const periodMetrics = useMemo(() => {
    return calculateFinancialMetrics(periodPayments, prevPeriodPayments);
  }, [periodPayments, prevPeriodPayments]);

  // Filtros internos da tabela de lançamentos
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all");
  const [methodFilter, setMethodFilter] = useState<"all" | PaymentMethod>("all");

  const [whatsAppPayment, setWhatsAppPayment] = useState<Payment | null>(null);

  // Modal Novo Lançamento State
  const [isNewPaymentOpen, setIsNewPaymentOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(
    patients[0]?.id || "",
  );
  const [amount, setAmount] = useState(200);
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [paymentMethod, setPaymentMethod] = useState<
    "pix" | "transfer" | "cash" | "card"
  >("pix");
  const [notes, setNotes] = useState("");

  // Lançamentos filtrados para exibição na tabela da aba 'entries'
  const displayPayments = useMemo(() => {
    return periodPayments
      .filter((p) => {
        const patientObj = patients.find((pat) => pat.id === p.patientId);
        const nameToSearch = (p.patientName || patientObj?.name || "Cadastro preservado").toLowerCase();
        const matchesSearch = nameToSearch.includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || p.status === statusFilter;
        const matchesMethod = methodFilter === "all" || p.paymentMethod === methodFilter;
        return matchesSearch && matchesStatus && matchesMethod;
      })
      .sort((a, b) => {
        const dateA = a.paidDate || a.dueDate || a.createdAt;
        const dateB = b.paidDate || b.dueDate || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  }, [periodPayments, patients, searchTerm, statusFilter, methodFilter]);

  const handleMarkAsPaid = (pay: Payment) => {
    const updated: Payment = {
      ...pay,
      status: "paid",
      paidDate: new Date().toISOString().slice(0, 10),
      receiptNumber:
        pay.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
    };
    savePayment(updated);
  };

  const handleDownloadReceipt = (pay: Payment) => {
    const patient = patients.find((p) => p.id === pay.patientId);
    if (!patient) return;

    generateReceiptPdf({
      patient,
      settings,
      amount: pay.amount,
      sessionDates: pay.sessionDate ? [pay.sessionDate] : [pay.dueDate],
      receiptNumber:
        pay.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
      paymentMethod: pay.paymentMethod,
    });
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p.id === selectedPatientId);
    if (!patient) return;

    const payload: Payment = {
      id: `pay-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      amount: Number(amount),
      dueDate,
      paidDate: paymentStatus === "paid" ? dueDate : undefined,
      status: paymentStatus,
      paymentMethod,
      receiptNumber:
        paymentStatus === "paid"
          ? `REC-${Date.now().toString().slice(-6)}`
          : undefined,
      notes,
      createdAt: new Date().toISOString(),
    };

    savePayment(payload);
    setIsNewPaymentOpen(false);
  };

  const privacyClass = isPrivacyMode ? "privacy-blur select-none" : "";

  return (
    <div
      className={`p-4 sm:p-6 space-y-6 max-w-7xl mx-auto ${
        isPrivacyMode ? "privacy-mode-active" : ""
      }`}
    >
      {/* 1. Barra de Navegação em Abas do Financeiro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Gestão Financeira & Honorários
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Fluxo de caixa da clínica, controle por competência, relatórios analíticos e Carnê-Leão.
          </p>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("entries")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "entries"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-4 h-4 text-teal-600" />
            <span>Lançamentos</span>
            <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-700">
              {displayPayments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "reports"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-teal-600" />
            <span>Relatórios & Comparativo</span>
          </button>

          <button
            onClick={() => setActiveTab("closing")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "closing"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Receipt className="w-4 h-4 text-teal-600" />
            <span>Fechamento Fiscal</span>
          </button>

          <button
            onClick={() => setActiveTab("asaas")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "asaas"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CreditCard className="w-4 h-4 text-teal-600" />
            <span>Cobranças Asaas</span>
          </button>
        </div>
      </div>

      {/* 2. Seletor de Período Temporal & Cards de KPIs (Exibidos nas abas de gestão) */}
      {activeTab !== "asaas" && (
        <>
          <FinancialPeriodSelector
            period={period}
            onPeriodChange={setPeriod}
          />

          <FinancialMetricsCards
            metrics={periodMetrics}
            periodLabel={period.label}
            isPrivacyMode={isPrivacyMode}
          />
        </>
      )}

      {/* 3. Conteúdo da Aba 1: Lançamentos & Fluxo Operacional */}
      {activeTab === "entries" && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar por paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="all">Status: Todos</option>
                <option value="pending">⏳ Pendentes</option>
                <option value="paid">✅ Pagos</option>
                <option value="waived">🤝 Isentos</option>
              </select>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value as any)}
                className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="all">Forma: Todas</option>
                <option value="pix">PIX</option>
                <option value="transfer">Transferência</option>
                <option value="cash">Dinheiro</option>
                <option value="card">Cartão</option>
              </select>

              <button
                onClick={() =>
                  exportFinancialToCsv(displayPayments, patients, {
                    periodLabel: period.label,
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-2xs transition-colors shrink-0"
                title="Baixar lançamentos em planilha CSV compatível com Excel"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Baixar CSV</span>
              </button>

              <button
                onClick={() => setIsNewPaymentOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Lançamento</span>
              </button>
            </div>
          </div>

          {/* Tabela de Lançamentos de Honorários */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  Lançamentos no Período ({displayPayments.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Período: <strong className="text-slate-700">{period.label}</strong>
                </span>
              </div>

              <span className="text-xs text-slate-500">
                Chave PIX da clínica:{" "}
                <strong className="text-slate-700 font-mono">{settings.pixKey || "Não configurada"}</strong>
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {displayPayments.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs space-y-1">
                  <p className="font-semibold text-slate-700">Nenhum lançamento encontrado para este período.</p>
                  <p className="text-slate-400">
                    Use o seletor acima para navegar entre os meses ou registre um novo pagamento.
                  </p>
                </div>
              ) : (
                displayPayments.map((pay) => {
                  const patient = patients.find((p) => p.id === pay.patientId);
                  return (
                    <div
                      key={pay.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className={`font-bold text-sm text-slate-900 ${privacyClass}`}>
                            {pay.patientName || patient?.name || "Paciente"}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              pay.status === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : pay.status === "pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {pay.status === "paid"
                              ? "✓ PAGO"
                              : pay.status === "pending"
                                ? "⏳ PENDENTE"
                                : "🤝 ISENTO"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>Vencimento: {formatDateBR(pay.dueDate)}</span>
                          {pay.paidDate && (
                            <span>• Quitado em: {formatDateBR(pay.paidDate)}</span>
                          )}
                          <span>
                            • Método: {(pay.paymentMethod || "PIX").toUpperCase()}
                          </span>
                          {pay.receiptNumber && (
                            <span className="font-mono text-teal-700 font-medium">
                              • {pay.receiptNumber}
                            </span>
                          )}
                        </div>

                        {pay.notes && (
                          <p className="text-xs text-slate-400 italic">
                            {pay.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <span className={`text-base font-bold text-slate-900 ${privacyClass}`}>
                          {formatBRL(pay.amount)}
                        </span>

                        {pay.status === "pending" ? (
                          <div className="flex items-center gap-2">
                            {patient && (
                              <button
                                onClick={() => setWhatsAppPayment(pay)}
                                title="Enviar lembrete amigável com chave PIX por WhatsApp"
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Cobrar PIX</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleMarkAsPaid(pay)}
                              className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                            >
                              Marcar Pago
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDownloadReceipt(pay)}
                            title="Baixar comprovante fiscal em PDF (IRPF)"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                            <span>Recibo PDF</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Conteúdo da Aba 2: Relatórios & Comparativo Analítico */}
      {activeTab === "reports" && (
        <FinancialReportsView
          allPayments={payments}
          periodPayments={periodPayments}
          period={period}
          isPrivacyMode={isPrivacyMode}
        />
      )}

      {/* 5. Conteúdo da Aba 3: Fechamento Fiscal & Carnê-Leão */}
      {activeTab === "closing" && (
        <FinancialClosingView
          payments={periodPayments}
          patients={patients}
          settings={settings}
          period={period}
          metrics={periodMetrics}
          isPrivacyMode={isPrivacyMode}
        />
      )}

      {/* 6. Conteúdo da Aba 4: Cobranças Integradas Asaas */}
      {activeTab === "asaas" && (
        <div className="space-y-4">
          <BillingPanel />
        </div>
      )}

      {/* Modal WhatsApp de Cobrança */}
      {whatsAppPayment && (
        <WhatsAppModal
          isOpen={Boolean(whatsAppPayment)}
          onClose={() => setWhatsAppPayment(null)}
          patientName={whatsAppPayment.patientName}
          patientPhone={
            patients.find((p) => p.id === whatsAppPayment.patientId)?.phone ||
            ""
          }
          amount={whatsAppPayment.amount}
          sessionDate={whatsAppPayment.sessionDate || whatsAppPayment.dueDate}
        />
      )}

      {/* Modal Novo Lançamento */}
      {isNewPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Registrar Novo Pagamento
            </h3>

            <form onSubmit={handleCreatePayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Paciente *
                </label>
                <PatientAutocomplete
                  selectedPatientId={selectedPatientId}
                  onSelectPatient={(p) => {
                    setSelectedPatientId(p.id);
                    if (p.agreedPrice) setAmount(p.agreedPrice);
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vencimento
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) =>
                      setPaymentStatus(e.target.value as PaymentStatus)
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="pending">⏳ Pendente</option>
                    <option value="paid">✅ Pago</option>
                    <option value="waived">🤝 Isento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Método
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="pix">PIX</option>
                    <option value="transfer">Transferência</option>
                    <option value="cash">Dinheiro</option>
                    <option value="card">Cartão</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  placeholder="Ex: Honorários 4 sessões mensais..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPaymentOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
