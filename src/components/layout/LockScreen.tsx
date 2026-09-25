import React, { useState } from 'react';
import { Lock, ArrowRight, Shield, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DandelionLogo } from '../common/DandelionLogo';

export const LockScreen: React.FC = () => {
  const { settings, unlockApp } = useApp();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(false);

  const expectedPin = (settings.lockPin || '1234').trim();
  const isDefaultPin = expectedPin === '1234';

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === expectedPin) {
      setPin('');
      setError(false);
      unlockApp();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1C2B22]/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-[#F7F5F0]/15 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
        <div className="relative inline-block mb-4">
          <DandelionLogo 
            size={80} 
            variant="light" 
            rounded="full" 
            className="mx-auto ring-4 ring-[#F7F5F0]/25 shadow-lg"
          />
          <div className="w-6 h-6 bg-[#1C2B22] text-[#F7F5F0] border border-[#F7F5F0]/30 rounded-full flex items-center justify-center absolute bottom-0 right-0 shadow">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        <h3 className="text-lg font-semibold text-white">{settings.psychologistName}</h3>
        <p className="text-xs text-brand-400 font-medium">CRP {settings.crp} | Sessão Protegida</p>
        <p className="text-xs text-slate-400 mt-2 mb-6">
          O sistema foi bloqueado por segurança para proteger o sigilo dos prontuários.
        </p>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              placeholder="Digite seu PIN ou senha..."
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (error) setError(false);
              }}
              autoFocus
              className={`w-full px-4 py-3 pr-10 bg-slate-800/80 border rounded-xl text-white placeholder-slate-500 text-center text-sm tracking-widest focus:outline-none focus:ring-2 transition-all ${
                error
                  ? 'border-rose-500 focus:ring-rose-500'
                  : 'border-slate-700 focus:ring-brand-500'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              tabIndex={-1}
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-rose-400 font-medium">
              Senha ou PIN incorreto. Tente novamente.
            </p>
          )}

          {isDefaultPin && !error && (
            <p className="text-[11px] text-slate-400">
              PIN inicial padrão: <strong className="text-slate-200">1234</strong> (altere em Configurações &gt; Segurança).
            </p>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium text-sm transition-colors shadow-sm"
          >
            <span>Desbloquear Acesso</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <Shield className="w-3.5 h-3.5 text-brand-500" />
          <span>Conformidade com a LGPD e Código de Ética do CFP</span>
        </div>
      </div>
    </div>
  );
};
