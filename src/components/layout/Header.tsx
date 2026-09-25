import React from 'react';
import { Eye, EyeOff, Plus, Lock, Calendar as CalendarIcon, UserPlus, Cloud } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { DandelionLogo } from '../common/DandelionLogo';

interface HeaderProps {
  onNewSessionClick: () => void;
  onNewPatientClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewSessionClick, onNewPatientClick }) => {
  const { currentView, isPrivacyMode, togglePrivacyMode, lockApp, currentUser, syncStatus, openAuthModal, logout, openReviewPatient } = useApp();

  const getTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return { title: 'Painel Geral', shortTitle: 'Painel Geral', subtitle: 'Visão executiva do consultório e indicadores clínicos' };
      case 'schedule':
        return { title: 'Agenda de Atendimentos', shortTitle: 'Agenda', subtitle: 'Controle de sessões, confirmações e links de vídeo' };
      case 'patients':
      case 'patient-detail':
        return { title: 'Gestão de Pacientes', shortTitle: 'Pacientes', subtitle: 'Cadastros, anamneses, prontuários e escalas psicológicas' };
      case 'financial':
        return { title: 'Financeiro & Recibos', shortTitle: 'Financeiro', subtitle: 'Honorários, controle de pagamentos e emissão de PDFs' };
      case 'settings':
        return { title: 'Configurações do Consultório', shortTitle: 'Ajustes', subtitle: 'Dados profissionais, modelos de WhatsApp e backups' };
      default:
        return { title: 'Clínica Psicológica', shortTitle: 'Ana Lima', subtitle: 'Ana Lima' };
    }
  };

  const { title, shortTitle, subtitle } = getTitle();

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <header className="bg-white border-b border-slate-200 pt-[env(safe-area-inset-top,0px)] sticky top-0 z-30 shadow-2xs">
      <div className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        {/* Brand Logo + Title Area */}
        <div className="min-w-0 flex-1 flex items-center gap-2.5 sm:gap-3">
          <DandelionLogo 
            size={36} 
            variant="dark" 
            rounded="xl" 
            className="shadow-2xs border border-[#1C2B22]/10" 
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] sm:text-lg font-bold text-[#1C2B22] tracking-tight leading-tight truncate">
                <span className="sm:hidden">{shortTitle}</span>
                <span className="hidden sm:inline">{title}</span>
              </h2>
              <span className="hidden md:inline-flex items-center text-[10px] font-semibold bg-[#F7F5F0] text-[#1C2B22] px-1.5 py-0.5 rounded border border-[#1C2B22]/20 shrink-0">
                CRP 04/60205
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-500 truncate">{subtitle}</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Current Date Badge (Desktop only) */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-md">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="capitalize">{formattedDate}</span>
          </div>

          {/* Cloud Sync Status / Connect Button */}
          <button
            onClick={currentUser ? () => {
              if (window.confirm(`Conectado como ${currentUser.email || 'Ana Lima'}.\nDeseja desconectar a sincronização deste aparelho?`)) {
                logout();
              }
            } : openAuthModal}
            title={
              currentUser 
                ? `Nuvem Ativa: ${currentUser.email} (${syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Atualizando...' : 'Conectado'}). Clique para gerenciar.` 
                : 'Sincronização em Nuvem: Clique para conectar seu celular e PC'
            }
            className={`flex items-center gap-1.5 text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-lg border transition-all ${
              currentUser
                ? syncStatus === 'synced'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                  : 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-white text-slate-700 border-slate-300 hover:border-brand-500 hover:text-brand-600 shadow-2xs'
            }`}
          >
            {currentUser ? (
              <>
                <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500 ring-2 ring-emerald-300' : 'bg-amber-500 animate-ping'}`} />
                <span className="hidden sm:inline">Nuvem Conectada</span>
                <Cloud className="w-3.5 h-3.5 sm:hidden text-emerald-700" />
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Conectar Nuvem</span>
              </>
            )}
          </button>

          {/* Central de Notificações & Avisos de Pré-Cadastro */}
          <NotificationBell onOpenPatientReview={(id) => openReviewPatient(id)} />

          {/* Privacy Mode Toggle */}
          <button
            onClick={togglePrivacyMode}
            title={isPrivacyMode ? "Desativar Modo Privacidade (reexibir prontuários)" : "Ativar Modo Privacidade (desfocar nomes e notas confidenciais)"}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border transition-all ${
              isPrivacyMode
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {isPrivacyMode ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="hidden sm:inline">Privacidade</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="hidden md:inline">Privacidade</span>
              </>
            )}
          </button>

          {/* Fast Action: Novo Paciente (tablet/desktop) */}
          <button
            onClick={onNewPatientClick}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 rounded-lg transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-600" />
            <span>Novo Paciente</span>
          </button>

          {/* Fast Action: Nova Sessão */}
          <button
            onClick={onNewSessionClick}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs">Agendar</span>
            <span className="hidden sm:inline">Sessão</span>
          </button>

          {/* Quick Lock */}
          <button
            onClick={lockApp}
            title="Bloquear aplicativo por segurança"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors shrink-0"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
