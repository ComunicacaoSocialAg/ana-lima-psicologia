import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  DollarSign, 
  Settings, 
  Download, 
  Lock, 
  ShieldCheck
} from 'lucide-react';
import { useApp, AppView } from '../../context/AppContext';
import { DandelionLogo } from '../common/DandelionLogo';

export const Sidebar: React.FC = () => {
  const { currentView, navigateTo, settings, triggerBackup, lockApp } = useApp();

  const navItems: { id: AppView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schedule', label: 'Agenda & Sessões', icon: Calendar },
    { id: 'patients', label: 'Pacientes & Prontuários', icon: Users },
    { id: 'financial', label: 'Financeiro & Recibos', icon: DollarSign },
    { id: 'settings', label: 'Configurações & Backup', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex w-64 bg-[#1C2B22] text-[#F7F5F0] flex-col shrink-0 h-screen sticky top-0 border-r border-[#F7F5F0]/10 select-none">
      {/* Brand & Profile Header */}
      <div className="p-5 border-b border-[#F7F5F0]/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <DandelionLogo 
              size={48} 
              variant="light" 
              rounded="2xl" 
              className="shadow-md ring-2 ring-[#F7F5F0]/25" 
            />
            <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#1C2B22] absolute -bottom-0.5 -right-0.5"></div>
          </div>
          <div className="overflow-hidden">
            <h1 className="font-semibold text-white truncate text-base leading-tight">
              {settings.psychologistName}
            </h1>
            <p className="text-xs text-brand-400 font-medium mt-0.5">
              CRP {settings.crp}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              Psicologia Clínica
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id || (item.id === 'patients' && currentView === 'patient-detail');
          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Security & Backup Footer */}
      <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/40">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 py-1">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
            <span>LGPD / CFP Ativo</span>
          </span>
          <span className="text-emerald-400 font-medium">Seguro</span>
        </div>

        <button
          onClick={triggerBackup}
          title="Baixar backup completo de todos os prontuários e dados em JSON"
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 rounded-md border border-slate-700/60 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-brand-400" />
          <span>Backup em 1 Clique</span>
        </button>

        <button
          onClick={lockApp}
          title="Bloquear a tela imediatamente"
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded transition-colors"
        >
          <Lock className="w-3 h-3" />
          <span>Bloquear Tela</span>
        </button>
      </div>
    </aside>
  );
};
