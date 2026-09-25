import React, { useState, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Download, 
  Upload, 
  ShieldCheck, 
  MessageSquare, 
  User, 
  Building, 
  Video, 
  Check, 
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Database,
  History,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ClinicSettings, WhatsAppTemplates } from '../../types';
import { getAutomatedSnapshots, RedundantSnapshot, exportCompleteBackup } from '../../services/backupService';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, lockApp, triggerBackup, restoreFromBackupString, restoreSnapshot } = useApp();

  const [psychologistName, setPsychologistName] = useState(settings.psychologistName);
  const [crp, setCrp] = useState(settings.crp);
  const [cpf, setCpf] = useState(settings.cpf);
  const [email, setEmail] = useState(settings.email);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [pixKey, setPixKey] = useState(settings.pixKey);
  const [bankDetails, setBankDetails] = useState(settings.bankDetails);
  const [defaultOnlineLink, setDefaultOnlineLink] = useState(settings.defaultOnlineLink);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(settings.idleTimeoutMinutes);

  // Estado para cadastro / alteração de PIN ou Senha de Bloqueio
  const activePin = (settings.lockPin || '1234').trim();
  const isDefaultPin = activePin === '1234';
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [pinFeedback, setPinFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [whatsAppTemplates, setWhatsAppTemplates] = useState<WhatsAppTemplates>(settings.whatsAppTemplates);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [snapshots, setSnapshots] = useState<RedundantSnapshot[]>(() => getAutomatedSnapshots());
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshSnapshots = () => {
    setSnapshots(getAutomatedSnapshots());
  };

  const handleRestoreSnapshot = (snap: RedundantSnapshot) => {
    const confirmMessage = `Deseja restaurar o ponto de redundância de ${new Date(snap.timestamp).toLocaleString('pt-BR')} (${snap.reason})?\n\nIsso atualizará os dados com esta versão.`;
    if (window.confirm(confirmMessage)) {
      restoreSnapshot(snap.data);
      refreshSnapshots();
      setRestoreMessage(`Ponto de redundância restaurado com sucesso! (${snap.reason})`);
      setTimeout(() => setRestoreMessage(null), 4000);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    let nextLockPin = settings.lockPin || '1234';

    // Se o usuário preencheu o campo de nova senha/PIN, valida a alteração
    if (newPinInput.trim() !== '' || confirmPinInput.trim() !== '') {
      if (!isDefaultPin && currentPinInput.trim() !== activePin) {
        setPinFeedback({
          type: 'error',
          text: 'A senha/PIN atual informada está incorreta.'
        });
        return;
      }
      if (newPinInput.trim().length < 4) {
        setPinFeedback({
          type: 'error',
          text: 'A nova senha ou PIN deve ter no mínimo 4 caracteres.'
        });
        return;
      }
      if (newPinInput.trim() !== confirmPinInput.trim()) {
        setPinFeedback({
          type: 'error',
          text: 'A confirmação de senha/PIN não coincide com a nova senha.'
        });
        return;
      }
      nextLockPin = newPinInput.trim();
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setPinFeedback({
        type: 'success',
        text: 'Nova senha/PIN de bloqueio cadastrada com sucesso!'
      });
      setTimeout(() => setPinFeedback(null), 4000);
    }

    const updated: ClinicSettings = {
      psychologistName,
      crp,
      cpf,
      email,
      phone,
      address,
      pixKey,
      bankDetails,
      defaultOnlineLink,
      idleTimeoutMinutes: Number(idleTimeoutMinutes) || 15,
      lockPin: nextLockPin,
      whatsAppTemplates,
    };
    updateSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = restoreFromBackupString(content);
        if (success) {
          alert('Backup restaurado com sucesso! Todos os dados foram atualizados.');
        } else {
          alert('Arquivo de backup inválido ou corrompido.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Configurações & Segurança</h1>
          <p className="text-xs text-slate-500">Dados profissionais de Ana Lima, modelos de WhatsApp e rotina de backup</p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>Configurações salvas!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Bloco 1: Dados Profissionais */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-xs font-bold text-brand-700 uppercase tracking-wider">
            <User className="w-4 h-4" />
            <span>Dados Profissionais & Fiscais (Emitidos nos Recibos e Declarações)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Profissional</label>
              <input
                type="text"
                value={psychologistName}
                onChange={(e) => setPsychologistName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Registro CRP</label>
              <input
                type="text"
                value={crp}
                onChange={(e) => setCrp(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">CPF</label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail Profissional</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chave PIX</label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Endereço do Consultório / Atendimento</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dados Bancários Complementares</label>
              <input
                type="text"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Bloco 2: Teleatendimento & Segurança (Com Cadastro/Alteração de Senha de Bloqueio) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-700 uppercase tracking-wider">
              <Video className="w-4 h-4" />
              <span>Telepsicologia & Segurança do Aplicativo</span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                isDefaultPin
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                <KeyRound className="w-3 h-3" />
                {isDefaultPin ? 'PIN Padrão Ativo (1234)' : 'Senha/PIN Personalizado Ativo'}
              </span>

              <button
                type="button"
                onClick={lockApp}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
              >
                <Lock className="w-3 h-3" />
                <span>Testar Bloqueio Agora</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Link Padrão para Videochamada (Google Meet / Sala Virtual)</label>
              <input
                type="url"
                value={defaultOnlineLink}
                onChange={(e) => setDefaultOnlineLink(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Conforme Resolução CFP 011/2018, utilize links protegidos e sem gravação.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Tempo para Bloqueio Automático por Inatividade (minutos)</span>
              </label>
              <input
                type="number"
                min={2}
                max={60}
                value={idleTimeoutMinutes}
                onChange={(e) => setIdleTimeoutMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Bloqueia a tela automaticamente para impedir acesso não autorizado ao prontuário.
              </p>
            </div>
          </div>

          {/* Sub-bloco dedicado para Cadastrar ou Alterar Senha / PIN de Bloqueio */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-brand-600" />
                  <span>{isDefaultPin ? 'Cadastrar Senha / PIN de Bloqueio de Tela' : 'Alterar Senha / PIN de Bloqueio de Tela'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isDefaultPin
                    ? 'Atualmente o bloqueio usa o PIN inicial 1234. Defina abaixo sua senha ou PIN exclusivo para proteger os prontuários.'
                    : 'Para alterar sua senha de desbloqueio, informe a senha atual e escolha o novo PIN ou senha (mínimo de 4 caracteres).'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPinText(!showPinText)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
              >
                {showPinText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPinText ? 'Ocultar caracteres' : 'Mostrar caracteres'}</span>
              </button>
            </div>

            {pinFeedback && (
              <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                pinFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{pinFeedback.text}</span>
              </div>
            )}

            <div className={`grid grid-cols-1 ${isDefaultPin ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
              {!isDefaultPin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Senha / PIN Atual</label>
                  <input
                    type={showPinText ? 'text' : 'password'}
                    placeholder="Digite sua senha atual..."
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nova Senha ou PIN (mín. 4 dígitos)</label>
                <input
                  type={showPinText ? 'text' : 'password'}
                  placeholder="Ex.: 2580 ou sua senha..."
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirmar Nova Senha ou PIN</label>
                <input
                  type={showPinText ? 'text' : 'password'}
                  placeholder="Repita a nova senha ou PIN..."
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 3: Modelos de Mensagens do WhatsApp */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-700 uppercase tracking-wider">
              <MessageSquare className="w-4 h-4" />
              <span>Modelos Pré-Formatados para Envio via WhatsApp</span>
            </div>
            <span className="text-[11px] text-slate-400 font-normal">
              Variáveis dinâmicas: &#123;nome&#125;, &#123;data&#125;, &#123;hora&#125;, &#123;link&#125;, &#123;valor&#125;, &#123;pix&#125;
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">1. Lembrete de Consulta (Véspera)</label>
              <textarea
                rows={3}
                value={whatsAppTemplates.reminder}
                onChange={(e) => setWhatsAppTemplates({ ...whatsAppTemplates, reminder: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">2. Confirmação no Dia</label>
              <textarea
                rows={3}
                value={whatsAppTemplates.confirmation}
                onChange={(e) => setWhatsAppTemplates({ ...whatsAppTemplates, confirmation: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">3. Envio de Link para Sessão Online</label>
              <textarea
                rows={3}
                value={whatsAppTemplates.onlineLink}
                onChange={(e) => setWhatsAppTemplates({ ...whatsAppTemplates, onlineLink: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">4. Cobrança Amigável & PIX</label>
              <textarea
                rows={3}
                value={whatsAppTemplates.friendlyCharge}
                onChange={(e) => setWhatsAppTemplates({ ...whatsAppTemplates, friendlyCharge: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">5. Convite para Pré-Cadastro / Ficha do Paciente (Link Seguro)</label>
              <textarea
                rows={4}
                value={whatsAppTemplates.intakeInvite || ''}
                onChange={(e) => setWhatsAppTemplates({ ...whatsAppTemplates, intakeInvite: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-sans"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Variáveis dinâmicas: &#123;nome&#125; (nome do paciente) e &#123;link&#125; (link público da ficha). Diagramação limpa sem emojis para garantir compatibilidade com todos os aparelhos.
              </p>
            </div>
          </div>
        </div>

        {/* Botão de Salvar Alterações */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </form>

      {/* Bloco 4: Cofre de Redundância e Espelhamento Automático */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/20 text-brand-400 rounded-xl border border-brand-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Cofre de Redundância e Espelhamento em Duplicidade</h3>
                <span className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Automático & Ativo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Garante integridade e proteção contra perda de dados (CFP 001/2009 e LGPD Art. 11).
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={refreshSnapshots}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors self-start sm:self-auto"
          >
            <History className="w-3.5 h-3.5 text-brand-400" />
            <span>Atualizar ({snapshots.length})</span>
          </button>
        </div>

        {restoreMessage && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{restoreMessage}</span>
          </div>
        )}

        {/* Lista de Snapshots Rotativos */}
        <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">Snapshots Automáticos do Sistema (Últimos 10):</span>
            <span className="text-[11px]">Assinatura digital determinística por Checksum</span>
          </div>

          {snapshots.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">Nenhum snapshot automático gerado ainda.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {new Date(snap.timestamp).toLocaleString('pt-BR')}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-brand-950 text-brand-300 border border-brand-800/50 font-medium">
                        {snap.reason}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span>{snap.itemCount.patients} pacientes</span>
                      <span>•</span>
                      <span>{snap.itemCount.records} evoluções</span>
                      <span>•</span>
                      <span>{snap.itemCount.sessions} sessões</span>
                      <span>•</span>
                      <span>{snap.itemCount.payments} recibos</span>
                      <span>•</span>
                      <span className="font-mono text-[10px] text-slate-500">Hash: {snap.checksum.split('-').slice(0, 2).join('-')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRestoreSnapshot(snap)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 hover:text-white rounded-lg text-xs font-semibold border border-brand-500/30 transition-colors"
                      title="Restaurar este ponto imediatamente"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restaurar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => exportCompleteBackup(snap.data)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors border border-slate-700"
                      title="Baixar arquivo JSON deste snapshot"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Exportação Manual / Nuvem Google Drive */}
        <div className="pt-3 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-0.5">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              <span>Exportação Externa para Google Drive ou Arquivo Local</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Gera um arquivo JSON estruturado completo contendo todo o histórico clínico para guarda permanente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={triggerBackup}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Backup Completo</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restaurar de Arquivo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
