import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  Phone, 
  Calendar, 
  ChevronRight, 
  DollarSign, 
  MessageSquare, 
  Edit, 
  Trash2, 
  MapPin, 
  Video,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Patient, PatientStatus, Modality } from '../../types';
import { PatientModal } from './PatientModal';
import { WhatsAppModal } from '../common/WhatsAppModal';
import { SendIntakeWhatsAppModal } from './SendIntakeWhatsAppModal';

interface PatientsViewProps {
  onNewPatientClick: () => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({ onNewPatientClick }) => {
  const { patients, navigateTo, deletePatient, isPrivacyMode } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PatientStatus>('all');
  const [modalityFilter, setModalityFilter] = useState<'all' | Modality>('all');
  
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [whatsAppPatient, setWhatsAppPatient] = useState<Patient | null>(null);
  const [isSendIntakeModalOpen, setIsSendIntakeModalOpen] = useState(false);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.cpf && p.cpf.includes(searchTerm)) ||
      p.phone.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesModality = modalityFilter === 'all' || p.preferredModality === modalityFilter;

    return matchesSearch && matchesStatus && matchesModality;
  });

  const getStatusBadge = (status: PatientStatus, isPreRegistration?: boolean) => {
    if (isPreRegistration) {
      return (
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>Pré-Cadastro</span>
        </span>
      );
    }
    switch (status) {
      case 'active':
        return <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Ativo</span>;
      case 'paused':
        return <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">Em Pausa</span>;
      case 'discharged':
        return <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">Alta</span>;
      case 'waiting_list':
        return <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">Fila de Espera</span>;
      case 'abandoned':
        return <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">Abandono</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Todos os Status</option>
            <option value="active">🟢 Em Acompanhamento</option>
            <option value="waiting_list">🟣 Fila de Espera</option>
            <option value="paused">🟡 Em Pausa</option>
            <option value="discharged">🔵 Alta</option>
            <option value="abandoned">🔴 Abandono</option>
          </select>

          <select
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value as any)}
            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Todas Modalidades</option>
            <option value="presencial">🏢 Presencial</option>
            <option value="online">💻 Online</option>
          </select>

          <button
            onClick={() => setIsSendIntakeModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors shrink-0"
            title="Enviar link de pré-cadastro pelo WhatsApp para novo paciente"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Enviar Cadastro WhatsApp</span>
          </button>

          <button
            onClick={onNewPatientClick}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Paciente</span>
          </button>
        </div>
      </div>

      {/* Abas Rápidas de Status & Destaque da Lista de Espera */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Todos ({patients.length})
        </button>
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            statusFilter === 'active'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
          }`}
        >
          🟢 Em Acompanhamento ({patients.filter(p => p.status === 'active').length})
        </button>
        <button
          onClick={() => setStatusFilter('waiting_list')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
            statusFilter === 'waiting_list'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Fila de Espera ({patients.filter(p => p.status === 'waiting_list').length})</span>
        </button>
        <button
          onClick={() => setStatusFilter('paused')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            statusFilter === 'paused'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          🟡 Em Pausa ({patients.filter(p => p.status === 'paused').length})
        </button>
        <button
          onClick={() => setStatusFilter('discharged')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            statusFilter === 'discharged'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-200'
          }`}
        >
          🔵 Alta ({patients.filter(p => p.status === 'discharged').length})
        </button>
      </div>

      {/* Grid de Pacientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500 space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-700">Nenhum paciente encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          filteredPatients.map((patient) => {
            return (
              <div
                key={patient.id}
                className={`bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 hover:border-brand-300 transition-all flex flex-col justify-between gap-4 ${isPrivacyMode ? 'privacy-blur' : ''}`}
              >
                <div>
                  {/* Top line: Name and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3
                        onClick={() => navigateTo('patient-detail', patient.id)}
                        className="font-bold text-base text-slate-900 hover:text-brand-600 cursor-pointer transition-colors leading-tight"
                      >
                        {patient.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {patient.profession || 'Profissão não informada'} • Início: {patient.startDate}
                      </p>
                    </div>
                    {getStatusBadge(patient.status, patient.isPreRegistration)}
                  </div>

                  {/* Informações detalhadas */}
                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{patient.phone}</span>
                      </span>
                      <button
                        onClick={() => setWhatsAppPatient(patient)}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                        title="Enviar WhatsApp (opção para Paciente ou Responsável)"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        {patient.preferredModality === 'online' ? (
                          <>
                            <Video className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-blue-700 font-medium">Online</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Presencial</span>
                          </>
                        )}
                      </span>
                      <span className="font-semibold text-slate-800">
                        R$ {patient.agreedPrice} / sessão
                      </span>
                    </div>

                    {patient.usualSchedule && (
                      <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2 py-1 rounded">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Horário: {patient.usualSchedule}</span>
                      </div>
                    )}

                    {/* Destaque do Responsável / Contato de Emergência */}
                    {patient.emergencyContact?.name && (
                      <div className="flex items-center gap-1.5 text-purple-700 bg-purple-50/70 border border-purple-100 px-2 py-1 rounded text-[11px] font-medium">
                        <span>👥 Resp: {patient.emergencyContact.name} ({patient.emergencyContact.relationship || 'Contato'}) • {patient.emergencyContact.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingPatient(patient)}
                      title="Editar cadastro"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Deseja realmente excluir o cadastro de ${patient.name}?`)) {
                          deletePatient(patient.id);
                        }
                      }}
                      title="Excluir paciente"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => navigateTo('patient-detail', patient.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 font-semibold text-xs rounded-xl transition-colors"
                  >
                    <span>Ficha & Prontuário</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modais */}
      {editingPatient && (
        <PatientModal
          isOpen={Boolean(editingPatient)}
          onClose={() => setEditingPatient(null)}
          patientToEdit={editingPatient}
        />
      )}

      {whatsAppPatient && (
        <WhatsAppModal
          isOpen={Boolean(whatsAppPatient)}
          onClose={() => setWhatsAppPatient(null)}
          patientName={whatsAppPatient.name}
          patientPhone={whatsAppPatient.phone}
          emergencyContact={whatsAppPatient.emergencyContact}
          amount={whatsAppPatient.agreedPrice}
        />
      )}

      {/* Modal de Disparo de Pré-Cadastro via WhatsApp */}
      {isSendIntakeModalOpen && (
        <SendIntakeWhatsAppModal
          isOpen={isSendIntakeModalOpen}
          onClose={() => setIsSendIntakeModalOpen(false)}
        />
      )}
    </div>
  );
};
