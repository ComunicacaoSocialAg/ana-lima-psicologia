import React, { useState } from 'react';
import { 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  MessageSquare, 
  Plus, 
  Search,
  Filter,
  Download,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Payment, PaymentStatus } from '../../types';
import { WhatsAppModal } from '../common/WhatsAppModal';
import { generateReceiptPdf } from '../../services/pdfService';

export const FinancialView: React.FC = () => {
  const { payments, patients, settings, savePayment, isPrivacyMode } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [whatsAppPayment, setWhatsAppPayment] = useState<Payment | null>(null);

  // New Payment Modal State
  const [isNewPaymentOpen, setIsNewPaymentOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [amount, setAmount] = useState(200);
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'transfer' | 'cash' | 'card'>('pix');
  const [notes, setNotes] = useState('');

  const filteredPayments = payments
    .filter(p => {
      const matchesSearch = p.patientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  // Metrics
  const totalReceived = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalProjected = totalReceived + totalPending;

  const handleMarkAsPaid = (pay: Payment) => {
    const updated: Payment = {
      ...pay,
      status: 'paid',
      paidDate: new Date().toISOString().slice(0, 10),
      receiptNumber: pay.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
    };
    savePayment(updated);
  };

  const handleDownloadReceipt = (pay: Payment) => {
    const patient = patients.find(p => p.id === pay.patientId);
    if (!patient) return;

    generateReceiptPdf({
      patient,
      settings,
      amount: pay.amount,
      sessionDates: pay.sessionDate ? [pay.sessionDate] : [pay.dueDate],
      receiptNumber: pay.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
      paymentMethod: pay.paymentMethod,
    });
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return;

    const payload: Payment = {
      id: `pay-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      amount: Number(amount),
      dueDate,
      paidDate: paymentStatus === 'paid' ? dueDate : undefined,
      status: paymentStatus,
      paymentMethod,
      receiptNumber: paymentStatus === 'paid' ? `REC-${Date.now().toString().slice(-6)}` : undefined,
      notes,
      createdAt: new Date().toISOString(),
    };

    savePayment(payload);
    setIsNewPaymentOpen(false);
  };

  return (
    <div className={`p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto ${isPrivacyMode ? 'privacy-blur' : ''}`}>
      {/* Top Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Recebido */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Recebido</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">
            R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Honorários quitados</p>
        </div>

        {/* Pendente */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pendente / Em Aberto</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">
            R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Sessões aguardando pagamento</p>
        </div>

        {/* Projetado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Receita Prevista</span>
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            R$ {totalProjected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Projeção total do ciclo</p>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Todos os Pagamentos</option>
            <option value="pending">⏳ Pendentes</option>
            <option value="paid">✅ Pagos</option>
            <option value="waived">🤝 Isentos</option>
          </select>

          <button
            onClick={() => setIsNewPaymentOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Tabela de Pagamentos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800">
            Lançamentos de Honorários ({filteredPayments.length})
          </h3>
          <span className="text-xs text-slate-500">
            Chave PIX cadastrada: <strong className="text-slate-700">{settings.pixKey}</strong>
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Nenhum lançamento financeiro encontrado.
            </div>
          ) : (
            filteredPayments.map((pay) => {
              const patient = patients.find(p => p.id === pay.patientId);
              return (
                <div
                  key={pay.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-slate-900">{pay.patientName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        pay.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {pay.status === 'paid' ? '✓ PAGO' : '⏳ PENDENTE'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>Vencimento: {pay.dueDate}</span>
                      {pay.paidDate && <span>• Pago em: {pay.paidDate}</span>}
                      <span>• Método: {(pay.paymentMethod || 'PIX').toUpperCase()}</span>
                      {pay.receiptNumber && <span>• {pay.receiptNumber}</span>}
                    </div>

                    {pay.notes && (
                      <p className="text-xs text-slate-400 italic">{pay.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <span className="text-base font-bold text-slate-900">
                      R$ {pay.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>

                    {pay.status === 'pending' ? (
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
                          className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                        >
                          Marcar Pago
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDownloadReceipt(pay)}
                        title="Baixar Recibo em PDF para Reembolso/IRPF"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
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

      {/* Modal WhatsApp de Cobrança */}
      {whatsAppPayment && (
        <WhatsAppModal
          isOpen={Boolean(whatsAppPayment)}
          onClose={() => setWhatsAppPayment(null)}
          patientName={whatsAppPayment.patientName}
          patientPhone={patients.find(p => p.id === whatsAppPayment.patientId)?.phone || ''}
          amount={whatsAppPayment.amount}
          sessionDate={whatsAppPayment.sessionDate || whatsAppPayment.dueDate}
        />
      )}

      {/* Modal Novo Lançamento */}
      {isNewPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Registrar Novo Pagamento</h3>
            
            <form onSubmit={handleCreatePayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Paciente</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vencimento</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="pending">⏳ Pendente</option>
                    <option value="paid">✅ Pago</option>
                    <option value="waived">🤝 Isento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Método</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="pix">PIX</option>
                    <option value="transfer">Transferência</option>
                    <option value="cash">Dinheiro</option>
                    <option value="card">Cartão</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observações</label>
                <input
                  type="text"
                  placeholder="Ex: Mensalidade pacote 4 sessões..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs"
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
