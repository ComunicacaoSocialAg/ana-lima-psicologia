import React, { useEffect } from 'react';
import { Sparkles, Calendar, X, BellRing, ArrowRight } from 'lucide-react';
import { Patient } from '../../types';

interface IntakeToastAlertProps {
  patient: Patient | null;
  onReview: (patient: Patient) => void;
  onDismiss: () => void;
}

export const IntakeToastAlert: React.FC<IntakeToastAlertProps> = ({
  patient,
  onReview,
  onDismiss,
}) => {
  useEffect(() => {
    if (!patient) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 12000); // Fecha automaticamente após 12 segundos se não clicado

    return () => clearTimeout(timer);
  }, [patient, onDismiss]);

  if (!patient) return null;

  return (
    <div className="fixed top-4 sm:top-5 right-3 sm:right-5 z-50 max-w-sm sm:max-w-md w-[calc(100vw-1.5rem)] animate-in slide-in-from-top-4 fade-in duration-200">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-emerald-500/40 ring-4 ring-emerald-500/10">
        
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30 animate-bounce">
              <BellRing className="w-5 h-5 text-slate-950" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Novo Pré-Cadastro Recebido!</span>
              </div>
              <h3 className="font-bold text-sm text-white truncate mt-0.5">
                {patient.name}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                Prefere: <strong>{patient.preferredModality === 'online' ? 'Online' : 'Presencial'}</strong> ({patient.usualSchedule || 'Turno a combinar'})
              </p>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Botão de Ação Imediata */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">
            Aguardando agendamento
          </span>

          <button
            onClick={() => {
              onReview(patient);
              onDismiss();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Conferir Dados & Agendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
