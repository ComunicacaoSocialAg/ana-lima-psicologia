import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Video, 
  MessageSquare, 
  FileEdit, 
  ArrowRight, 
  TrendingUp, 
  MapPin, 
  ExternalLink,
  ListTodo,
  UserCheck,
  Plus,
  Send,
  Sparkles,
  PhoneCall,
  CheckSquare,
  Eye
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { Session, Modality } from '../../types';
import { WhatsAppModal } from '../common/WhatsAppModal';
import { SessionRecordModal } from '../clinical/SessionRecordModal';
import { DandelionLogo } from '../common/DandelionLogo';

interface DashboardViewProps {
  onNewSessionClick: () => void;
  onNewPatientClick: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNewSessionClick, onNewPatientClick }) => {
  const { 
    metrics, 
    sessions, 
    patients, 
    settings, 
    navigateTo, 
    updateSessionStatus,
    isPrivacyMode,
    openReviewPatient,
    openNewSessionModal
  } = useApp();

  // Modals state
  const [whatsAppSession, setWhatsAppSession] = useState<Session | null>(null);
  const [recordSession, setRecordSession] = useState<Session | null>(null);

  // Período do Painel de Tarefas ('today' | 'week')
  const [tasksPeriod, setTasksPeriod] = useState<'today' | 'week'>('today');
  const [activeTaskCategory, setActiveTaskCategory] = useState<'all' | 'confirmations' | 'meet' | 'records' | 'payments'>('all');

  // Sessões de Hoje
  const todayIso = new Date().toISOString().slice(0, 10);
  const todaySessions = useMemo(() => {
    return sessions
      .filter(s => s.date === todayIso)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [sessions, todayIso]);

  // Intervalo da Semana Atual
  const weekRange = useMemo(() => {
    const curr = new Date();
    const firstDay = new Date(curr);
    firstDay.setDate(curr.getDate() - curr.getDay());
    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6);
    return {
      startIso: firstDay.toISOString().slice(0, 10),
      endIso: lastDay.toISOString().slice(0, 10),
    };
  }, []);

  // Sessões no Escopo Selecionado (Hoje vs Semana)
  const scopeSessions = useMemo(() => {
    return tasksPeriod === 'today'
      ? sessions.filter(s => s.date === todayIso)
      : sessions.filter(s => s.date >= weekRange.startIso && s.date <= weekRange.endIso);
  }, [sessions, tasksPeriod, todayIso, weekRange]);

  // 1. Confirmações a Enviar: Sessões agendadas que aguardam confirmação com paciente/responsável
  const pendingConfirmations = useMemo(() => {
    return scopeSessions.filter(s => s.status === 'scheduled');
  }, [scopeSessions]);

  // 2. Links do Meet a Enviar: Sessões online ativas
  const pendingMeetLinks = useMemo(() => {
    return scopeSessions.filter(s => s.modality === 'online' && s.status !== 'canceled' && s.status !== 'completed');
  }, [scopeSessions]);

  // 3. Prontuários & Evoluções Pendentes: Sessões realizadas sem prontuário
  const pendingRecords = useMemo(() => {
    return scopeSessions.filter(s => s.status === 'completed' && !s.hasRecord);
  }, [scopeSessions]);

  // 4. Cobranças Pendentes: Sessões realizadas ou faltas cobradas sem pagamento
  const pendingPayments = useMemo(() => {
    return scopeSessions.filter(s => (s.status === 'completed' || s.status === 'missed_chargeable') && s.paymentStatus === 'pending');
  }, [scopeSessions]);

  const totalTasksCount = pendingConfirmations.length + pendingMeetLinks.length + pendingRecords.length + pendingPayments.length;

  // Pacientes em Lista de Espera
  const waitingListPatients = useMemo(() => {
    return patients.filter(p => p.status === 'waiting_list');
  }, [patients]);

  // Dados para Gráfico de Modalidade
  const modalityData = [
    { name: 'Presencial', value: sessions.filter(s => s.modality === 'presencial').length, color: '#0d9488' },
    { name: 'Online', value: sessions.filter(s => s.modality === 'online').length, color: '#3b82f6' },
  ];

  // Dados para Gráfico Semanal
  const weeklyDistribution = [
    { dia: 'Seg', sessoes: 3, realizadas: 3 },
    { dia: 'Ter', sessoes: 5, realizadas: 4 },
    { dia: 'Qua', sessoes: 4, realizadas: 4 },
    { dia: 'Qui', sessoes: 4, realizadas: 3 },
    { dia: 'Sex', sessoes: 3, realizadas: 2 },
  ];

  const getStatusBadge = (status: Session['status']) => {
    switch (status) {
      case 'completed':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Realizada</span>;
      case 'confirmed':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Confirmada</span>;
      case 'scheduled':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Agendada</span>;
      case 'missed_chargeable':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">Falta c/ Cobrança</span>;
      case 'missed_non_chargeable':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Falta Justificada</span>;
      case 'canceled':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">Cancelada</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner com Identidade Dente de Leão (#1C2B22 & #F7F5F0) */}
      <div className="bg-[#1C2B22] text-[#F7F5F0] rounded-2xl p-5 sm:p-6 shadow-sm border border-[#F7F5F0]/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <DandelionLogo 
            size={56} 
            variant="light" 
            rounded="2xl" 
            className="shadow-md ring-2 ring-[#F7F5F0]/25 hidden sm:block" 
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F7F5F0] text-[#1C2B22]">
                CRP {settings.crp}
              </span>
              <span className="text-xs text-[#F7F5F0]/75">Consultório de Psicologia Clínica</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#F7F5F0]">
              Olá, Psicóloga {settings.psychologistName}
            </h1>
            <p className="text-xs text-[#F7F5F0]/80 max-w-xl">
              {todaySessions.length > 0 
                ? `Você tem ${todaySessions.length} atendimento(s) programado(s) para hoje. ${pendingConfirmations.length > 0 ? `${pendingConfirmations.length} confirmação(ões) aguardam envio.` : 'Todas as confirmações estão em dia!'}`
                : 'Nenhum atendimento agendado para hoje. Excelente momento para revisar prontuários e gerenciar a lista de espera.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onNewSessionClick}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#F7F5F0] hover:bg-white text-[#1C2B22] text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar Sessão</span>
          </button>
          <button
            onClick={onNewPatientClick}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1C2B22] hover:bg-[#F7F5F0]/10 text-[#F7F5F0] border border-[#F7F5F0]/30 text-xs font-semibold rounded-xl transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Cadastrar Paciente</span>
          </button>
        </div>
      </div>

      {/* Cartões de Indicadores Chave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pacientes Ativos */}
        <div 
          onClick={() => navigateTo('patients')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pacientes Ativos</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.activePatients}</span>
            <span className="text-xs text-slate-500">em acompanhamento</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{waitingListPatients.length} na fila de espera</span>
            <span className="text-brand-600 font-medium group-hover:translate-x-0.5 transition-transform">Ver todos →</span>
          </div>
        </div>

        {/* Sessões no Mês */}
        <div 
          onClick={() => navigateTo('schedule')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sessões no Mês</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.sessionsCompletedCount}</span>
            <span className="text-xs text-slate-500">de {metrics.sessionsMonthCount} agendadas</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-slate-600 font-medium">Taxa de falta: {metrics.absenceRatePercentage}%</span>
            <span className="text-brand-600 font-medium group-hover:translate-x-0.5 transition-transform">Ver agenda →</span>
          </div>
        </div>

        {/* Faturamento do Mês */}
        <div 
          onClick={() => navigateTo('financial')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faturamento Realizado</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">R$ {metrics.revenueRealizedMonth}</span>
            <span className="text-xs text-slate-500">recebido</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Previsto: R$ {metrics.revenueProjectedMonth}</span>
            <span className="text-amber-600 font-medium">R$ {metrics.pendingPaymentsTotal} pendente</span>
          </div>
        </div>

        {/* Evoluções Pendentes */}
        <div 
          onClick={() => navigateTo('schedule')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Evoluções Pendentes</span>
            <div className={`p-2 rounded-xl transition-colors ${metrics.pendingRecordsCount > 0 ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' : 'bg-slate-100 text-slate-500'}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${metrics.pendingRecordsCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {metrics.pendingRecordsCount}
            </span>
            <span className="text-xs text-slate-500">sessões sem evolução</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-emerald-600 font-medium">CFP 001/2009</span>
            <span>{metrics.onlineSessionsPercentage}% online</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* NOVO: PAINEL DE TAREFAS DA CLÍNICA (DO DIA E DA SEMANA) */}
      {/* Consultas, confirmações, mensagens a pacientes ou responsáveis */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Header do Painel de Tarefas */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-600 text-white rounded-xl shadow-2xs">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-800">
                  Tarefas Operacionais da Clínica
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">
                  {totalTasksCount} pendência(s)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Confirmações, envio de links do Meet, cobranças e mensagens para pacientes ou responsáveis
              </p>
            </div>
          </div>

          {/* Toggle Hoje vs Semana */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setTasksPeriod('today')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                tasksPeriod === 'today'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Hoje ({todayIso.slice(8, 10)}/{todayIso.slice(5, 7)})
            </button>
            <button
              onClick={() => setTasksPeriod('week')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                tasksPeriod === 'week'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗓️ Esta Semana
            </button>
          </div>
        </div>

        {/* Abas Rápidas de Categorias de Tarefas */}
        <div className="px-4 py-2.5 border-b border-slate-100 bg-white flex flex-wrap items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTaskCategory('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              activeTaskCategory === 'all'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({totalTasksCount})
          </button>
          <button
            onClick={() => setActiveTaskCategory('confirmations')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              activeTaskCategory === 'confirmations'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            💬 Enviar Confirmações ({pendingConfirmations.length})
          </button>
          <button
            onClick={() => setActiveTaskCategory('meet')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              activeTaskCategory === 'meet'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            🔗 Links do Google Meet ({pendingMeetLinks.length})
          </button>
          <button
            onClick={() => setActiveTaskCategory('records')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              activeTaskCategory === 'records'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            📝 Prontuários Pendentes ({pendingRecords.length})
          </button>
          <button
            onClick={() => setActiveTaskCategory('payments')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              activeTaskCategory === 'payments'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            💰 Cobranças & PIX ({pendingPayments.length})
          </button>
        </div>

        {/* Lista de Tarefas do Período */}
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {totalTasksCount === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">
                Tudo em dia para {tasksPeriod === 'today' ? 'o dia de hoje' : 'esta semana'}!
              </p>
              <p className="text-xs text-slate-400">
                Nenhuma confirmação pendente, link em atraso ou prontuário desatualizado.
              </p>
            </div>
          ) : (
            <>
              {/* Tarefas de Confirmação */}
              {(activeTaskCategory === 'all' || activeTaskCategory === 'confirmations') && pendingConfirmations.map((ses) => {
                const patient = patients.find(p => p.id === ses.patientId);
                return (
                  <div 
                    key={`conf-${ses.id}`}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-blue-50/40 transition-colors ${isPrivacyMode ? 'privacy-blur' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            Confirmar Consulta
                          </span>
                          <span className="text-xs font-semibold text-slate-700">
                            {ses.date.slice(8, 10)}/{ses.date.slice(5, 7)} às {ses.startTime}
                          </span>
                          {ses.modality === 'online' ? (
                            <span className="text-[10px] text-blue-600 font-medium">💻 Online</span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-medium">🏢 Presencial</span>
                          )}
                        </div>

                        <div className="mt-1">
                          <span 
                            onClick={() => navigateTo('patient-detail', ses.patientId)}
                            className="font-bold text-sm text-slate-900 hover:text-brand-600 cursor-pointer"
                          >
                            {ses.patientName}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">
                            Tel: {ses.patientPhone}
                          </span>
                          {patient?.emergencyContact?.name && (
                            <span className="text-[11px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded ml-2 font-medium border border-purple-200">
                              👥 Resp: {patient.emergencyContact.name} ({patient.emergencyContact.relationship || 'Familiar'})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => setWhatsAppSession(ses)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                        title="Enviar confirmação no WhatsApp (Opção: Paciente ou Responsável)"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar WhatsApp</span>
                      </button>

                      <button
                        onClick={() => updateSessionStatus(ses.id, 'confirmed')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
                        title="Marcar como Confirmada manualmente"
                      >
                        ✓ Já Confirmado
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Tarefas de Link do Meet */}
              {(activeTaskCategory === 'all' || activeTaskCategory === 'meet') && pendingMeetLinks.map((ses) => {
                const patient = patients.find(p => p.id === ses.patientId);
                return (
                  <div 
                    key={`meet-${ses.id}`}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-indigo-50/40 transition-colors ${isPrivacyMode ? 'privacy-blur' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl shrink-0 mt-0.5">
                        <Video className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            Enviar Link do Google Meet
                          </span>
                          <span className="text-xs font-semibold text-slate-700">
                            {ses.date.slice(8, 10)}/{ses.date.slice(5, 7)} às {ses.startTime}
                          </span>
                        </div>

                        <div className="mt-1">
                          <span 
                            onClick={() => navigateTo('patient-detail', ses.patientId)}
                            className="font-bold text-sm text-slate-900 hover:text-brand-600 cursor-pointer"
                          >
                            {ses.patientName}
                          </span>
                          {patient?.emergencyContact?.name && (
                            <span className="text-[11px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded ml-2 font-medium border border-purple-200">
                              👥 Resp: {patient.emergencyContact.name} ({patient.emergencyContact.relationship || 'Contato'})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => setWhatsAppSession(ses)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs"
                        title="Enviar Link por WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Enviar Link WhatsApp</span>
                      </button>

                      <a
                        href={ses.meetLink || settings.defaultOnlineLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Meet</span>
                      </a>
                    </div>
                  </div>
                );
              })}

              {/* Tarefas de Prontuários Pendentes */}
              {(activeTaskCategory === 'all' || activeTaskCategory === 'records') && pendingRecords.map((ses) => (
                <div 
                  key={`rec-${ses.id}`}
                  className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-50/40 transition-colors ${isPrivacyMode ? 'privacy-blur' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                      <FileEdit className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Evolução Clínica Pendente (CFP 001/2009)
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          Atendimento de {ses.date.slice(8, 10)}/{ses.date.slice(5, 7)}
                        </span>
                      </div>
                      <div className="mt-1 font-bold text-sm text-slate-900">
                        {ses.patientName} • Sessão Realizada
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => setRecordSession(ses)}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Preencher Prontuário Agora</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Tarefas de Cobrança / PIX */}
              {(activeTaskCategory === 'all' || activeTaskCategory === 'payments') && pendingPayments.map((ses) => {
                const patient = patients.find(p => p.id === ses.patientId);
                return (
                  <div 
                    key={`pay-${ses.id}`}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-emerald-50/40 transition-colors ${isPrivacyMode ? 'privacy-blur' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Honorário Pendente: R$ {ses.price}
                          </span>
                          <span className="text-xs font-semibold text-slate-700">
                            Sessão {ses.date.slice(8, 10)}/{ses.date.slice(5, 7)}
                          </span>
                        </div>
                        <div className="mt-1 font-bold text-sm text-slate-900">
                          {ses.patientName}
                          {patient?.emergencyContact?.name && (
                            <span className="text-[11px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded ml-2 font-medium border border-purple-200">
                              👥 Cobrar Responsável: {patient.emergencyContact.name} ({patient.emergencyContact.phone})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => setWhatsAppSession(ses)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                        title="Enviar dados do PIX e lembrete de pagamento no WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Cobrança Amigável PIX</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Grid Principal: Sessões do Dia & Painel Lista de Espera */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Atendimentos de Hoje */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                <h3 className="font-bold text-sm text-slate-800">Sessões Programadas para Hoje</h3>
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                  {todaySessions.length}
                </span>
              </div>
              <button
                onClick={() => navigateTo('schedule')}
                className="text-xs text-brand-700 hover:text-brand-800 font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Ver Agenda Completa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {todaySessions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-medium text-slate-700">Nenhum atendimento agendado para hoje.</p>
                  <p className="text-xs text-slate-400">Aproveite para organizar prontuários ou contatar a lista de espera.</p>
                </div>
              ) : (
                todaySessions.map((ses) => {
                  const patient = patients.find(p => p.id === ses.patientId);
                  return (
                    <div 
                      key={ses.id} 
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors ${isPrivacyMode ? 'privacy-blur' : ''}`}
                    >
                      {/* Info do Atendimento */}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-slate-800">{ses.startTime}</span>
                          <span className="text-[10px] text-slate-500">{ses.endTime}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 
                              onClick={() => navigateTo('patient-detail', ses.patientId)}
                              className="font-semibold text-sm text-slate-900 hover:text-brand-600 cursor-pointer transition-colors"
                            >
                              {ses.patientName}
                            </h4>
                            {getStatusBadge(ses.status)}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              {ses.modality === 'online' ? (
                                <>
                                  <Video className="w-3 h-3 text-blue-500" />
                                  <span className="text-blue-700 font-medium">Online (Meet)</span>
                                </>
                              ) : (
                                <>
                                  <MapPin className="w-3 h-3 text-emerald-500" />
                                  <span>Presencial</span>
                                </>
                              )}
                            </span>
                            <span>•</span>
                            <span>R$ {ses.price}</span>
                            <span>•</span>
                            <span className={ses.paymentStatus === 'paid' ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                              {ses.paymentStatus === 'paid' ? '✓ Pago' : '⏳ Pendente'}
                            </span>
                            {patient?.emergencyContact?.name && (
                              <span className="text-[11px] text-purple-600 font-medium">
                                • Resp: {patient.emergencyContact.name.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações Rápidas */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        {/* WhatsApp Lembrete / Mensagem com Suporte a Responsável */}
                        <button
                          onClick={() => setWhatsAppSession(ses)}
                          title="Enviar lembrete ou confirmação pelo WhatsApp"
                          className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        {/* Link Google Meet se for online */}
                        {ses.modality === 'online' && (
                          <a
                            href={ses.meetLink || settings.defaultOnlineLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Entrar na sala virtual do Google Meet"
                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        {/* Evolução de Prontuário */}
                        <button
                          onClick={() => setRecordSession(ses)}
                          title={ses.hasRecord ? "Ver/Editar Prontuário registrado" : "Registrar Prontuário desta sessão"}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            ses.hasRecord
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                              : 'bg-brand-600 hover:bg-brand-700 text-white shadow-2xs'
                          }`}
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          <span>{ses.hasRecord ? 'Prontuário OK' : 'Evoluir'}</span>
                        </button>

                        {/* Status Rápido de Presença */}
                        {ses.status !== 'completed' && (
                          <button
                            onClick={() => updateSessionStatus(ses.id, 'completed')}
                            title="Marcar sessão como Realizada"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* LUGAR DEDICADO: CARD DE LISTA DE ESPERA NO DASHBOARD */}
          {/* ======================================================== */}
          <div className="bg-white rounded-2xl border border-purple-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-purple-100 bg-purple-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-600 text-white rounded-lg">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-purple-950">
                  Lista de Espera & Encaixes Rápidos ({waitingListPatients.length})
                </h3>
              </div>
              <button
                onClick={() => navigateTo('patients')}
                className="text-xs text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1"
              >
                <span>Gerenciar Fila</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-purple-50">
              {waitingListPatients.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  <p className="text-xs font-medium">Nenhum paciente aguardando vaga no momento.</p>
                </div>
              ) : (
                waitingListPatients.map((p) => (
                  <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-purple-50/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span 
                          onClick={() => navigateTo('patient-detail', p.id)}
                          className="font-bold text-sm text-slate-900 hover:text-purple-700 cursor-pointer"
                        >
                          {p.name}
                        </span>
                        {p.isPreRegistration ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Pré-Cadastro WhatsApp</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            Aguardando
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                        <span>Horário: <strong>{p.usualSchedule || 'A combinar'}</strong></span>
                        <span>•</span>
                        <span className="capitalize">Modalidade: <strong>{p.preferredModality}</strong></span>
                        <span>•</span>
                        <span>Tel: {p.phone}</span>
                        {p.emergencyContact?.name && (
                          <span className="text-purple-700 font-medium">
                            (Resp: {p.emergencyContact.name})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {p.isPreRegistration && (
                        <button
                          onClick={() => openReviewPatient(p)}
                          className="px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Conferir todos os dados informados pelo paciente no pré-cadastro"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Conferir Ficha</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setWhatsAppSession({
                            id: `adhoc-${p.id}`,
                            patientId: p.id,
                            patientName: p.name,
                            patientPhone: p.phone,
                            date: todayIso,
                            startTime: '14:00',
                            endTime: '14:50',
                            modality: p.preferredModality,
                            status: 'scheduled',
                            price: p.agreedPrice,
                            paymentStatus: 'pending',
                            hasRecord: false,
                            createdAt: new Date().toISOString()
                          });
                        }}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chamar WhatsApp</span>
                      </button>

                      <button
                        onClick={() => openNewSessionModal(p.id)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Encaixar na Agenda</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Coluna 3: Gráficos & Distribuição */}
        <div className="space-y-6">
          {/* Gráfico de Modalidade */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
              Modalidade dos Atendimentos
            </h3>
            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modalityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {modalityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-brand-600"></div>
                <span className="text-slate-600">Presencial ({modalityData[0].value})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-slate-600">Online ({modalityData[1].value})</span>
              </div>
            </div>
          </div>

          {/* Atividade Semanal */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
              Ocupação da Semana
            </h3>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyDistribution}>
                  <XAxis dataKey="dia" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="realizadas" fill="#0d9488" radius={[4, 4, 0, 0]} name="Realizadas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Média: 4 sessões/dia</span>
              <span className="text-brand-600 font-semibold">Ocupação Saudável</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modais Integrados (com Suporte a Responsável no WhatsApp) */}
      {whatsAppSession && (
        <WhatsAppModal
          isOpen={Boolean(whatsAppSession)}
          onClose={() => setWhatsAppSession(null)}
          patientName={whatsAppSession.patientName}
          patientPhone={whatsAppSession.patientPhone}
          emergencyContact={patients.find(p => p.id === whatsAppSession.patientId)?.emergencyContact}
          sessionDate={whatsAppSession.date}
          sessionTime={whatsAppSession.startTime}
          endTime={whatsAppSession.endTime}
          modality={whatsAppSession.modality}
          meetLink={whatsAppSession.meetLink}
          amount={whatsAppSession.price}
        />
      )}

      {recordSession && (
        <SessionRecordModal
          isOpen={Boolean(recordSession)}
          onClose={() => setRecordSession(null)}
          patientId={recordSession.patientId}
          patientName={recordSession.patientName}
          sessionId={recordSession.id}
          sessionDate={recordSession.date}
          modality={recordSession.modality}
        />
      )}
    </div>
  );
};
