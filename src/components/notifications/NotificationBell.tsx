import React, { useState, useEffect, useRef } from 'react';
import { Bell, Sparkles, Check, ExternalLink, Calendar, Volume2, Shield } from 'lucide-react';
import { notificationService, AppNotification, requestNotificationPermission, playNotificationChime } from '../../services/notificationService';
import { useApp } from '../../context/AppContext';

interface NotificationBellProps {
  onOpenPatientReview: (patientId: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onOpenPatientReview }) => {
  const { triggerNewIntakeAlert, patients } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => notificationService.getNotifications());
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }

    const refreshList = () => {
      setNotifications(notificationService.getNotifications());
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(Notification.permission);
      }
    };

    window.addEventListener('clinica-notifications-updated', refreshList);
    const interval = setInterval(refreshList, 2500);

    return () => {
      window.removeEventListener('clinica-notifications-updated', refreshList);
      clearInterval(interval);
    };
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (evt: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(evt.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    playNotificationChime();
  };

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead();
    setNotifications(notificationService.getNotifications());
  };

  const handleNotificationClick = (notif: AppNotification) => {
    notificationService.markAsRead(notif.id);
    setNotifications(notificationService.getNotifications());
    setIsOpen(false);
    if (notif.patientId) {
      onOpenPatientReview(notif.patientId);
    }
  };

  const handleSimulateAlert = () => {
    const existing = patients.find(p => p.isPreRegistration);
    const samplePatient = existing || {
      id: `pat-demo-${Date.now()}`,
      name: 'Mariana Duarte (Teste)',
      cpf: '123.456.789-00',
      birthDate: '1995-04-12',
      gender: 'Feminino',
      profession: 'Arquiteta',
      maritalStatus: 'Solteiro(a)',
      phone: '(35) 99876-5432',
      email: 'mariana.exemplo@gmail.com',
      address: 'Rua Assis Figueiredo, Centro - Poços de Caldas/MG',
      emergencyContact: {
        name: 'Carlos Duarte',
        relationship: 'Pai',
        phone: '(35) 99123-4567'
      },
      status: 'waiting_list',
      preferredModality: 'presencial',
      agreedPrice: 200,
      usualSchedule: 'Pref: Tarde (14h)',
      startDate: new Date().toISOString().slice(0, 10),
      referralSource: 'Pré-cadastro via WhatsApp',
      notes: 'Busca acolhimento para ansiedade e estresse no trabalho.',
      isPreRegistration: true,
      preRegistrationData: {
        submittedAt: new Date().toISOString(),
        consentLgpd: true,
        preferredShift: 'Tarde (13h às 18h)',
        initialComplaint: 'Tenho sentido muita ansiedade e sobrecarga profissional recentemente. Gostaria de iniciar acompanhamento terapêutico no consultório.'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    triggerNewIntakeAlert(samplePatient);
    setNotifications(notificationService.getNotifications());
    setIsOpen(false);
  };

  const formatTimeAgo = (isoDate: string) => {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;
    return new Date(isoDate).toLocaleDateString('pt-BR');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do Sino com Badge */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        title="Central de Avisos e Pré-Cadastros"
        className={`relative p-2 rounded-lg border transition-all ${
          isOpen
            ? 'bg-slate-100 text-slate-800 border-slate-300 ring-2 ring-brand-500/20'
            : unreadCount > 0
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
        }`}
      >
        <Bell className="w-4 h-4" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 sm:right-0 max-sm:fixed max-sm:top-16 max-sm:left-3 max-sm:right-3 max-sm:w-auto mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header do Popover */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-xs">Avisos do Consultório</h3>
              {unreadCount > 0 && (
                <span className="bg-emerald-500 text-slate-950 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                  {unreadCount} novo(s)
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-slate-300 hover:text-white font-medium transition-colors"
              >
                Limpar lidos
              </button>
            )}
          </div>

          {/* Banner de Ativação de Notificações do Sistema */}
          {permission !== 'granted' && (
            <div className="bg-amber-50 p-2.5 border-b border-amber-200/80 flex items-center justify-between gap-2 text-xs text-amber-900">
              <span className="text-[11px] leading-tight">
                Receba alertas sonoros e nativos na tela do celular ao chegar cadastro.
              </span>
              <button
                onClick={handleRequestPermission}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg shrink-0 transition-colors shadow-2xs"
              >
                Ativar Alertas
              </button>
            </div>
          )}

          {/* Lista de Notificações */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                <p className="font-medium text-slate-600">Nenhum aviso pendente</p>
                <p className="text-[11px] mt-0.5">Quando um paciente enviar o pré-cadastro, ele aparecerá aqui com alerta sonoro.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                    !notif.read ? 'bg-emerald-50/40' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    notif.type === 'intake_received'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    <Sparkles className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-800 truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-0.5 leading-snug line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      {notif.type === 'intake_received' ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span>Conferir & Agendar</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span>✨ Sistema Atualizado</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé com Testes Rápidos */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-center gap-3">
            <button
              onClick={() => playNotificationChime()}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1.5 transition-colors"
              title="Testar sinal sonoro de dois tons"
            >
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Testar som</span>
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={handleSimulateAlert}
              className="text-[11px] text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1.5 transition-colors"
              title="Simular chegada de novo pré-cadastro (som + toast + dados)"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>Simular aviso</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
