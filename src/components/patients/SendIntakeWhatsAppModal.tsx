import React, { useState, useEffect } from 'react';
import { X, Send, Copy, Check, MessageSquare, ShieldCheck, Save, RotateCcw, Edit3 } from 'lucide-react';
import { generateWhatsAppUrl, DEFAULT_TEMPLATES } from '../../services/whatsappService';
import { useApp } from '../../context/AppContext';

interface SendIntakeWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string;
  defaultName?: string;
}

export const SendIntakeWhatsAppModal: React.FC<SendIntakeWhatsAppModalProps> = ({
  isOpen,
  onClose,
  defaultPhone = '',
  defaultName = '',
}) => {
  const { settings, updateSettings } = useApp();

  // URL pública oficial de acolhimento (prioriza o domínio HTTPS de produção para que o celular do paciente acesse com segurança)
  const publicIntakeUrl = typeof window !== 'undefined' && !window.location.origin.includes('localhost')
    ? `${window.location.origin}/cadastro`
    : 'https://ana-lima-psi-app.web.app/cadastro';

  const [patientName, setPatientName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [isEdited, setIsEdited] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [savedAsDefault, setSavedAsDefault] = useState(false);

  // Função auxiliar para interpolar template com nome e link
  const interpolateTemplate = (template?: string, name?: string) => {
    const raw = template || DEFAULT_TEMPLATES.intakeInvite || '';
    const firstName = name?.trim() ? name.trim().split(' ')[0] : '';
    let msg = raw;
    if (firstName) {
      msg = msg.replace(/\{nome\}/g, firstName);
    } else {
      msg = msg.replace(/Olá,\s*\{nome\}!/g, 'Olá!');
      msg = msg.replace(/\{nome\}/g, '');
    }
    if (msg.includes('{link}')) {
      msg = msg.replace(/\{link\}/g, publicIntakeUrl);
    }
    return msg;
  };

  const activeTemplate = settings.whatsAppTemplates?.intakeInvite || DEFAULT_TEMPLATES.intakeInvite || '';
  const [messageText, setMessageText] = useState(() => interpolateTemplate(activeTemplate, defaultName));

  // Atualiza a mensagem ao alterar o nome, desde que o usuário não tenha editado manualmente
  useEffect(() => {
    if (!isEdited) {
      setMessageText(interpolateTemplate(activeTemplate, patientName));
    }
  }, [patientName, activeTemplate, isEdited]);

  if (!isOpen) return null;

  // Formatação amigável de telefone (XX) 9XXXX-XXXX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 10) {
      v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (v.length > 6) {
      v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (v.length > 2) {
      v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    }
    setPhone(v);
  };

  // Salvar o texto editado como novo template padrão
  const handleSaveAsDefault = () => {
    let templateToSave = messageText;

    // Substitui a URL fixa por {link} para continuar dinâmico
    templateToSave = templateToSave.split(publicIntakeUrl).join('{link}');

    // Substitui o primeiro nome pelo marcador {nome} se presente
    const firstName = patientName.trim().split(' ')[0];
    if (firstName && firstName.length > 1) {
      const nameRegex = new RegExp(`\\b${firstName}\\b`, 'g');
      templateToSave = templateToSave.replace(nameRegex, '{nome}');
    }

    updateSettings({
      ...settings,
      whatsAppTemplates: {
        ...settings.whatsAppTemplates,
        intakeInvite: templateToSave,
      },
    });

    setSavedAsDefault(true);
    setTimeout(() => setSavedAsDefault(false), 2500);
  };

  // Restaurar texto para o modelo original sem emojis
  const handleResetToDefault = () => {
    const resetText = interpolateTemplate(DEFAULT_TEMPLATES.intakeInvite, patientName);
    setMessageText(resetText);
    setIsEdited(false);
  };

  const handleOpenWhatsApp = () => {
    const url = generateWhatsAppUrl(phone, messageText);
    window.open(url, '_blank');
    onClose();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicIntakeUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[95vh] flex flex-col">
        {/* Header da Modal */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Enviar Cadastro via WhatsApp</h3>
              <p className="text-xs text-slate-300">Link prévio de acolhimento para o paciente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo da Modal com scroll suave */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-800">
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              O paciente preencherá a ficha pelo celular e ela entrará automaticamente na sua <strong>Lista de Espera / Pré-cadastros</strong> com todos os dados protegidos (CFP & LGPD).
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do(a) Paciente <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Mariana Vasconcelos"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp do Paciente <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="(31) 90000-0000"
                value={phone}
                onChange={handlePhoneChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Link Público do Formulário */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Link Seguro do Formulário (Produção)
              </label>
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>
            <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono truncate select-all">
              {publicIntakeUrl}
            </div>
          </div>

          {/* Editor e Pré-visualização da Mensagem */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-brand-600" />
                <span>Texto da Mensagem (Editável)</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAsDefault}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                    savedAsDefault
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                  title="Salvar esta mensagem como o modelo padrão para os próximos envios"
                >
                  {savedAsDefault ? <Check className="w-3 h-3 text-emerald-600" /> : <Save className="w-3 h-3" />}
                  <span>{savedAsDefault ? 'Salvo como Padrão!' : 'Salvar como Padrão'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Restaurar para a mensagem padrão original"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar</span>
                </button>
              </div>
            </div>

            <textarea
              rows={6}
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                setIsEdited(true);
              }}
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed font-sans resize-none"
              placeholder="Digite ou personalize a mensagem aqui..."
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
              <span>Sem emojis problemáticos: diagramação compatível com todos os celulares.</span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedMessage ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedMessage ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              {copiedMessage ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedMessage ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Abrir no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
