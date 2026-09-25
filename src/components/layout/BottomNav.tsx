import React from 'react';
import { LayoutDashboard, Calendar, Users, DollarSign, Settings } from 'lucide-react';
import { useApp, AppView } from '../../context/AppContext';

export const BottomNav: React.FC = () => {
  const { currentView, navigateTo } = useApp();

  const navItems: { id: AppView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'schedule', label: 'Agenda', icon: Calendar },
    { id: 'patients', label: 'Pacientes', icon: Users },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 pb-[env(safe-area-inset-bottom,0px)] shadow-lg">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id || (item.id === 'patients' && currentView === 'patient-detail');
          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
                isActive ? 'text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-brand-500/10' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
