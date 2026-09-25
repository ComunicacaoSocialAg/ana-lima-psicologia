import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  CalendarDays,
  Columns3,
  List as ListIcon,
  LayoutGrid,
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Video, 
  MapPin, 
  MessageSquare, 
  FileEdit, 
  CheckCircle2, 
  Clock, 
  Filter,
  ExternalLink,
  Edit,
  Trash2,
  UserCheck,
  X,
  Phone,
  DollarSign,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Session, SessionStatus, Modality } from '../../types';
import { WhatsAppModal } from '../common/WhatsAppModal';
import { SessionRecordModal } from '../clinical/SessionRecordModal';
import { SessionModal } from './SessionModal';

interface ScheduleViewProps {
  onNewSessionClick: () => void;
}

export type ScheduleViewMode = 'calendar' | 'kanban' | 'list' | 'cards';

export const ScheduleView: React.FC<ScheduleViewProps> = ({ onNewSessionClick }) => {
  const { 
    sessions, 
    patients, 
    updateSessionStatus, 
    deleteSession, 
    navigateTo, 
    isPrivacyMode, 
    settings 
  } = useApp();

  const [viewMode, setViewMode] = useState<ScheduleViewMode>('cards');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [filterModality, setFilterModality] = useState<'all' | Modality>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | SessionStatus>('all');
  const [showWaitingList, setShowWaitingList] = useState(false);

  // Kanban view scope: apenas o dia selecionado ou a semana inteira
  const [kanbanScope, setKanbanScope] = useState<'day' | 'week'>('day');

  // Modals state
  const [whatsAppSession, setWhatsAppSession] = useState<Session | null>(null);
  const [recordSession, setRecordSession] = useState<Session | null>(null);
  const [editSession, setEditSession] = useState<Session | null>(null);

  // Navegação de dias
  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  // Pacientes em fila de espera
  const waitingPatients = useMemo(() => {
    return patients.filter(p => p.status === 'waiting_list');
  }, [patients]);

  // Filtro de sessões para o dia selecionado
  const filteredDaySessions = useMemo(() => {
    return sessions
      .filter(s => s.date === selectedDate)
      .filter(s => filterModality === 'all' || s.modality === filterModality)
      .filter(s => filterStatus === 'all' || s.status === filterStatus)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [sessions, selectedDate, filterModality, filterStatus]);

  // Cálculo de intervalo da semana do dia selecionado
  const weekRange = useMemo(() => {
    const curr = new Date(selectedDate + 'T12:00:00');
    const firstDay = new Date(curr);
    firstDay.setDate(curr.getDate() - curr.getDay()); // Domingo
    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6); // Sábado

    const startIso = firstDay.toISOString().slice(0, 10);
    const endIso = lastDay.toISOString().slice(0, 10);
    return { startIso, endIso, firstDay };
  }, [selectedDate]);

  // Sessões da semana para Kanban Semanal
  const filteredWeekSessions = useMemo(() => {
    return sessions
      .filter(s => s.date >= weekRange.startIso && s.date <= weekRange.endIso)
      .filter(s => filterModality === 'all' || s.modality === filterModality)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  }, [sessions, weekRange, filterModality]);

  // Mapeamento de sessões por data (para o modo calendário)
  const sessionsByDate = useMemo(() => {
    const map: Record<string, Session[]> = {};
    sessions.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [sessions]);

  // Dados do mês para o Calendário
  const calendarMonthData = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    const year = d.getFullYear();
    const month = d.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

    // Dias do mês anterior para preencher a primeira semana
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, dayNum, 12);
      days.push({
        dateStr: prevDate.toISOString().slice(0, 10),
        dayNumber: dayNum,
        isCurrentMonth: false,
      });
    }

    // Dias do mês corrente
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const curDate = new Date(year, month, dayNum, 12);
      days.push({
        dateStr: curDate.toISOString().slice(0, 10),
        dayNumber: dayNum,
        isCurrentMonth: true,
      });
    }

    // Dias do próximo mês para fechar semanas completas (múltiplos de 7)
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let dayNum = 1; dayNum <= remainingDays; dayNum++) {
        const nextDate = new Date(year, month + 1, dayNum, 12);
        days.push({
          dateStr: nextDate.toISOString().slice(0, 10),
          dayNumber: dayNum,
          isCurrentMonth: false,
        });
      }
    }

    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d);

    return { days, monthName, year, month };
  }, [selectedDate]);

  const formattedDateTitle = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(selectedDate + 'T12:00:00'));

  const getStatusBadge = (status: SessionStatus) => {
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
      {/* Barra de Controle Superior: Alternador de Visualização & Ações */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        {/* Seletor de Modo de Visualização (Cards, Lista, Kanban, Calendário) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'cards' 
                  ? 'bg-white text-brand-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Modo Cards Visuais"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list' 
                  ? 'bg-white text-brand-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Modo Lista Tabular"
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'kanban' 
                  ? 'bg-white text-brand-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Modo Kanban por Status"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'calendar' 
                  ? 'bg-white text-brand-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Modo Calendário Mensal"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendário</span>
            </button>
          </div>

          {/* Botão de Acesso Rápido à Lista de Espera */}
          <button
            type="button"
            onClick={() => setShowWaitingList(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-xl transition-colors shrink-0"
            title="Ver e gerenciar pacientes aguardando vaga"
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Lista de Espera ({waitingPatients.length})</span>
          </button>
        </div>

        {/* Navegador de Data & Filtros */}
        <div className="flex flex-wrap items-center justify-between xl:justify-end gap-2">
          {/* Navegação de Data */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
            <button
              onClick={handlePrevDay}
              className="p-1 hover:bg-white text-slate-600 rounded-lg transition-colors"
              title="Dia anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-white rounded-lg transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={handleNextDay}
              className="p-1 hover:bg-white text-slate-600 rounded-lg transition-colors"
              title="Próximo dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 shrink-0"
          />

          {/* Filtros Modalidade & Status */}
          <select
            value={filterModality}
            onChange={(e) => setFilterModality(e.target.value as any)}
            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Todas Modalidades</option>
            <option value="presencial">🏢 Presencial</option>
            <option value="online">💻 Online</option>
          </select>

          {viewMode !== 'kanban' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Todos os Status</option>
              <option value="scheduled">Agendadas</option>
              <option value="confirmed">Confirmadas</option>
              <option value="completed">Realizadas</option>
              <option value="missed_chargeable">Faltas c/ Cobrança</option>
              <option value="missed_non_chargeable">Faltas Justificadas</option>
            </select>
          )}

          {/* Botão Nova Sessão */}
          <button
            onClick={onNewSessionClick}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Sessão</span>
          </button>
        </div>
      </div>

      {/* Subtítulo com Data Formatada */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider capitalize">
          📅 {formattedDateTitle}
        </span>
        <span className="text-xs text-slate-500">
          Total de sessões nesta data: <strong className="text-slate-800">{filteredDaySessions.length}</strong>
        </span>
      </div>

      {/* ======================================================== */}
      {/* 1. MODO CARDS (Visual Rico e Espaçoso) */}
      {/* ======================================================== */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          {filteredDaySessions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-700">Nenhum atendimento agendado para esta data.</p>
              <button
                onClick={onNewSessionClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agendar sessão para este dia</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDaySessions.map((ses) => {
                const patient = patients.find(p => p.id === ses.patientId);
                return (
                  <div
                    key={ses.id}
                    className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-all space-y-3.5 flex flex-col justify-between ${isPrivacyMode ? 'privacy-blur' : ''}`}
                  >
                    <div className="space-y-2.5">
                      {/* Topo do Card: Horário e Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-brand-400" />
                            <span>{ses.startTime} - {ses.endTime}</span>
                          </div>
                          {ses.modality === 'online' ? (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              <Video className="w-3 h-3" />
                              <span>Online</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <MapPin className="w-3 h-3" />
                              <span>Presencial</span>
                            </span>
                          )}
                        </div>
                        {getStatusBadge(ses.status)}
                      </div>

                      {/* Dados do Paciente */}
                      <div>
                        <h4
                          onClick={() => navigateTo('patient-detail', ses.patientId)}
                          className="font-bold text-sm text-slate-900 hover:text-brand-600 cursor-pointer transition-colors"
                        >
                          {ses.patientName}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tel: {ses.patientPhone || 'Não informado'}
                          {patient?.emergencyContact?.name && (
                            <span className="text-[11px] text-purple-600 ml-1.5 font-medium">
                              (Resp: {patient.emergencyContact.name.split(' ')[0]})
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Honorários & Pagamento */}
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                        <span className="font-semibold text-slate-700">R$ {ses.price}</span>
                        <span className={ses.paymentStatus === 'paid' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                          {ses.paymentStatus === 'paid' ? '✓ Pago' : '⏳ Pendente'}
                        </span>
                      </div>

                      {ses.notes && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                          "{ses.notes}"
                        </p>
                      )}
                    </div>

                    {/* Barra de Ações do Card */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1">
                        {/* WhatsApp (com suporte a Paciente e Responsável) */}
                        <button
                          onClick={() => setWhatsAppSession(ses)}
                          title="Enviar WhatsApp (Paciente ou Responsável)"
                          className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        {/* Meet se for online */}
                        {ses.modality === 'online' && (
                          <a
                            href={ses.meetLink || settings.defaultOnlineLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Entrar no Google Meet"
                            className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        {/* Evolução de Prontuário */}
                        <button
                          onClick={() => setRecordSession(ses)}
                          title={ses.hasRecord ? 'Ver Prontuário' : 'Registrar Prontuário'}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            ses.hasRecord
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                              : 'bg-brand-600 hover:bg-brand-700 text-white'
                          }`}
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          <span>{ses.hasRecord ? 'Prontuário ✓' : 'Evoluir'}</span>
                        </button>
                      </div>

                      {/* Transição de Status Rápida */}
                      <div className="flex items-center gap-1">
                        {ses.status !== 'completed' && (
                          <button
                            onClick={() => updateSessionStatus(ses.id, 'completed')}
                            title="Marcar como Realizada"
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setEditSession(ses)}
                          title="Editar agendamento"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir agendamento de ${ses.patientName}?`)) {
                              deleteSession(ses.id);
                            }
                          }}
                          title="Excluir"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MODO LISTA (Tabela Detalhada e Densa) */}
      {/* ======================================================== */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Horário</th>
                  <th className="py-3 px-4">Paciente & Contato</th>
                  <th className="py-3 px-4">Modalidade</th>
                  <th className="py-3 px-4">Status da Sessão</th>
                  <th className="py-3 px-4">Honorários</th>
                  <th className="py-3 px-4">Prontuário (CFP)</th>
                  <th className="py-3 px-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDaySessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      Nenhum atendimento agendado para esta data.
                    </td>
                  </tr>
                ) : (
                  filteredDaySessions.map((ses) => {
                    const patient = patients.find(p => p.id === ses.patientId);
                    return (
                      <tr 
                        key={ses.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${isPrivacyMode ? 'privacy-blur' : ''}`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {ses.startTime} - {ses.endTime}
                        </td>
                        <td className="py-3 px-4">
                          <div 
                            onClick={() => navigateTo('patient-detail', ses.patientId)}
                            className="font-bold text-slate-900 hover:text-brand-600 cursor-pointer"
                          >
                            {ses.patientName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {ses.patientPhone}
                            {patient?.emergencyContact?.name && (
                              <span className="text-purple-600 ml-1 font-medium">
                                • Resp: {patient.emergencyContact.name.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {ses.modality === 'online' ? (
                            <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                              <Video className="w-3.5 h-3.5 text-blue-500" />
                              <span>Online</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Presencial</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <select
                            value={ses.status}
                            onChange={(e) => updateSessionStatus(ses.id, e.target.value as SessionStatus)}
                            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          >
                            <option value="scheduled">Agendada</option>
                            <option value="confirmed">Confirmada</option>
                            <option value="completed">Realizada</option>
                            <option value="missed_chargeable">Falta Cobrada</option>
                            <option value="missed_non_chargeable">Falta Justificada</option>
                            <option value="canceled">Cancelada</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">R$ {ses.price}</span>
                          <span className={`ml-2 text-[10px] font-bold ${ses.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {ses.paymentStatus === 'paid' ? '✓ Pago' : '⏳ Pendente'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            onClick={() => setRecordSession(ses)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                              ses.hasRecord
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                : 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200'
                            }`}
                          >
                            <FileEdit className="w-3 h-3" />
                            <span>{ses.hasRecord ? 'Evolução OK' : 'Evoluir'}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setWhatsAppSession(ses)}
                              title="Enviar WhatsApp"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            {ses.modality === 'online' && (
                              <a
                                href={ses.meetLink || settings.defaultOnlineLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Entrar no Meet"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => setEditSession(ses)}
                              title="Editar"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Excluir agendamento de ${ses.patientName}?`)) {
                                  deleteSession(ses.id);
                                }
                              }}
                              title="Excluir"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MODO KANBAN (Colunas por Status com Ações Rápidas) */}
      {/* ======================================================== */}
      {viewMode === 'kanban' && (
        <div className="space-y-4">
          {/* Seletor de Escopo do Kanban (Dia vs Semana) */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Visualizando no Kanban:</span>
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setKanbanScope('day')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    kanbanScope === 'day' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dia ({selectedDate.slice(8, 10)}/{selectedDate.slice(5, 7)})
                </button>
                <button
                  onClick={() => setKanbanScope('week')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    kanbanScope === 'week' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semana Inteira ({weekRange.startIso.slice(8, 10)} a {weekRange.endIso.slice(8, 10)})
                </button>
              </div>
            </div>

            <span className="text-xs text-slate-500">
              Mude o status de qualquer atendimento com 1 clique nos botões do cartão.
            </span>
          </div>

          {/* 4 Colunas Kanban */}
          {(() => {
            const currentList = kanbanScope === 'day' ? filteredDaySessions : filteredWeekSessions;
            const scheduledCol = currentList.filter(s => s.status === 'scheduled');
            const confirmedCol = currentList.filter(s => s.status === 'confirmed');
            const completedCol = currentList.filter(s => s.status === 'completed');
            const missedCol = currentList.filter(s => ['missed_chargeable', 'missed_non_chargeable', 'canceled'].includes(s.status));

            const columns = [
              { id: 'scheduled', title: 'Agendadas', color: 'border-slate-400', badge: 'bg-slate-100 text-slate-800', list: scheduledCol },
              { id: 'confirmed', title: 'Confirmadas', color: 'border-blue-500', badge: 'bg-blue-100 text-blue-800', list: confirmedCol },
              { id: 'completed', title: 'Realizadas', color: 'border-emerald-500', badge: 'bg-emerald-100 text-emerald-800', list: completedCol },
              { id: 'missed', title: 'Faltas & Canceladas', color: 'border-rose-400', badge: 'bg-rose-100 text-rose-800', list: missedCol },
            ];

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                {columns.map((col) => (
                  <div key={col.id} className="bg-slate-50/80 rounded-2xl border border-slate-200 p-3 space-y-3">
                    {/* Header da Coluna */}
                    <div className={`flex items-center justify-between pb-2 border-b-2 ${col.color}`}>
                      <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                        {col.title}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                        {col.list.length}
                      </span>
                    </div>

                    {/* Lista de Cards da Coluna */}
                    <div className="space-y-2.5 min-h-[250px]">
                      {col.list.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8 italic">
                          Nenhum atendimento
                        </p>
                      ) : (
                        col.list.map((ses) => (
                          <div
                            key={ses.id}
                            className={`bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 hover:border-slate-300 transition-all ${isPrivacyMode ? 'privacy-blur' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">
                                {kanbanScope === 'week' && `${ses.date.slice(8, 10)}/${ses.date.slice(5, 7)} • `}
                                {ses.startTime}
                              </span>
                              {ses.modality === 'online' ? (
                                <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                  💻 Online
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  🏢 Presencial
                                </span>
                              )}
                            </div>

                            <div 
                              onClick={() => navigateTo('patient-detail', ses.patientId)}
                              className="font-bold text-xs text-slate-900 hover:text-brand-600 cursor-pointer"
                            >
                              {ses.patientName}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                              <span>R$ {ses.price}</span>
                              <span className={ses.paymentStatus === 'paid' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                                {ses.paymentStatus === 'paid' ? '✓ Pago' : '⏳ Pendente'}
                              </span>
                            </div>

                            {/* Botões Rápidos de Transição de Status no Kanban */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                              <button
                                onClick={() => setWhatsAppSession(ses)}
                                title="Enviar WhatsApp"
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              {col.id === 'scheduled' && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => updateSessionStatus(ses.id, 'confirmed')}
                                    className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-bold transition-colors"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    onClick={() => updateSessionStatus(ses.id, 'missed_chargeable')}
                                    className="px-1.5 py-0.5 text-rose-600 hover:bg-rose-50 rounded text-[10px] font-bold"
                                  >
                                    Falta
                                  </button>
                                </div>
                              )}

                              {col.id === 'confirmed' && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => updateSessionStatus(ses.id, 'completed')}
                                    className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold transition-colors"
                                  >
                                    ✓ Realizada
                                  </button>
                                  <button
                                    onClick={() => updateSessionStatus(ses.id, 'missed_non_chargeable')}
                                    className="px-1.5 py-0.5 text-amber-600 hover:bg-amber-50 rounded text-[10px] font-bold"
                                  >
                                    Falta
                                  </button>
                                </div>
                              )}

                              {col.id === 'completed' && (
                                <button
                                  onClick={() => setRecordSession(ses)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${
                                    ses.hasRecord
                                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                      : 'bg-brand-600 hover:bg-brand-700 text-white'
                                  }`}
                                >
                                  <FileEdit className="w-3 h-3" />
                                  <span>{ses.hasRecord ? 'Prontuário OK' : 'Evoluir'}</span>
                                </button>
                              )}

                              {col.id === 'missed' && (
                                <button
                                  onClick={() => updateSessionStatus(ses.id, 'scheduled')}
                                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold flex items-center gap-0.5"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Reabrir</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODO CALENDÁRIO (Grade Mensal Interativa) */}
      {/* ======================================================== */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          {/* Cabeçalho do Mês */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 capitalize">
              📅 {calendarMonthData.monthName}
            </h3>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const d = new Date(selectedDate + 'T12:00:00');
                  d.setMonth(d.getMonth() - 1);
                  setSelectedDate(d.toISOString().slice(0, 10));
                }}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-lg transition-colors"
              >
                Mês Atual
              </button>
              <button
                onClick={() => {
                  const d = new Date(selectedDate + 'T12:00:00');
                  d.setMonth(d.getMonth() + 1);
                  setSelectedDate(d.toISOString().slice(0, 10));
                }}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grade de Dias da Semana */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
          </div>

          {/* Grade de Dias do Mês */}
          <div className="grid grid-cols-7 gap-2">
            {calendarMonthData.days.map((day) => {
              const isSelected = day.dateStr === selectedDate;
              const isToday = day.dateStr === new Date().toISOString().slice(0, 10);
              const daySessions = sessionsByDate[day.dateStr] || [];

              return (
                <div
                  key={day.dateStr}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`min-h-[90px] p-2 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/30'
                      : day.isCurrentMonth
                      ? 'border-slate-200 hover:border-slate-300 bg-white'
                      : 'border-slate-100 bg-slate-50/50 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-brand-600 text-white shadow-xs'
                          : isSelected
                          ? 'text-brand-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {daySessions.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-brand-100 text-brand-800">
                        {daySessions.length}
                      </span>
                    )}
                  </div>

                  {/* Prévia de Sessões do Dia */}
                  <div className="space-y-1 mt-1">
                    {daySessions.slice(0, 2).map(s => (
                      <div
                        key={s.id}
                        className="text-[10px] truncate px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium"
                        title={`${s.startTime} - ${s.patientName}`}
                      >
                        {s.startTime} {s.patientName.split(' ')[0]}
                      </div>
                    ))}
                    {daySessions.length > 2 && (
                      <span className="text-[9px] text-slate-400 block text-right font-medium">
                        +{daySessions.length - 2} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Destaque das Sessões do Dia Selecionado Abaixo da Grade */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Atendimentos de {formattedDateTitle} ({filteredDaySessions.length})
              </h4>
              <button
                onClick={onNewSessionClick}
                className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agendar para este dia</span>
              </button>
            </div>

            {filteredDaySessions.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center bg-slate-50 rounded-xl border border-slate-100">
                Nenhuma sessão agendada para o dia selecionado.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredDaySessions.map(ses => (
                  <div
                    key={ses.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{ses.startTime}</span>
                        {getStatusBadge(ses.status)}
                      </div>
                      <div 
                        onClick={() => navigateTo('patient-detail', ses.patientId)}
                        className="font-semibold text-xs text-slate-800 hover:text-brand-600 cursor-pointer mt-0.5"
                      >
                        {ses.patientName}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setWhatsAppSession(ses)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setRecordSession(ses)}
                        className="p-1.5 text-brand-600 hover:bg-brand-100 rounded-lg transition-colors"
                        title="Prontuário"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. GAVETA MODAL: LISTA DE ESPERA (Pacientes Aguardando Vaga) */}
      {/* ======================================================== */}
      {showWaitingList && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Header da Lista de Espera */}
            <div className="bg-purple-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-purple-600/80 rounded-xl flex items-center justify-center shadow-inner">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Lista de Espera por Vagas</h3>
                  <p className="text-xs text-purple-200 mt-0.5">
                    Pacientes interessados aguardando horário compatível na clínica
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWaitingList(false)}
                className="p-1 rounded-lg text-purple-200 hover:text-white hover:bg-purple-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo da Lista de Espera */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {waitingPatients.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <UserCheck className="w-10 h-10 text-purple-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800">Nenhum paciente na fila de espera no momento.</p>
                  <p className="text-xs text-slate-400">
                    Ao cadastrar novos contatos ou interessados, marque o status como "Fila de Espera".
                  </p>
                </div>
              ) : (
                waitingPatients.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-purple-300 transition-all space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 
                            onClick={() => {
                              setShowWaitingList(false);
                              navigateTo('patient-detail', p.id);
                            }}
                            className="font-bold text-sm text-slate-900 hover:text-purple-700 cursor-pointer"
                          >
                            {p.name}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            Fila de Espera
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Telefone: <strong>{p.phone}</strong> • {p.email || 'Sem e-mail'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Chamar no WhatsApp */}
                        <button
                          onClick={() => {
                            setWhatsAppSession({
                              id: `adhoc-${p.id}`,
                              patientId: p.id,
                              patientName: p.name,
                              patientPhone: p.phone,
                              date: selectedDate,
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
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>

                        {/* Agendar Sessão */}
                        <button
                          onClick={() => {
                            setShowWaitingList(false);
                            onNewSessionClick();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agendar Vaga</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400">Modalidade:</span>{' '}
                        <strong className="capitalize">{p.preferredModality}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Horário Preferencial:</span>{' '}
                        <strong>{p.usualSchedule || 'Qualquer horário'}</strong>
                      </div>
                      {p.emergencyContact?.name && (
                        <div className="sm:col-span-2">
                          <span className="text-slate-400">Contato Responsável:</span>{' '}
                          <strong>{p.emergencyContact.name} ({p.emergencyContact.relationship || 'Contato'})</strong> • {p.emergencyContact.phone}
                        </div>
                      )}
                      {p.notes && (
                        <div className="sm:col-span-2 text-slate-500 italic">
                          Nota: "{p.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowWaitingList(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modais Globais */}
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

      {editSession && (
        <SessionModal
          isOpen={Boolean(editSession)}
          onClose={() => setEditSession(null)}
          sessionToEdit={editSession}
        />
      )}
    </div>
  );
};
