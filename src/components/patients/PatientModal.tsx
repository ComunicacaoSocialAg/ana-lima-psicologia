import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, DollarSign, Calendar, HeartHandshake, Baby, ShieldCheck } from 'lucide-react';
import { Patient, PatientStatus, Modality } from '../../types';
import { useApp } from '../../context/AppContext';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientToEdit?: Patient | null;
}

const calculateAge = (dateStr?: string): number | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age--;
  }
  return isNaN(age) || age < 0 ? null : age;
};

export const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  patientToEdit,
}) => {
  const { savePatient } = useApp();

  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('Feminino');
  const [profession, setProfession] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('Solteiro(a)');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Menor de Idade & Responsável Legal
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianCpf, setGuardianCpf] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('Mãe');
  const [guardianPhone, setGuardianPhone] = useState('');

  // Contato de Emergência (Paciente Adulto)
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('Cônjuge / Parceiro(a)');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [status, setStatus] = useState<PatientStatus>('active');
  const [preferredModality, setPreferredModality] = useState<Modality>('presencial');
  const [agreedPrice, setAgreedPrice] = useState(200);
  const [usualSchedule, setUsualSchedule] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (patientToEdit) {
      setName(patientToEdit.name || '');
      setCpf(patientToEdit.cpf || '');
      setRg(patientToEdit.rg || '');
      setBirthDate(patientToEdit.birthDate || '');
      setGender(patientToEdit.gender || 'Feminino');
      setProfession(patientToEdit.profession || '');
      setMaritalStatus(patientToEdit.maritalStatus || 'Solteiro(a)');
      setPhone(patientToEdit.phone || '');
      setEmail(patientToEdit.email || '');
      setAddress(patientToEdit.address || '');

      const minorFlag = Boolean(
        patientToEdit.isMinor ||
        patientToEdit.guardianCpf ||
        patientToEdit.guardianName ||
        (typeof patientToEdit.legalGuardian === 'object' && patientToEdit.legalGuardian?.name) ||
        (patientToEdit.birthDate && calculateAge(patientToEdit.birthDate) !== null && calculateAge(patientToEdit.birthDate)! < 18)
      );
      setIsMinor(minorFlag);

      const gName = patientToEdit.guardianName || (typeof patientToEdit.legalGuardian === 'object' ? patientToEdit.legalGuardian?.name : (patientToEdit.legalGuardian || ''));
      const gCpf = patientToEdit.guardianCpf || (typeof patientToEdit.legalGuardian === 'object' ? patientToEdit.legalGuardian?.cpf : '');
      const gRel = patientToEdit.guardianRelationship || (typeof patientToEdit.legalGuardian === 'object' ? patientToEdit.legalGuardian?.relationship : '') || 'Mãe';
      const gPhone = patientToEdit.guardianPhone || (typeof patientToEdit.legalGuardian === 'object' ? patientToEdit.legalGuardian?.phone : '');
      setGuardianName(gName);
      setGuardianCpf(gCpf);
      setGuardianRelationship(gRel);
      setGuardianPhone(gPhone);

      setEmergencyName(patientToEdit.emergencyContact?.name || '');
      setEmergencyRelationship(patientToEdit.emergencyContact?.relationship || 'Cônjuge / Parceiro(a)');
      setEmergencyPhone(patientToEdit.emergencyContact?.phone || '');

      setStatus(patientToEdit.status || 'active');
      setPreferredModality(patientToEdit.preferredModality || 'presencial');
      setAgreedPrice(patientToEdit.agreedPrice || 200);
      setUsualSchedule(patientToEdit.usualSchedule || '');
      setReferralSource(patientToEdit.referralSource || '');
      setNotes(patientToEdit.notes || '');
    } else {
      setName('');
      setCpf('');
      setRg('');
      setBirthDate('');
      setGender('Feminino');
      setProfession('');
      setMaritalStatus('Solteiro(a)');
      setPhone('');
      setEmail('');
      setAddress('');
      setIsMinor(false);
      setGuardianName('');
      setGuardianCpf('');
      setGuardianRelationship('Mãe');
      setGuardianPhone('');
      setEmergencyName('');
      setEmergencyRelationship('Cônjuge / Parceiro(a)');
      setEmergencyPhone('');
      setStatus('active');
      setPreferredModality('presencial');
      setAgreedPrice(200);
      setUsualSchedule('');
      setReferralSource('');
      setNotes('');
    }
  }, [patientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleBirthDateChange = (val: string) => {
    setBirthDate(val);
    const a = calculateAge(val);
    if (a !== null) {
      setIsMinor(a < 18);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome do paciente.');
      return;
    }

    const payload: Patient = {
      id: patientToEdit?.id || `pat-${Date.now()}`,
      name: name.trim(),
      cpf: cpf.trim() || (isMinor ? guardianCpf.trim() : undefined) || undefined,
      rg: rg.trim() || undefined,
      birthDate: birthDate || undefined,
      gender,
      profession: profession.trim() || (isMinor ? 'Estudante' : undefined),
      maritalStatus: isMinor ? 'Solteiro(a)' : maritalStatus,
      phone: phone.trim() || (isMinor ? guardianPhone.trim() : ''),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      isMinor: isMinor,
      emergencyContact: isMinor ? (guardianName.trim() ? {
        name: guardianName.trim(),
        relationship: guardianRelationship.trim() || 'Responsável Legal',
        phone: guardianPhone.trim() || phone.trim(),
      } : undefined) : (emergencyName.trim() ? {
        name: emergencyName.trim(),
        relationship: emergencyRelationship.trim() || 'Contato',
        phone: emergencyPhone.trim(),
      } : undefined),
      legalGuardian: isMinor && guardianName.trim() ? {
        name: guardianName.trim(),
        relationship: guardianRelationship.trim() || 'Responsável Legal',
        cpf: guardianCpf.trim(),
        phone: guardianPhone.trim(),
      } : undefined,
      guardianName: isMinor ? guardianName.trim() || undefined : undefined,
      guardianCpf: isMinor ? guardianCpf.trim() || undefined : undefined,
      guardianRelationship: isMinor ? guardianRelationship.trim() || undefined : undefined,
      guardianPhone: isMinor ? guardianPhone.trim() || undefined : undefined,
      status,
      preferredModality,
      agreedPrice: Number(agreedPrice) || 200,
      usualSchedule: usualSchedule.trim() || undefined,
      startDate: patientToEdit?.startDate || new Date().toISOString().slice(0, 10),
      referralSource: referralSource.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: patientToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    savePatient(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">
                {patientToEdit ? 'Editar Dados do Paciente' : 'Novo Paciente'}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Cadastro clínico confidencial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <form id="patient-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Seção 1: Identificação */}
            <div>
              <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Dados Pessoais</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do(a) paciente"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CPF (para recibos fiscais)
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => handleBirthDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isMinor}
                      onChange={(e) => setIsMinor(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                    />
                    <span>Paciente é menor de 18 anos (exige identificação do Responsável Legal e CPF)</span>
                  </label>
                  {isMinor && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                      <Baby className="w-3 h-3 text-amber-700" />
                      Menor de Idade
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gênero
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Não-binário">Não-binário</option>
                    <option value="Outro">Outro / Prefere não informar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Profissão / Ocupação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Arquiteta, Estudante..."
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Contato e Endereço */}
            <div className="pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span>Contato & Comunicação</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp / Telefone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="paciente@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    placeholder="Rua, número, bairro, cidade/UF"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Seção 3: Responsável Legal ou Contato de Emergência */}
            {isMinor ? (
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Responsável Legal (CFP & Fiscal)</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                    Obrigatório para Menores de 18 anos
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome do Responsável Legal <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nome do pai, mãe ou tutor"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CPF do Responsável (Recibos IRPF) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={guardianCpf}
                      onChange={(e) => setGuardianCpf(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Grau de Parentesco / Vínculo <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={guardianRelationship}
                      onChange={(e) => setGuardianRelationship(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="Mãe">Mãe</option>
                      <option value="Pai">Pai</option>
                      <option value="Tutor(a) Legal">Tutor(a) Legal</option>
                      <option value="Guardião(ã) Legal">Guardião(ã) Legal</option>
                      <option value="Avó / Avô (Responsável Legal)">Avó / Avô (Responsável Legal)</option>
                      <option value="Tio(a) (Responsável Legal)">Tio(a) (Responsável Legal)</option>
                      <option value="Outro Responsável Legal">Outro Responsável Legal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      WhatsApp / Telefone do Responsável <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-200">
                <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Contato de Emergência</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nome</label>
                    <input
                      type="text"
                      placeholder="Nome do contato"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Parentesco</label>
                    <input
                      type="text"
                      placeholder="Ex: Cônjuge, Mãe, Amigo..."
                      value={emergencyRelationship}
                      onChange={(e) => setEmergencyRelationship(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone</label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Seção 4: Configurações do Atendimento */}
            <div className="pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Configurações do Processo Terapêutico</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PatientStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="active">🟢 Em Acompanhamento (Ativo)</option>
                    <option value="paused">🟡 Em Pausa</option>
                    <option value="discharged">⚪ Alta Concluída</option>
                    <option value="waiting_list">⏳ Fila de Espera</option>
                    <option value="abandoned">🔴 Abandono / Desistência</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidade</label>
                  <select
                    value={preferredModality}
                    onChange={(e) => setPreferredModality(e.target.value as Modality)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="presencial">🏢 Presencial</option>
                    <option value="online">💻 Online</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor por Sessão (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-500 font-medium">R$</span>
                    <input
                      type="number"
                      value={agreedPrice}
                      onChange={(e) => setAgreedPrice(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Horário Habitual
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Terças às 14h00"
                    value={usualSchedule}
                    onChange={(e) => setUsualSchedule(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Origem da Indicação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Instagram, indicação de colega, indicação médica..."
                    value={referralSource}
                    onChange={(e) => setReferralSource(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="patient-form"
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{patientToEdit ? 'Salvar Alterações' : 'Cadastrar Paciente'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
