import React, { useState, useEffect } from 'react';
import { X, Save, History, FileText, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { ClinicalRecord, Modality } from '../../types';
import { useApp } from '../../context/AppContext';

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
  sessionDate = new Date().toISOString().slice(0, 10),
  modality = 'presencial',
  existingRecord,
}) => {
  const { saveClinicalRecord } = useApp();

  const [themes, setThemes] = useState('');
  const [interventions, setInterventions] = useState('');
  const [emotionalState, setEmotionalState] = useState('');
  const [evolution, setEvolution] = useState('');
  const [homework, setHomework] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (existingRecord) {
      setThemes(existingRecord.themes || '');
      setInterventions(existingRecord.interventions || '');
      setEmotionalState(existingRecord.emotionalState || '');
      setEvolution(existingRecord.evolution || '');
      setHomework(existingRecord.homework || '');
      setPrivateNotes(existingRecord.privateNotes || '');
      setEditReason('');
    } else {
      setThemes('');
      setInterventions('');
      setEmotionalState('');
      setEvolution('');
      setHomework('');
      setPrivateNotes('');
      setEditReason('');
    }
  }, [existingRecord, isOpen]);

  if (!isOpen) return null;

  const isEditing = Boolean(existingRecord);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evolution.trim()) {
      alert('Por favor, preencha o registro de evolução clínica.');
      return;
    }

    if (isEditing && !editReason.trim()) {
      alert('Para conformidade ética e auditoria do prontuário, informe o motivo da edição deste registro.');
      return;
    }

    const recordPayload: ClinicalRecord = {
      id: existingRecord?.id || `rec-${Date.now()}`,
      patientId,
      patientName,
      sessionId: sessionId || existingRecord?.sessionId || `ses-adhoc-${Date.now()}`,
      sessionDate,
      modality,
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

    saveClinicalRecord(recordPayload, editReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
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
                Paciente: <span className="font-medium text-white">{patientName}</span> | Sessão: {sessionDate} ({modality.toUpperCase()})
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

          <form id="record-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Temas e Técnicas */}
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

            {/* Estado Emocional */}
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

            {/* Evolução Clínica Formal */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Evolução Clínica da Sessão <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">Prontuário Documental Obrigatório</span>
              </div>
              <textarea
                rows={5}
                required
                placeholder="Registre a síntese clínica do atendimento, avanços terapêuticos e percepções do processo..."
                value={evolution}
                onChange={(e) => setEvolution(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all leading-relaxed"
              />
            </div>

            {/* Tarefas e Combinados */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tarefas e Combinados para a Próxima Sessão (Homework)
              </label>
              <input
                type="text"
                placeholder="Ex: Registro diário de pensamentos automáticos; leitura do material de apoio..."
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {/* Anotações Pessoais de Supervisão (Segregadas) */}
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
                Espaço exclusivo para hipóteses preliminares, impressões contratransferenciais e temas para supervisão clínica.
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
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span>Guarda digital segura por 5 anos (Resolução CFP 001/2009)</span>
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
