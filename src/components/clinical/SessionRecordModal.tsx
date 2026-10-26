import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  History,
  FileText,
  Lock,
  AlertCircle,
  ShieldCheck,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { ClinicalRecord, Modality, Payment, PaymentStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatDateBR } from '../../services/pdfService';
import { storageService } from '../../services/storageService';

interface SessionRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  sessionId?: string;
  sessionDate?: string;
  modality?: Modality;
  existingRecord?: ClinicalRecord | null;
}

export const SessionRecordModal: React.FC<SessionRecordModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  sessionId,
  sessionDate,
  modality = 'presencial',
  existingRecord,
}) => {
  const {
    saveClinicalRecord,
    savePayment,
    patients,
    payments,
    sessions,
    saveSession
  } = useApp();

  const patient = patients.find(p => p.id === patientId);

  // Data e Modalidade da Sessão (editável para permitir lançamentos retroativos)
  const [recordDate, setRecordDate] = useState<string>(
    existingRecord?.sessionDate || sessionDate || new Date().toISOString().slice(0, 10)
  );
  const [recordModality, setRecordModality] = useState<Modality>(
    existingRecord?.modality || modality || 'presencial'
  );

  // Campos Clínicos
  const [themes, setThemes] = useState('');
  const [interventions, setInterventions] = useState('');
  const [emotionalState, setEmotionalState] = useState('');
  const [evolution, setEvolution] = useState('');
  const [homework, setHomework] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Auto-save contínuo de conteúdo e recuperação de rascunhos
  const draftKey = `ana_lima_draft_record_${patientId}_${existingRecord?.id || sessionId || 'new'}`;
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const [hasRecoveredDraft, setHasRecoveredDraft] = useState(false);

  // Integração com o Financeiro
  const existingPayment = payments.find(
    p =>
      (sessionId && p.sessionId === sessionId) ||
      (existingRecord && (p.sessionId === existingRecord.sessionId || p.id === `pay-rec-${existingRecord.id}`))
  );

  const [syncWithFinancial, setSyncWithFinancial] = useState<boolean>(!existingRecord && !existingPayment);
  const [financialAmount, setFinancialAmount] = useState<number>(
    existingPayment?.amount || patient?.agreedPrice || 200
  );
  const [financialStatus, setFinancialStatus] = useState<PaymentStatus>(
    existingPayment?.status || 'pending'
  );
  const [financialMethod, setFinancialMethod] = useState<'pix' | 'cash' | 'transfer' | 'card'>(
    (existingPayment?.paymentMethod as any) || 'pix'
  );

  useEffect(() => {
    if (existingRecord) {
      setRecordDate(existingRecord.sessionDate);
      setRecordModality(existingRecord.modality);
      setThemes(existingRecord.themes || '');
      setInterventions(existingRecord.interventions || '');
      setEmotionalState(existingRecord.emotionalState || '');
      setEvolution(existingRecord.evolution || '');
      setHomework(existingRecord.homework || '');
      setPrivateNotes(existingRecord.privateNotes || '');
      setEditReason('');

      if (existingPayment) {
        setSyncWithFinancial(true);
        setFinancialAmount(existingPayment.amount);
        setFinancialStatus(existingPayment.status);
        if (existingPayment.paymentMethod) {
          setFinancialMethod(existingPayment.paymentMethod as any);
        }
      } else {
        setSyncWithFinancial(false);
      }
    } else {
      const initialDate = sessionDate || new Date().toISOString().slice(0, 10);
      setRecordDate(initialDate);
      setRecordModality(modality || patient?.preferredModality || 'presencial');
      setThemes('');
      setInterventions('');
      setEmotionalState('');
      setEvolution('');
      setHomework('');
      setPrivateNotes('');
      setEditReason('');

      // Para novas evoluções, se não houver pagamento pré-existente, ativa o financeiro por padrão
      const foundPay = payments.find(p => sessionId && p.sessionId === sessionId);
      if (foundPay) {
        setSyncWithFinancial(true);
        setFinancialAmount(foundPay.amount);
        setFinancialStatus(foundPay.status);
      } else {
        setSyncWithFinancial(true);
        setFinancialAmount(patient?.agreedPrice || 200);
        setFinancialStatus('pending');
      }

      // Restaura rascunho anterior de nova evolução se existir
      try {
        const rawDraft = localStorage.getItem(draftKey);
        if (rawDraft) {
          const draft = JSON.parse(rawDraft);
          if (
            draft &&
            (draft.evolution?.trim() ||
              draft.themes?.trim() ||
              draft.interventions?.trim() ||
              draft.emotionalState?.trim() ||
              draft.homework?.trim() ||
              draft.privateNotes?.trim())
          ) {
            if (draft.recordDate) setRecordDate(draft.recordDate);
            if (draft.recordModality) setRecordModality(draft.recordModality);
            if (draft.themes) setThemes(draft.themes);
            if (draft.interventions) setInterventions(draft.interventions);
            if (draft.emotionalState) setEmotionalState(draft.emotionalState);
            if (draft.evolution) setEvolution(draft.evolution);
            if (draft.homework) setHomework(draft.homework);
            if (draft.privateNotes) setPrivateNotes(draft.privateNotes);
            setHasRecoveredDraft(true);
            setLastDraftSavedAt(draft.savedAtFormatted || null);
          }
        }
      } catch {
        // Ignora erro de leitura do rascunho
      }
    }
  }, [existingRecord, isOpen, sessionDate, modality, patient, sessionId, payments, existingPayment, draftKey]);

  // Gravação automática contínua de conteúdo (Debounce de 1 segundo)
  useEffect(() => {
    if (!isOpen) return;
    const hasAnyContent = Boolean(
      themes.trim() ||
        interventions.trim() ||
        emotionalState.trim() ||
        evolution.trim() ||
        homework.trim() ||
        privateNotes.trim()
    );

    if (!hasAnyContent) return;

    setDraftStatus('saving');
    const timer = setTimeout(() => {
      try {
        const now = new Date();
        const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            recordDate,
            recordModality,
            themes,
            interventions,
            emotionalState,
            evolution,
            homework,
            privateNotes,
            savedAt: now.toISOString(),
            savedAtFormatted: timeFormatted,
          })
        );
        setDraftStatus('saved');
        setLastDraftSavedAt(timeFormatted);
      } catch {
        setDraftStatus('idle');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    isOpen,
    draftKey,
    themes,
    interventions,
    emotionalState,
    evolution,
    homework,
    privateNotes,
    recordDate,
    recordModality,
  ]);

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignora erro
    }
    setHasRecoveredDraft(false);
    setDraftStatus('idle');
    setLastDraftSavedAt(null);
    if (existingRecord) {
      setThemes(existingRecord.themes || '');
      setInterventions(existingRecord.interventions || '');
      setEmotionalState(existingRecord.emotionalState || '');
      setEvolution(existingRecord.evolution || '');
      setHomework(existingRecord.homework || '');
      setPrivateNotes(existingRecord.privateNotes || '');
    } else {
      setThemes('');
      setInterventions('');
      setEmotionalState('');
      setEvolution('');
      setHomework('');
      setPrivateNotes('');
    }
  };

  if (!isOpen) return null;

  const isEditing = Boolean(existingRecord);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evolution.trim()) {
      alert('Por favor, preencha o registro de evolução clínica.');
      return;
    }

    if (!recordDate) {
      alert('Por favor, informe a data em que a sessão ocorreu.');
      return;
    }

    if (isEditing && !editReason.trim()) {
      alert('Para conformidade ética e auditoria do prontuário, informe o motivo da edição deste registro.');
      return;
    }

    const effectiveSessionId = sessionId || existingRecord?.sessionId || `ses-adhoc-${Date.now()}`;

    const recordPayload: ClinicalRecord = {
      id: existingRecord?.id || `rec-${Date.now()}`,
      patientId,
      patientName,
      sessionId: effectiveSessionId,
      sessionDate: recordDate,
      modality: recordModality,
      themes,
      interventions,
      emotionalState,
      evolution,
      homework,
      privateNotes,
      version: existingRecord?.version || 1,
      history: existingRecord?.history || [],
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Salva o Prontuário Clínico (com versionamento auditado)
    saveClinicalRecord(recordPayload, editReason);

    // 2. Se a integração financeira estiver ativada, contabiliza no financeiro
    if (syncWithFinancial) {
      const payId = existingPayment?.id || `pay-rec-${recordPayload.id}`;
      const paymentPayload: Payment = {
        id: payId,
        patientId,
        patientName,
        sessionId: effectiveSessionId,
        sessionDate: recordDate,
        amount: Number(financialAmount) || 200,
        dueDate: recordDate,
        paidDate: financialStatus === 'paid' ? (existingPayment?.paidDate || recordDate) : undefined,
        status: financialStatus,
        paymentMethod: financialMethod,
        receiptNumber:
          financialStatus === 'paid'
            ? existingPayment?.receiptNumber || `REC-${Date.now().toString().slice(-6)}`
            : undefined,
        notes: `Honorários referentes à sessão do dia ${formatDateBR(recordDate)}.`,
        createdAt: existingPayment?.createdAt || new Date().toISOString(),
      };

      savePayment(paymentPayload);

      // Se a sessão estiver no calendário, sincroniza também o status e o flag de prontuário
      if (sessionId) {
        const linkedSession = sessions.find(s => s.id === sessionId);
        if (linkedSession) {
          saveSession({
            ...linkedSession,
            date: recordDate, // sincroniza caso a data tenha sido ajustada retroativamente
            modality: recordModality,
            price: Number(financialAmount) || linkedSession.price,
            paymentStatus: financialStatus,
            hasRecord: true,
            recordId: recordPayload.id,
          });
        }
      }
    }

    // Limpa rascunho temporário do navegador
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignora erro
    }
    setHasRecoveredDraft(false);
    setDraftStatus('idle');

    // Backup e Snapshot de redundância imediato no encerramento da reunião
    storageService.triggerAutoSnapshot(`Sessão Concluída & Prontuário Gravado: ${patientName} (${recordDate})`);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base leading-tight">
                  {existingRecord ? `Editar Prontuário (v${existingRecord.version})` : 'Registro de Evolução Clínica'}
                </h3>
                {existingRecord && (
                  <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                    Edição Auditada
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Paciente: <span className="font-medium text-white">{patientName}</span>
                {recordDate && (
                  <> • Sessão de {formatDateBR(recordDate)} ({recordModality.toUpperCase()})</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {existingRecord && (existingRecord.history?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                <span>{showHistory ? 'Ocultar Histórico' : `Ver Histórico (${existingRecord.history.length})`}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* History Drawer if toggled */}
          {showHistory && existingRecord?.history && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <History className="w-4 h-4 text-brand-600" />
                <span>Histórico Imutável de Versões Anteriores (Resolução CFP 001/2009)</span>
              </div>
              <div className="space-y-3">
                {existingRecord.history.map((h, i) => (
                  <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 font-medium">
                      <span>Versão v{h.version} — {new Date(h.editedAt).toLocaleString('pt-BR')}</span>
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold">Motivo: {h.reason}</span>
                    </div>
                    <p className="italic text-slate-600 mt-1 whitespace-pre-wrap">{h.evolution}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerta de Rascunho Recuperado */}
          {hasRecoveredDraft && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Rascunho recuperado:</strong> Suas anotações anteriores foram restauradas
                  {lastDraftSavedAt ? ` (gravadas às ${lastDraftSavedAt})` : ''}.
                </span>
              </div>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="text-amber-800 hover:text-amber-950 font-semibold underline underline-offset-2 ml-3 shrink-0"
              >
                Descartar rascunho
              </button>
            </div>
          )}

          <form id="record-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Bloco 1: Data e Modalidade do Atendimento (Editável para registros posteriores) */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200/90 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span>Data e Modalidade do Atendimento</span>
                </div>
                <span className="text-[11px] text-emerald-800 font-medium">
                  {recordDate ? `Atendimento em: ${formatDateBR(recordDate)}` : 'Selecione a data'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="record-date-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Data em que a Sessão Ocorreu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="record-date-input"
                    type="date"
                    required
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Permite registrar sessões ocorridas em dias anteriores.
                  </p>
                </div>

                <div>
                  <label htmlFor="record-modality-select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Modalidade
                  </label>
                  <select
                    id="record-modality-select"
                    value={recordModality}
                    onChange={(e) => setRecordModality(e.target.value as Modality)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="presencial">Presencial (Consultório Poços de Caldas)</option>
                    <option value="online">Online (Videoconferência)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bloco 2: Temas e Técnicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Temas e Demandas Trabalhadas
                </label>
                <input
                  type="text"
                  placeholder="Ex: Insegurança profissional, limites nas relações familiares..."
                  value={themes}
                  onChange={(e) => setThemes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intervenções e Técnicas Utilizadas
                </label>
                <input
                  type="text"
                  placeholder="Ex: Reestruturação cognitiva, questionamento socrático, psicoeducação..."
                  value={interventions}
                  onChange={(e) => setInterventions(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Bloco 3: Estado Emocional */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estado Emocional, Humor e Comportamento Observado
              </label>
              <input
                type="text"
                placeholder="Ex: Humor ansioso no início, afeto modulado, discurso coerente e colaborativo..."
                value={emotionalState}
                onChange={(e) => setEmotionalState(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {/* Bloco 4: Evolução Clínica Formal */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Evolução Clínica da Sessão <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">Prontuário Documental Obrigatório (CFP)</span>
              </div>
              <textarea
                rows={5}
                required
                placeholder="Registre a síntese clínica do atendimento, intervenções realizadas e avanços terapêuticos..."
                value={evolution}
                onChange={(e) => setEvolution(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all leading-relaxed"
              />
            </div>

            {/* Bloco 5: Tarefas e Combinados */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tarefas e Combinados para a Próxima Sessão (Homework)
              </label>
              <input
                type="text"
                placeholder="Ex: Registro diário de pensamentos disfuncionais; leitura do capítulo recomendado..."
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {/* Bloco 6: Vínculo Automático com o Financeiro */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <label className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={syncWithFinancial}
                    onChange={(e) => setSyncWithFinancial(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      Lançar registro no Financeiro automaticamente
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Contabiliza os honorários no Dashboard e na aba Financeiro da clínica
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {syncWithFinancial ? 'Ativo' : 'Desativado'}
                </span>
              </label>

              {syncWithFinancial && (
                <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Valor da Sessão (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required={syncWithFinancial}
                      value={financialAmount}
                      onChange={(e) => setFinancialAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Status do Pagamento
                    </label>
                    <select
                      value={financialStatus}
                      onChange={(e) => setFinancialStatus(e.target.value as PaymentStatus)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="pending">⏳ Pendente (Aguardando)</option>
                      <option value="paid">✅ Pago / Recebido</option>
                      <option value="waived">🤝 Isento</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Forma de Pagamento
                    </label>
                    <select
                      value={financialMethod}
                      onChange={(e) => setFinancialMethod(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="pix">PIX</option>
                      <option value="cash">Dinheiro</option>
                      <option value="transfer">Transferência Bancária</option>
                      <option value="card">Cartão</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Bloco 7: Anotações Pessoais de Supervisão (Segregadas) */}
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Anotações Pessoais & Supervisão (Confidencialidade Estrita)</span>
                </div>
                <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-medium">
                  Não sai no relatório de prontuário
                </span>
              </div>
              <p className="text-[11px] text-amber-800">
                Espaço exclusivo para hipóteses preliminares, reflexões contratransferenciais e temas para supervisão.
              </p>
              <textarea
                rows={3}
                placeholder="Notas pessoais de trabalho da psicóloga..."
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Se estiver editando, exige justificativa */}
            {isEditing && (
              <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Justificativa da Revisão (Auditoria Ética)</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Informe o motivo da alteração (ex: Correção de informação fática, detalhamento de conduta)..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
              <span>Guarda digital segura por 5 anos (CFP 001/2009)</span>
            </div>
            {draftStatus === 'saving' && (
              <span className="text-[11px] font-medium text-amber-700 flex items-center gap-1 sm:ml-3">
                <Clock className="w-3.5 h-3.5 animate-spin text-amber-600" />
                Gravando conteúdo...
              </span>
            )}
            {draftStatus === 'saved' && lastDraftSavedAt && (
              <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1 sm:ml-3">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Gravado automaticamente às {lastDraftSavedAt}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="record-form"
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Salvar Revisão Auditada' : 'Salvar no Prontuário'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
