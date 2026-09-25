import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  MapPin, 
  HeartHandshake, 
  Calendar, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Sparkles, 
  Building2, 
  Video, 
  Send,
  Lock,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { Patient, Modality } from '../../types';
import { storageService } from '../../services/storageService';
import { cloudSyncService } from '../../services/cloudSyncService';
import { DandelionLogo } from '../common/DandelionLogo';

export const PatientIntakeView: React.FC = () => {
  // Estado do formulário
  const [name, setName] = useState('');
  const [socialName, setSocialName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('Feminino');
  const [profession, setProfession] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('Solteiro(a)');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  // Endereço
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Poços de Caldas');
  const [state, setState] = useState('MG');
  const [zipCode, setZipCode] = useState('');

  // Contato de emergência
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('Mãe');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Preferências
  const [preferredModality, setPreferredModality] = useState<Modality>('presencial');
  const [preferredShift, setPreferredShift] = useState('Tarde (13h às 18h)');
  const [initialComplaint, setInitialComplaint] = useState('');
  
  // Consentimento
  const [consentLgpd, setConsentLgpd] = useState(false);

  // Estados de controle
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Formatação de CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 9) {
      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (v.length > 6) {
      v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (v.length > 3) {
      v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    setCpf(v);
  };

  // Formatação de Telefone
  const handlePhoneChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 10) {
      v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (v.length > 6) {
      v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (v.length > 2) {
      v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    }
    setter(v);
  };

  // Formatação de CEP
  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 5) {
      v = v.replace(/(\d{5})(\d{1,3})/, '$1-$2');
    }
    setZipCode(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validações básicas
    if (!name.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }
    if (!cpf.trim() || cpf.replace(/\D/g, '').length < 11) {
      setErrorMessage('Por favor, informe um CPF válido.');
      return;
    }
    if (!birthDate) {
      setErrorMessage('Por favor, informe sua data de nascimento.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setErrorMessage('Por favor, informe um telefone/WhatsApp válido com DDD.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }
    if (!emergencyName.trim() || !emergencyPhone.trim()) {
      setErrorMessage('Por favor, preencha o nome e telefone do contato de emergência.');
      return;
    }
    if (!consentLgpd) {
      setErrorMessage('É necessário aceitar os termos de consentimento e sigilo para enviar a ficha.');
      return;
    }

    setIsSubmitting(true);

    try {
      const fullAddress = address.trim() 
        ? `${address.trim()}${city ? ` - ${city}` : ''}${state ? `/${state}` : ''}${zipCode ? ` - CEP: ${zipCode}` : ''}`
        : `${city}/${state}`;

      const newPatient: Patient = {
        id: `pat-${Date.now()}`,
        name: socialName.trim() ? `${socialName.trim()} (${name.trim()})` : name.trim(),
        cpf: cpf.trim(),
        birthDate: birthDate,
        gender: gender,
        profession: profession.trim() || undefined,
        maritalStatus: maritalStatus,
        phone: phone.trim(),
        email: email.trim(),
        address: fullAddress,
        emergencyContact: {
          name: emergencyName.trim(),
          relationship: emergencyRelationship,
          phone: emergencyPhone.trim()
        },
        status: 'waiting_list',
        preferredModality: preferredModality,
        agreedPrice: 200, // Preço padrão de referência
        usualSchedule: `Pref: ${preferredShift}`,
        startDate: new Date().toISOString().slice(0, 10),
        referralSource: 'Pré-cadastro via WhatsApp',
        notes: initialComplaint.trim() ? `Motivo da busca: ${initialComplaint.trim()}` : 'Pré-cadastro preenchido pelo paciente.',
        isPreRegistration: true,
        preRegistrationData: {
          submittedAt: new Date().toISOString(),
          consentLgpd: true,
          preferredShift: preferredShift,
          initialComplaint: initialComplaint.trim() || undefined,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Salva no cofre local de pacientes
      storageService.savePatient(newPatient);

      // Emite evento em tempo real para avisos instantâneos caso o consultório esteja aberto
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('clinica-new-intake', { detail: newPatient }));
      }

      // Envia em tempo real para a nuvem da clínica
      await cloudSyncService.submitPublicIntake(newPatient);

      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Erro ao salvar pré-cadastro:', err);
      setErrorMessage('Ocorreu um erro ao processar seu cadastro. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tela de Sucesso
  if (isSubmitted) {
    const firstName = (socialName || name).split(' ')[0];
    const cleanAnaPhone = '5531992949211';
    const waText = encodeURIComponent(`Olá, Ana! Acabei de enviar minha ficha de pré-cadastro pelo link.`);
    const waLink = `https://wa.me/${cleanAnaPhone}?text=${waText}`;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-10 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Ficha Recebida com Sucesso
          </span>

          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            Tudo pronto, {firstName}!
          </h2>

          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            Seus dados cadastrais foram criptografados e recebidos com segurança pelo consultório da <strong>Psicóloga Ana Lima (CRP 04/60205)</strong>.
          </p>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 my-6 text-left space-y-2.5 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              <span><strong>Próxima etapa:</strong> A psicóloga verificará a agenda para compatibilizar os horários com a sua preferência indicada.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Contato:</strong> O retorno será feito diretamente no seu WhatsApp ({phone}).</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span><strong>Sigilo:</strong> Suas informações são protegidas pelo Código de Ética Profissional e pela LGPD.</span>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Avisar a Psicóloga no WhatsApp</span>
            </a>

            <button
              onClick={() => {
                setIsSubmitted(false);
                setName('');
                setPhone('');
                setEmail('');
                setCpf('');
                setInitialComplaint('');
              }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors block mx-auto pt-2"
            >
              Preencher outra ficha cadastral
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Ana Lima • Psicóloga Clínica (CRP 04/60205) • Poços de Caldas/MG
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800 pb-12">
      {/* Header Institucional de Acolhimento */}
      <header className="bg-white border-b border-slate-200 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-6 shadow-2xs">
        <div className="max-w-2xl mx-auto px-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="relative">
            <DandelionLogo 
              size={84} 
              variant="dark" 
              rounded="2xl" 
              className="ring-4 ring-[#1C2B22]/10 shadow-md" 
            />
            <div className="absolute -bottom-1 -right-1 bg-[#1C2B22] text-[#F7F5F0] border border-[#F7F5F0]/25 p-1 rounded-lg shadow">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Psicóloga Ana Lima
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 border border-brand-200">
                CRP 04/60205
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Psicoterapia Clínica • Atendimento Presencial & Online
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-emerald-700 font-medium pt-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Ambiente Seguro com Sigilo Profissional e LGPD</span>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal do Formulário */}
      <main className="max-w-2xl mx-auto px-4 pt-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="mb-6 pb-6 border-b border-slate-100">
            <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
              Ficha de Acolhimento Prévia
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
              Cadastro Inicial do Paciente
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Olá! Este formulário prévio permite que a psicóloga organize seu prontuário clínico com tranquilidade antes do primeiro atendimento, economizando seu tempo na consulta.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SEÇÃO 1: Identificação Pessoal */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 pb-1 border-b border-slate-100">
                <User className="w-4 h-4 text-brand-600" />
                <span>1. Dados de Identificação</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome completo como no documento"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Social ou Como prefere ser chamado(a) <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Como você gostaria de ser tratado(a)"
                  value={socialName}
                  onChange={(e) => setSocialName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CPF <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={handleCpfChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Necessário para prontuário e recibos IRPF.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Nascimento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gênero / Pronome
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Não-binário">Não-binário</option>
                    <option value="Outro">Outro</option>
                    <option value="Prefiro não informar">Prefiro não informar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado Civil
                  </label>
                  <select
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="União Estável">União Estável</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Profissão / Ocupação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Engenheira, Estudante..."
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp / Celular <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="(31) 90000-0000"
                      value={phone}
                      onChange={handlePhoneChange(setPhone)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Usado para confirmações de consultas.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="seu.email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: Endereço */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 pb-1 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-brand-600" />
                <span>2. Endereço Residencial</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Logradouro e Número
                </label>
                <input
                  type="text"
                  placeholder="Rua, Avenida, Número e Complemento (se houver)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={zipCode}
                    onChange={handleZipCodeChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: Contato de Emergência / Responsável Legal */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 pb-1 border-b border-slate-100">
                <HeartHandshake className="w-4 h-4 text-brand-600" />
                <span>3. Contato de Emergência / Responsável Legal</span>
              </div>
              <p className="text-xs text-slate-500">
                Conforme diretrizes éticas da Psicologia, é fundamental dispor de um contato para situações imprevistas ou de saúde.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Contato <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome completo"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Parentesco / Relação <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={emergencyRelationship}
                    onChange={(e) => setEmergencyRelationship(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Cônjuge / Parceiro(a)">Cônjuge / Parceiro(a)</option>
                    <option value="Irmão / Irmã">Irmão / Irmã</option>
                    <option value="Filho / Filha">Filho / Filha</option>
                    <option value="Amigo(a) Próximo(a)">Amigo(a) Próximo(a)</option>
                    <option value="Tutor Legal">Tutor Legal</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone do Contato <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(31) 90000-0000"
                    value={emergencyPhone}
                    onChange={handlePhoneChange(setEmergencyPhone)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 4: Preferências de Atendimento */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 pb-1 border-b border-slate-100">
                <Calendar className="w-4 h-4 text-brand-600" />
                <span>4. Preferências de Atendimento & Demanda</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Modalidade Preferencial de Atendimento <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPreferredModality('presencial')}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      preferredModality === 'presencial'
                        ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${
                      preferredModality === 'presencial' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Atendimento Presencial</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">Consultório em Poços de Caldas/MG</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreferredModality('online')}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      preferredModality === 'online'
                        ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${
                      preferredModality === 'online' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Atendimento Online</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">Via videochamada segura (Google Meet)</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Melhores Turnos ou Horários de Preferência
                </label>
                <select
                  value={preferredShift}
                  onChange={(e) => setPreferredShift(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Manhã (08h às 12h)">Manhã (08h às 12h)</option>
                  <option value="Tarde (13h às 18h)">Tarde (13h às 18h)</option>
                  <option value="Noite (18h às 21h)">Noite (18h às 21h)</option>
                  <option value="Flexível / Qualquer turno">Flexível / Qualquer turno</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  O que te motivou a buscar psicoterapia neste momento? <span className="text-slate-400 font-normal">(Opcional / Confidencial)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Se desejar, relate em poucas palavras sua demanda inicial, sintomas ou sentimentos que gostaria de trabalhar em sessão..."
                  value={initialComplaint}
                  onChange={(e) => setInitialComplaint(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all resize-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Esta informação é lida com total sigilo pela psicóloga para o acolhimento prévio.</span>
              </div>
            </div>

            {/* SEÇÃO 5: Termo de Consentimento & LGPD */}
            <div className="pt-4 border-t border-slate-100">
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={consentLgpd}
                    onChange={(e) => setConsentLgpd(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                  />
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-800 block mb-1">
                      Termo de Consentimento Livre e Esclarecido (TCLE) & LGPD
                    </span>
                    Declaro que as informações acima são verídicas. Autorizo a <strong>Psicóloga Ana Lima (CRP 04/60205)</strong> a armazenar e tratar meus dados cadastrais exclusivamente para fins de atendimento psicológico, prontuário clínico e emissão de recibos, em estrita conformidade com o Código de Ética do Psicólogo e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
                  </div>
                </label>
              </div>
            </div>

            {/* Botão de Envio */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Enviando Cadastro Criptografado...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Minha Ficha Cadastral</span>
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-slate-400 mt-2.5">
                🔒 Seus dados serão transmitidos diretamente para o cofre seguro da clínica.
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
export default PatientIntakeView;
