import React, { useState, useEffect, useMemo } from 'react';
import { X, Send, Copy, Check, MessageSquare, ExternalLink, Calendar, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatWhatsAppMessage, generateWhatsAppUrl, DEFAULT_TEMPLATES } from '../../services/whatsappService';
import { generateUniversalCalendarUrl } from '../../services/calendarService';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientPhone: string;
  emergencyContact?: {
    name: string;
    relationship?: string;
    phone: string;
  };
  sessionDate?: string;
  sessionTime?: string;
  endTime?: string;
  modality?: 'presencial' | 'online';
  meetLink?: string;
  amount?: number;
  initialTemplate?: 'reminder' | 'confirmation' | 'onlineLink' | 'friendlyCharge';
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  patientName,
  patientPhone,
  emergencyContact,
  sessionDate,
  sessionTime,
  endTime,
  modality,
  meetLink,
  amount,
  initialTemplate,
}) => {
  const { settings } = useApp();
  const [templateType, setTemplateType] = useState<'reminder' | 'confirmation' | 'onlineLink' | 'friendlyCharge'>(
    initialTemplate || 'reminder'
  );
  const [recipientType, setRecipientType] = useState<'patient' | 'responsible'>('patient');
  const [customText, setCustomText] = useState('');
  const [copied, setCopied] = useState(false);

  // Link universal inteligente para Google Agenda (Android) e Apple Calendar (iPhone)
  const universalAgendaLink = useMemo(() => {
    if (!sessionDate || !sessionTime) return '';
    return generateUniversalCalendarUrl({
      title: 'Sessão de Psicoterapia - Ana Lima',
      patientName: patientName ? patientName.split(' ')[0] : undefined,
      date: sessionDate,
      startTime: sessionTime,
      endTime: endTime || '14:50',
      modality: modality || (meetLink ? 'online' : 'presencial'),
      meetLink: meetLink || (modality === 'online' ? settings.defaultOnlineLink : undefined),
      address: settings.address || 'Consultório em Poços de Caldas/MG',
    });
  }, [sessionDate, sessionTime, endTime, modality, meetLink, patientName, settings]);

  const hasEmergencyContact = Boolean(emergencyContact && emergencyContact.phone && emergencyContact.name);
  const activeRecipientName = recipientType === 'responsible' && hasEmergencyContact ? emergencyContact!.name : patientName;
  const activeRecipientPhone = recipientType === 'responsible' && hasEmergencyContact ? emergencyContact!.phone : patientPhone;

  useEffect(() => {
    if (!isOpen) return;
    let baseTemplate = settings.whatsAppTemplates[templateType] || '';
    if (templateType === 'confirmation' && !baseTemplate.includes('{agenda}')) {
      baseTemplate = DEFAULT_TEMPLATES.confirmation;
    }
    const formatted = formatWhatsAppMessage(baseTemplate, {
      nome: activeRecipientName,
      data: sessionDate || 'hoje',
      hora: sessionTime || '14:00',
      link: meetLink || settings.defaultOnlineLink,
      valor: amount || 200,
      pix: settings.pixKey,
      agenda: universalAgendaLink,
    });
    setCustomText(formatted);
  }, [isOpen, templateType, activeRecipientName, sessionDate, sessionTime, meetLink, amount, settings, universalAgendaLink]);

  if (!isOpen) return null;

  const handleOpenWhatsApp = () => {
    const url = generateWhatsAppUrl(activeRecipientPhone, customText);
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-emerald-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-500/80 rounded-xl flex items-center justify-center shadow-inner">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Enviar Mensagem no WhatsApp</h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                Para: <span className="font-medium text-white">{activeRecipientName}</span> ({activeRecipientPhone || 'Telefone não informado'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-emerald-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Recipient Selector (Paciente vs Responsável) */}
          {hasEmergencyContact && (
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Destinatário da Mensagem
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRecipientType('patient')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    recipientType === 'patient'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>👤 Paciente</span>
                  <span className="text-[10px] opacity-80">({patientName.split(' ')[0]})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientType('responsible')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    recipientType === 'responsible'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>👥 Responsável</span>
                  <span className="text-[10px] opacity-80">({emergencyContact!.relationship || 'Familiar'})</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                Enviando para: <span className="font-semibold text-slate-800">{activeRecipientName}</span> ({emergencyContact?.relationship || 'Contato'}) • {activeRecipientPhone}
              </p>
            </div>
          )}

          {/* Template Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Selecione o Modelo de Mensagem
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTemplateType('reminder')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                  templateType === 'reminder'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                📅 Lembrete (Véspera)
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('confirmation')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                  templateType === 'confirmation'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                ✅ Confirmação (Dia)
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('onlineLink')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                  templateType === 'onlineLink'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                🔗 Link Sessão Online
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('friendlyCharge')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                  templateType === 'friendlyCharge'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                💬 Resumo / PIX
              </button>
            </div>

            {(templateType === 'confirmation' || templateType === 'reminder') && (
              <div className="mt-2.5 bg-emerald-50 border border-emerald-200/90 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-emerald-800 font-medium">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Link Universal de Agenda incluído: adiciona ao Google Agenda (Android) ou Apple Calendar (iPhone) com 1 toque.</span>
              </div>
            )}
          </div>

          {/* Textarea Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Texto da Mensagem (Editável)
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar texto'}</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Dica de Sigilo: as mensagens utilizam termos neutros para preservar a confidencialidade do paciente.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Abrir no WhatsApp</span>
            <ExternalLink className="w-3 h-3 text-emerald-200" />
          </button>
        </div>
      </div>
    </div>
  );
};
