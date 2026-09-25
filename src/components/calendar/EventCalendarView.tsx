import React, { useMemo } from 'react';
import { Calendar, Clock, Video, MapPin, CheckCircle2, Shield, MessageCircle, ExternalLink, Download, Sparkles } from 'lucide-react';
import {
  CalendarEventDetails,
  generateGoogleCalendarUrl,
  downloadIcsFile,
} from '../../services/calendarService';

export const EventCalendarView: React.FC = () => {
  // Lê parâmetros da URL
  const query = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const eventDetails: CalendarEventDetails = useMemo(() => {
    return {
      title: query.get('t') || 'Sessão de Psicoterapia - Ana Lima',
      patientName: query.get('p') || undefined,
      date: query.get('d') || new Date().toISOString().slice(0, 10),
      startTime: query.get('s') || '14:00',
      endTime: query.get('e') || '14:50',
      modality: (query.get('m') === 'online' ? 'online' : 'presencial') as 'presencial' | 'online',
      meetLink: query.get('meet') || undefined,
      address: query.get('loc') || 'Consultório em Poços de Caldas/MG',
    };
  }, [query]);

  // Detecção amigável do sistema operacional do paciente
  const isApple = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

  // Formatação em português amigável da data
  const formattedDate = useMemo(() => {
    try {
      const [year, month, day] = eventDetails.date.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
      const dayStr = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
      return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dayStr}`;
    } catch {
      return eventDetails.date;
    }
  }, [eventDetails.date]);

  const handleOpenGoogleCalendar = () => {
    const url = generateGoogleCalendarUrl(eventDetails);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadAppleIcs = () => {
    downloadIcsFile(eventDetails);
  };

  const clinicPhone = '5531992949211';
  const whatsappConsultationUrl = `https://wa.me/${clinicPhone}?text=${encodeURIComponent(
    `Olá, Ana! Aqui é ${eventDetails.patientName || 'seu paciente'}. Gostaria de falar sobre minha sessão agendada para ${eventDetails.date} às ${eventDetails.startTime}.`
  )}`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800 pb-12">
      {/* Header Institucional de Acolhimento */}
      <header className="bg-white border-b border-slate-200 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-6 shadow-2xs">
        <div className="max-w-xl mx-auto px-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="relative">
            <img
              src="/favicon.svg"
              alt="Logo Dente de Leão - Psicóloga Ana Lima"
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-[#1C2B22]/10 shadow-md"
            />
            <div className="absolute -bottom-1 -right-1 bg-[#1C2B22] text-[#F7F5F0] border border-[#F7F5F0]/25 p-1 rounded-lg shadow">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Psicóloga Ana Lima</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 border border-brand-200">
                CRP 04/60205
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Psicoterapia Clínica • Poços de Caldas/MG
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-emerald-700 font-medium pt-0.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Ambiente Seguro com Sigilo Profissional e LGPD</span>
            </div>
          </div>
        </div>
      </header>

      {/* Cartão Principal do Agendamento */}
      <main className="max-w-xl mx-auto px-4 pt-6 space-y-5">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Status e Acolhimento */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 w-fit">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Horário Confirmado</span>
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
                {eventDetails.patientName ? `Olá, ${eventDetails.patientName.split(' ')[0]}!` : 'Sua Sessão Está Agendada!'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Confira os detalhes abaixo e salve na sua agenda para receber lembretes no celular.
              </p>
            </div>
          </div>

          {/* Detalhes do Horário */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">Data da Consulta</span>
                <p className="text-sm font-semibold text-slate-900">{formattedDate}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">Horário</span>
                <p className="text-sm font-semibold text-slate-900">
                  {eventDetails.startTime} às {eventDetails.endTime} <span className="text-xs font-normal text-slate-500">(Duração de 50 min)</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                eventDetails.modality === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {eventDetails.modality === 'online' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Modalidade & Local</span>
                <p className="text-sm font-semibold text-slate-900">
                  {eventDetails.modality === 'online' ? 'Atendimento Online (Google Meet)' : 'Atendimento Presencial'}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {eventDetails.modality === 'online'
                    ? 'Acesso por videochamada privada e sem gravação.'
                    : (eventDetails.address || 'Consultório em Poços de Caldas/MG')}
                </p>

                {eventDetails.modality === 'online' && eventDetails.meetLink && (
                  <a
                    href={eventDetails.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Entrar na Sala Virtual do Meet</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Bloco de Botões de Adicionar à Agenda */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Adicione ao seu Calendário em 1 Toque
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Escolha seu calendário abaixo. O evento será criado automaticamente com alarme 1 hora antes:
            </p>

            {/* Botão Google Agenda */}
            <button
              onClick={handleOpenGoogleCalendar}
              className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                isAndroid
                  ? 'border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  G
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 block">Adicionar ao Google Agenda</span>
                    {isAndroid && (
                      <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Ideal para celulares Android (Samsung, Motorola, Xiaomi) e PC
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* Botão Apple Calendar / iOS */}
            <button
              onClick={handleDownloadAppleIcs}
              className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                isApple
                  ? 'border-brand-500 bg-brand-50/50 hover:bg-brand-50 ring-2 ring-brand-500/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 block">Adicionar ao Apple Calendar (iPhone)</span>
                    {isApple && (
                      <span className="text-[10px] font-bold uppercase bg-brand-600 text-white px-2 py-0.5 rounded-full">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Abre direto no Calendário nativo do iPhone, iPad ou Mac
                  </span>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>

          {/* Dúvidas ou Suporte Direto no WhatsApp */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 text-center sm:text-left">
              Precisa alterar o horário ou avisar um imprevisto?
            </span>
            <a
              href={whatsappConsultationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Avisar no WhatsApp</span>
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Ana Lima • Psicóloga Clínica (CRP 04/60205) • Poços de Caldas/MG
        </p>
      </main>
    </div>
  );
};
