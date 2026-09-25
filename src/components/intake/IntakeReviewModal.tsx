import React from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  HeartHandshake, 
  Building2, 
  Video, 
  Sparkles, 
  ShieldCheck, 
  MessageSquare, 
  FileText,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';
import { Patient } from '../../types';

interface IntakeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onScheduleSession: (patientId: string) => void;
  onOpenWhatsApp: (patient: Patient) => void;
}

export const IntakeReviewModal: React.FC<IntakeReviewModalProps> = ({
  isOpen,
  onClose,
  patient,
  onScheduleSession,
  onOpenWhatsApp,
}) => {
  if (!isOpen || !patient) return null;

  const preData = patient.preRegistrationData;
  const submittedAtFormatted = preData?.submittedAt
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(new Date(preData.submittedAt))
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(new Date(patient.createdAt || Date.now()));

  const handleScheduleClick = () => {
    onClose();
    onScheduleSession(patient.id);
  };

  const handleWhatsAppClick = () => {
    onClose();
    onOpenWhatsApp(patient);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header com Identidade Visual do Acolhimento */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white px-6 py-5 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner shrink-0 text-xl font-bold">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white truncate leading-tight">
                  {patient.name}
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100 border border-emerald-300/40 flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  <span>Novo Pré-Cadastro</span>
                </span>
              </div>
              <p className="text-xs text-teal-100 mt-1 flex items-center gap-2 flex-wrap">
                <span>Recebido em: <strong>{submittedAtFormatted}</strong></span>
                <span>•</span>
                <span>Consultório: <strong>Poços de Caldas, MG</strong></span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Todas as Informações Preenchidas pelo Paciente */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Banner de Ação Rápida */}
          <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-900 leading-tight">
                  Paciente aguardando primeiro agendamento
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Preferencia: <strong>{patient.preferredModality === 'online' ? '💻 Online (Meet)' : '🏢 Presencial (Poços de Caldas)'}</strong> • Turno: <strong>{patient.usualSchedule || 'A combinar'}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleWhatsAppClick}
                className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleScheduleClick}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Agendar Sessão</span>
              </button>
            </div>
          </div>

          {/* 1. Dados Pessoais & Documentos */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <User className="w-4 h-4 text-brand-600" />
              <span>Identificação e Dados Pessoais</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Nome Completo</span>
                <span className="font-semibold text-slate-800">{patient.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">CPF</span>
                <span className="font-semibold text-slate-800">{patient.cpf || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Data de Nascimento</span>
                <span className="font-semibold text-slate-800">{patient.birthDate || 'Não informada'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Identidade de Gênero</span>
                <span className="font-semibold text-slate-800 capitalize">{patient.gender || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Estado Civil</span>
                <span className="font-semibold text-slate-800 capitalize">{patient.maritalStatus || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Profissão / Ocupação</span>
                <span className="font-semibold text-slate-800">{patient.profession || 'Não informada'}</span>
              </div>
            </div>
          </div>

          {/* 2. Contatos & Endereço */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Phone className="w-4 h-4 text-brand-600" />
              <span>Contatos e Localização</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">WhatsApp / Telefone</span>
                  <a href={`tel:${patient.phone}`} className="font-bold text-brand-700 hover:underline">
                    {patient.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-slate-400 block text-[11px]">E-mail</span>
                  <a href={`mailto:${patient.email}`} className="font-semibold text-slate-800 hover:underline truncate block">
                    {patient.email || 'Não informado'}
                  </a>
                </div>
              </div>

              <div className="sm:col-span-2 flex items-start gap-2.5 pt-1">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Endereço</span>
                  <span className="font-semibold text-slate-800">{patient.address || 'Poços de Caldas, MG'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Contato de Emergência / Responsável Legal */}
          <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider">
              <HeartHandshake className="w-4 h-4 text-purple-700" />
              <span>Contato de Emergência / Responsável Legal</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <span className="text-purple-600 block text-[11px]">Nome do Contato</span>
                <span className="font-bold text-purple-950">{patient.emergencyContact?.name || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-purple-600 block text-[11px]">Parentesco / Vínculo</span>
                <span className="font-semibold text-purple-900">{patient.emergencyContact?.relationship || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-purple-600 block text-[11px]">Telefone de Emergência</span>
                <span className="font-bold text-purple-950">{patient.emergencyContact?.phone || 'Não informado'}</span>
              </div>
            </div>
          </div>

          {/* 4. Queixa Inicial / Motivo da Procura */}
          {preData?.initialComplaint && (
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-brand-600" />
                <span>Queixa Principal / Motivo da Busca</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed italic bg-white p-3.5 rounded-xl border border-slate-200">
                "{preData.initialComplaint}"
              </p>
            </div>
          )}

          {/* 5. Conformidade LGPD & Sigilo */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Termo de consentimento e sigilo profissional (LGPD / CFP) aceito no ato do pré-cadastro.</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400 shrink-0">ID: {patient.id}</span>
          </div>

        </div>

        {/* Rodapé Fixo */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Fechar Ficha
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleWhatsAppClick}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chamar no WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleScheduleClick}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>Agendar Sessão</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
