import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, RefreshCw, CheckCircle2, Share, MoreVertical } from 'lucide-react';
import { DandelionLogo } from './DandelionLogo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return typeof window !== 'undefined' && window.__deferredPwaPrompt ? window.__deferredPwaPrompt : null;
  });
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);

  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  useEffect(() => {
    // Verifica se já está rodando dentro da janela standalone do app instalado
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // Sincroniza caso o evento já tenha sido capturado pelo script no <head>
    if (window.__deferredPwaPrompt) {
      setDeferredPrompt(window.__deferredPwaPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__deferredPwaPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleCustomAvailable = () => {
      if (window.__deferredPwaPrompt) {
        setDeferredPrompt(window.__deferredPwaPrompt);
      }
    };

    const handleInstalled = () => {
      window.__deferredPwaPrompt = null;
      setDeferredPrompt(null);
      setShowInstallModal(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-install-available', handleCustomAvailable);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-install-available', handleCustomAvailable);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  if (isInstalled || isDismissed) return null;

  const handleInstallClick = async () => {
    const activePrompt = deferredPrompt || window.__deferredPwaPrompt;
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice.outcome === 'accepted') {
          window.__deferredPwaPrompt = null;
          setDeferredPrompt(null);
          setIsInstalled(true);
        }
      } catch (err) {
        console.warn('Erro ao disparar prompt nativo, abrindo guia visual:', err);
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const handleForceUpdateIconAndCache = async () => {
    setIsRefreshingCache(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.update()));
      }
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
    } catch (e) {
      console.warn('Erro ao limpar cache:', e);
    }
    window.location.reload();
  };

  return (
    <>
      <div className="bg-[#3f4a3d] text-[#F7F5F0] px-4 py-2.5 flex items-center justify-between gap-3 text-xs border-b border-[#F7F5F0]/15 shadow-xs shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <DandelionLogo size={32} className="rounded-xl shadow-sm" />
          <div className="truncate">
            <span className="font-bold text-[#F7F5F0] block truncate">
              App Ana Lima • Sistema Clínica & Agenda
            </span>
            <span className="text-[11px] text-[#F7F5F0]/80 hidden sm:inline">
              Instale o aplicativo nativo na tela inicial do seu Android, iPhone ou Computador
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F7F5F0] hover:bg-white active:scale-95 text-[#1C2B22] rounded-full font-bold text-[11px] shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar App</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="text-[#F7F5F0]/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal Estilo Google Play / Material 3 quando o prompt automático já foi usado ou no iOS */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Cabeçalho Google/Android Material 3 */}
            <div className="bg-gradient-to-br from-[#4b5849] via-[#3f4a3d] to-[#262e25] p-6 text-[#F7F5F0] relative">
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/35 text-[#F7F5F0] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-4">
                <DandelionLogo size={68} className="rounded-2xl shadow-lg ring-1 ring-white/20" />
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F7F5F0]/15 text-[#F7F5F0] mb-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                    Web App Oficial • Alta Resolução
                  </span>
                  <h3 className="text-lg font-bold text-white leading-tight">Ana Lima | Gestão Clínica</h3>
                  <p className="text-xs text-[#F7F5F0]/80 mt-0.5">CRP 04/60205 • Poços de Caldas, MG</p>
                </div>
              </div>
            </div>

            {/* Corpo de Instruções */}
            <div className="p-6 space-y-4 text-slate-700 text-xs">
              {isIOS ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                    <Smartphone className="w-4 h-4 text-[#3f4a3d]" />
                    Como instalar no iPhone / iPad:
                  </div>
                  <ol className="space-y-2 text-slate-600 list-decimal list-inside">
                    <li>
                      Toque no botão <strong>Compartilhar</strong>{' '}
                      <Share className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> na barra inferior do Safari.
                    </li>
                    <li>
                      Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.
                    </li>
                    <li>
                      Confirme em <strong>Adicionar</strong> no canto superior direito.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                    <Smartphone className="w-4 h-4 text-[#3f4a3d]" />
                    Instalar ou Atualizar no Android / Chrome:
                  </div>
                  <ol className="space-y-2 text-slate-600 list-decimal list-inside leading-relaxed">
                    <li>
                      Toque no menu de <strong>3 pontinhos</strong>{' '}
                      <MoreVertical className="w-3.5 h-3.5 inline text-slate-700" /> no canto superior direito do Chrome (ou no ícone de instalação na barra de endereço).
                    </li>
                    <li>
                      Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                    </li>
                  </ol>
                  <div className="mt-2 pt-2.5 border-t border-slate-200/80 text-[11px] text-amber-800 bg-amber-50/80 rounded-xl p-2.5">
                    <strong>Dica para atualizar o ícone novo:</strong> Se o app já estava instalado antes no aparelho, remova o atalho antigo da tela inicial, clique no botão abaixo para atualizar o cache e instale novamente com o novo visual Google/Android em alta definição!
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleForceUpdateIconAndCache}
                  disabled={isRefreshingCache}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3f4a3d] hover:bg-[#2f382d] text-[#F7F5F0] font-semibold text-xs shadow-sm transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingCache ? 'animate-spin' : ''}`} />
                  <span>{isRefreshingCache ? 'Atualizando Cache...' : 'Atualizar Ícone e Recarregar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowInstallModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
