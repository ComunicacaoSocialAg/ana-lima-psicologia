import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Activity, BarChart2 } from 'lucide-react';
import { AssessmentType, Assessment } from '../../types';
import { 
  PHQ9_QUESTIONS, 
  GAD7_QUESTIONS, 
  FREQUENCY_OPTIONS, 
  calculateScore, 
  interpretScore 
} from '../../services/assessmentsService';
import { useApp } from '../../context/AppContext';

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
}

export const AssessmentModal: React.FC<AssessmentModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
}) => {
  const { saveAssessment } = useApp();
  const [type, setType] = useState<AssessmentType>('GAD-7');
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [answers, setAnswers] = useState<number[]>(new Array(7).fill(0));
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const questions = type === 'PHQ-9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;

  const handleTypeChange = (newType: AssessmentType) => {
    setType(newType);
    setAnswers(new Array(newType === 'PHQ-9' ? 9 : 7).fill(0));
  };

  const handleAnswerChange = (index: number, val: number) => {
    const updated = [...answers];
    updated[index] = val;
    setAnswers(updated);
  };

  const currentScore = calculateScore(answers);
  const interpretation = interpretScore(type, currentScore);
  const hasCriticalItem = type === 'PHQ-9' && answers[8] > 0; // Item 9 PHQ-9

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Assessment = {
      id: `ass-${Date.now()}`,
      patientId,
      patientName,
      type,
      date: assessmentDate,
      answers,
      totalScore: currentScore,
      severity: interpretation.severity,
      alertItem: hasCriticalItem,
      notes,
      createdAt: new Date().toISOString(),
    };

    saveAssessment(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Aplicação de Instrumento Clínico</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Paciente: <span className="font-medium text-white">{patientName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Instrument Selector & Date */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Instrumento Psicométrico
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange('GAD-7')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    type === 'GAD-7'
                      ? 'bg-brand-600 text-white border-brand-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  GAD-7 (Ansiedade)
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('PHQ-9')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    type === 'PHQ-9'
                      ? 'bg-brand-600 text-white border-brand-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  PHQ-9 (Depressão)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Data da Aplicação
              </label>
              <input
                type="date"
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Live Score Preview Bar */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${interpretation.color}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center font-bold text-lg shadow-2xs">
                {currentScore}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">
                  Gravidade: {interpretation.severity} (Escore: {currentScore} / {type === 'PHQ-9' ? '27' : '21'})
                </p>
                <p className="text-xs opacity-90 mt-0.5">{interpretation.description}</p>
              </div>
            </div>

            {hasCriticalItem && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-xs animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                <span>Alerta no Item 9</span>
              </div>
            )}
          </div>

          {/* Questions Form */}
          <form id="assessment-form" onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs font-medium text-slate-600 italic">
              "Nas últimas 2 semanas, com que frequência você foi incomodado(a) por qualquer um dos seguintes problemas?"
            </p>

            <div className="space-y-3">
              {questions.map((q, idx) => {
                const isItem9 = type === 'PHQ-9' && q.id === 9;
                return (
                  <div 
                    key={q.id} 
                    className={`p-3.5 rounded-xl border transition-all ${
                      isItem9 && answers[idx] > 0 
                        ? 'bg-rose-50 border-rose-300' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-xs font-medium text-slate-800 leading-relaxed">
                        <strong className="text-slate-900">{q.id}.</strong> {q.text}
                      </span>
                      {isItem9 && (
                        <span className="shrink-0 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                          Item Crítico
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {FREQUENCY_OPTIONS.map((opt) => {
                        const isSelected = answers[idx] === opt.value;
                        return (
                          <button
                            type="button"
                            key={opt.value}
                            onClick={() => handleAnswerChange(idx, opt.value)}
                            className={`py-1.5 px-2.5 rounded-lg text-xs font-medium text-center border transition-all ${
                              isSelected
                                ? 'bg-brand-600 text-white border-brand-600 font-semibold shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>{opt.label} ({opt.value})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Observações da aplicação */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observações Clínicas da Aplicação
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Paciente relatou que a piora nos sintomas de sono coincide com a semana de fechamento fiscal..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <BarChart2 className="w-4 h-4 text-brand-600" />
            <span>Escalas de domínio público validadas para a prática clínica</span>
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
              form="assessment-form"
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Registrar Escala</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
