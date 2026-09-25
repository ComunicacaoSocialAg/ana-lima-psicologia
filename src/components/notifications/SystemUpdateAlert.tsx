import React, { useEffect, useState, useCallback } from 'react';
import { Sparkles, CheckCircle2, X, BellRing } from 'lucide-react';
import {
  notificationService,
  SystemVersionInfo,
  requestNotificationPermission
} from '../../services/notificationService';
import { useApp } from '../../context/AppContext';
import { DandelionLogo } from '../common/DandelionLogo';

export const SystemUpdateAlert: React.FC = () => {
  const { openReviewPatient } = useApp();
  const [updateBanner, setUpdateBanner] = useState<SystemVersionInfo | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'granted'
  );

  const checkServerVersion = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const info: SystemVersionInfo = await res.json();
      if (!info || !info.version) return;

      const lastSeen = notificationService.getLastSeenVersion();

      if (!lastSeen) {
        // Primeiro acesso neste navegador: registra versão atual e emite aviso de boas-vindas da atualização ativa
        notificationService.setLastSeenVersion(info.version);
        notificationService.notifySystemUpdate(info);
        setUpdateBanner(info);
      } else if (lastSeen !== info.version) {
        // Nova atualização detectada!
        notificationService.setLastSeenVersion(info.version);
        notificationService.notifySystemUpdate(info);
        setUpdateBanner(info);
      }
    } catch {
      // Silencioso se estiver offline
    }
  }, []);

  useEffect(() => {
    checkServerVersion();

    const handleFocus = () => {
      checkServerVersion();
    };
    window.addEventListener('focus', handleFocus);

    // Escuta mensagens vindas do Service Worker (ex: SW_UPDATED ou clique na Notificação Nativa do Android)
    const handleSwMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg) return;

      if (msg.type === 'SW_UPDATED' && msg.version) {
        const info: SystemVersionInfo = {
          version: msg.version,
          buildId: msg.version,
          releasedAt: new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }).format(new Date()),
          notes: msg.notes || 'Nova atualização do sistema instalada automaticamente.'
        };
        notificationService.setLastSeenVersion(info.version);
        notificationService.notifySystemUpdate(info);
        setUpdateBanner(info);
      }

      if (msg.type === 'NOTIFICATION_CLICKED' && msg.data) {
        if (msg.data.type === 'intake_received' && msg.data.patientId) {
          openReviewPatient(msg.data.patientId);
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [checkServerVersion, openReviewPatient]);

  const handleEnableNativeAndroidAlerts = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted' && updateBanner) {
      notificationService.notifySystemUpdate(updateBanner);
    }
  };

  if (!updateBanner) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md animate-fade-in">
      <div className="bg-[#1C2B22] text-[#F7F5F0] rounded-2xl shadow-2xl border border-[#F7F5F0]/20 p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <DandelionLogo size={42} rounded="xl" className="shadow-md ring-1 ring-white/15 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Sparkles className="w-3 h-3" />
                Atualização Instalada • v{updateBanner.version}
              </span>
              <button
                type="button"
                onClick={() => setUpdateBanner(null)}
                className="text-[#F7F5F0]/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h4 className="text-sm font-bold text-white mt-1.5 leading-snug">
              Seu sistema recebeu uma nova atualização!
            </h4>
            <p className="text-xs text-[#F7F5F0]/85 mt-1 leading-relaxed">
              {updateBanner.notes}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
          {notifPermission !== 'granted' ? (
            <button
              type="button"
              onClick={handleEnableNativeAndroidAlerts}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1C2B22] font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Ativar Alertas Nativos do Android</span>
            </button>
          ) : (
            <span className="text-[11px] text-emerald-300 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Alertas nativos ativos neste aparelho
            </span>
          )}

          <button
            type="button"
            onClick={() => setUpdateBanner(null)}
            className="px-4 py-1.5 rounded-xl bg-[#F7F5F0] hover:bg-white text-[#1C2B22] font-bold text-xs transition-colors cursor-pointer shrink-0"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};
