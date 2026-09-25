import React, { useState } from 'react';
import { 
  ArrowLeft, 
  FileText, 
  ClipboardList, 
  Activity, 
  DollarSign, 
  User, 
  Plus, 
  Download, 
  History, 
  Edit, 
  Lock, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  FileCheck2,
  FileSpreadsheet
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { Anamnesis, ClinicalRecord } from '../../types';
import { SessionRecordModal } from '../clinical/SessionRecordModal';
import { AssessmentModal } from '../assessments/AssessmentModal';
import { PatientModal } from './PatientModal';
import { generateReceiptPdf, generateAttendanceDeclaration, exportClinicalRecordsPdf } from '../../services/pdfService';

type DetailTab = 'records' | 'anamnesis' | 'assessments' | 'financial' | 'info';

export const PatientDetailView: React.FC = () => {
  const { 
    selectedPatientId, 
    patients, 
    navigateTo, 
    getAnamnesis, 
    saveAnamnesis, 
    getRecordsByPatient, 
    getAssessmentsByPatient, 
    sessions, 
    payments, 
    settings, 
    isPrivacyMode 
  } = useApp();

  const patient = patients.find(p => p.id === selectedPatientId);

  const [activeTab, setActiveTab] = useState<DetailTab>('records');

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<ClinicalRecord | null>(null);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);

  // Anamnesis Editing State
  const initialAnamnesis = patient ? getAnamnesis(patient.id) : null;
  const [isEditingAnamnesis, setIsEditingAnamnesis] = useState(false);
  const [chiefComplaint, setChiefComplaint] = useState(initialAnamnesis?.chiefComplaint || '');
  const [symptomOnset, setSymptomOnset] = useState(initialAnamnesis?.symptomOnset || '');
  const [medicalHistory, setMedicalHistory] = useState(initialAnamnesis?.medicalHistory || '');
  const [currentMedications, setCurrentMedications] = useState(initialAnamnesis?.currentMedications || '');
  const [routineAndHabits, setRoutineAndHabits] = useState(initialAnamnesis?.routineAndHabits || '');
  const [riskFactors, setRiskFactors] = useState(initialAnamnesis?.riskFactors || '');
  const [protectiveFactors, setProtectiveFactors] = useState(initialAnamnesis?.protectiveFactors || '');
  const [therapeuticGoals, setTherapeuticGoals] = useState(initialAnamnesis?.therapeuticGoals || '');

  if (!patient) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p>Paciente não encontrado.</p>
        <button
          onClick={() => navigateTo('patients')}
          className="mt-3 px-4 py-2 bg-brand-600 text-white rounded-lg text-xs"
        >
          Voltar para Lista de Pacientes
        </button>
      </div>
    );
  }

  const patientRecords = getRecordsByPatient(patient.id);
  const patientAssessments = getAssessmentsByPatient(patient.id);
  const patientSessions = sessions.filter(s => s.patientId === patient.id);
  const patientPayments = payments.filter(p => p.patientId === patient.id);

  const handleSaveAnamnesis = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Anamnesis = {
      patientId: patient.id,
      chiefComplaint,
      symptomOnset,
      medicalHistory,
      currentMedications,
      routineAndHabits,
      riskFactors,
      protectiveFactors,
      therapeuticGoals,
      lastUpdated: new Date().toISOString(),
    };
    saveAnamnesis(updated);
    setIsEditingAnamnesis(false);
  };

  const handleExportFullRecord = () => {
    exportClinicalRecordsPdf({
      patient,
      settings,
      records: patientRecords,
    });
  };

  const handleGenerateReceipt = (amount: number, sessionDate: string) => {
    generateReceiptPdf({
      patient,
      settings,
      amount,
      sessionDates: [sessionDate],
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
    });
  };

  const handleGenerateAttendance = (sessionDate: string, start: string, end: string) => {
    generateAttendanceDeclaration({
      patient,
      settings,
      sessionDate,
      startTime: start,
      endTime: end,
    });
  };

  // Dados para gráfico de escalas
  const chartData = patientAssessments.map(a => ({
    data: a.date.slice(5),
    escore: a.totalScore,
    tipo: a.type,
    severidade: a.severity,
  }));

  return (
    <div className={`p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto ${isPrivacyMode ? 'privacy-blur' : ''}`}>
      {/* Top Navigation & Patient Header Card */}
      <div className="space-y-4">
        <button
          onClick={() => navigateTo('patients')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Pacientes</span>
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-xs">
              {patient.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 leading-tight">{patient.name}</h1>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  patient.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {patient.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {patient.phone} • {patient.email || 'Sem e-mail'} • CPF: {patient.cpf || 'Não informado'} • Início: {patient.startDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <button
              onClick={() => setIsEditPatientModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Editar Cadastro</span>
            </button>

            <button
              onClick={handleExportFullRecord}
              title="Exportar Prontuário em PDF (Direito do Paciente / CFP)"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Prontuário PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'records'
              ? 'border-brand-600 text-brand-700 bg-brand-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Prontuário & Evoluções ({patientRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('anamnesis')}
          className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'anamnesis'
              ? 'border-brand-600 text-brand-700 bg-brand-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Anamnese Estruturada</span>
        </button>

        <button
          onClick={() => setActiveTab('assessments')}
          className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'assessments'
              ? 'border-brand-600 text-brand-700 bg-brand-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Escalas PHQ-9 & GAD-7 ({patientAssessments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('financial')}
          className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'financial'
              ? 'border-brand-600 text-brand-700 bg-brand-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Financeiro & Recibos</span>
        </button>

        <button
          onClick={() => setActiveTab('info')}
          className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'info'
              ? 'border-brand-600 text-brand-700 bg-brand-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Dados Cadastrais</span>
        </button>
      </div>

      {/* TAB 1: Prontuário & Linha do Tempo */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Linha do Tempo de Evoluções Clínicas</h3>
              <p className="text-xs text-slate-500">Guarda obrigatória por no mínimo 5 anos (Resolução CFP 001/2009)</p>
            </div>
            <button
              onClick={() => {
                setSelectedRecordForEdit(null);
                setIsRecordModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Evolução</span>
            </button>
          </div>

          {patientRecords.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500 space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-700">Nenhuma evolução registrada ainda para este paciente.</p>
              <p className="text-xs text-slate-400">Clique em "Nova Evolução" para registrar a primeira sessão.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {patientRecords.map((record) => (
                <div 
                  key={record.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4"
                >
                  {/* Record Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-xs">
                        v{record.version}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">Sessão em {record.sessionDate}</h4>
                          <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {record.modality}
                          </span>
                          {record.version > 1 && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Revisado ({record.history?.length || 0} versões)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Registrado em: {new Date(record.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedRecordForEdit(record);
                        setIsRecordModalOpen(true);
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Revisar Registro</span>
                    </button>
                  </div>

                  {/* Themes & Interventions */}
                  {(record.themes || record.interventions) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                      {record.themes && (
                        <div>
                          <span className="font-bold text-slate-700">Temas / Demandas: </span>
                          <span className="text-slate-600">{record.themes}</span>
                        </div>
                      )}
                      {record.interventions && (
                        <div>
                          <span className="font-bold text-slate-700">Técnicas Utilizadas: </span>
                          <span className="text-slate-600">{record.interventions}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Evolução Principal */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Evolução Clínica Formal
                    </h5>
                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-lg border border-slate-100">
                      {record.evolution}
                    </p>
                  </div>

                  {/* Homework */}
                  {record.homework && (
                    <div className="text-xs bg-brand-50/50 border border-brand-100 p-3 rounded-xl">
                      <span className="font-bold text-brand-900">Combinados / Tarefas: </span>
                      <span className="text-brand-800">{record.homework}</span>
                    </div>
                  )}

                  {/* Anotações Pessoais (Segregadas) */}
                  {record.privateNotes && (
                    <div className="text-xs bg-amber-50/70 border border-amber-200 p-3 rounded-xl flex items-start gap-2">
                      <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-900">Anotações Pessoais de Supervisão: </span>
                        <p className="text-amber-800 italic mt-0.5 whitespace-pre-wrap">{record.privateNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Anamnese Estruturada */}
      {activeTab === 'anamnesis' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Histórico Clínico e Anamnese</h3>
              <p className="text-xs text-slate-500">Mapeamento inicial de saúde e queixas do paciente</p>
            </div>
            {!isEditingAnamnesis ? (
              <button
                onClick={() => setIsEditingAnamnesis(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Editar Anamnese</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditingAnamnesis(false)}
                className="px-3.5 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Cancelar Edição
              </button>
            )}
          </div>

          {isEditingAnamnesis ? (
            <form onSubmit={handleSaveAnamnesis} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Queixa Principal / Motivo da Busca</label>
                <textarea
                  rows={3}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Início e Duração dos Sintomas</label>
                  <input
                    type="text"
                    value={symptomOnset}
                    onChange={(e) => setSymptomOnset(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Medicações em Uso Informadas</label>
                  <input
                    type="text"
                    value={currentMedications}
                    onChange={(e) => setCurrentMedications(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Histórico Médico e Psiquiátrico Prévio</label>
                <textarea
                  rows={2}
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <label className="block text-xs font-bold text-rose-800 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Fatores de Risco e Vulnerabilidades</span>
                  </label>
                  <textarea
                    rows={2}
                    value={riskFactors}
                    onChange={(e) => setRiskFactors(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <label className="block text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Fatores Protetivos e Rede de Apoio</span>
                  </label>
                  <textarea
                    rows={2}
                    value={protectiveFactors}
                    onChange={(e) => setProtectiveFactors(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Objetivos e Metas Terapêuticas</label>
                <textarea
                  rows={2}
                  value={therapeuticGoals}
                  onChange={(e) => setTherapeuticGoals(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Salvar Anamnese
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Queixa Principal / Motivo da Busca</span>
                <p className="text-slate-800 leading-relaxed text-sm">
                  {chiefComplaint || 'Nenhuma queixa inicial detalhada ainda.'}
                </p>
                {symptomOnset && (
                  <p className="text-slate-500 mt-2"><strong>Início dos Sintomas:</strong> {symptomOnset}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Histórico de Saúde & Medicações</span>
                  <p className="text-slate-700">{medicalHistory || 'Nenhum histórico médico relatado.'}</p>
                  <p className="text-slate-700 mt-1"><strong>Medicações:</strong> {currentMedications || 'Nega uso de medicações contínuas.'}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Objetivos Terapêuticos</span>
                  <p className="text-slate-700">{therapeuticGoals || 'Metas em definição conjunta com o paciente.'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200">
                  <span className="font-bold text-rose-800 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Fatores de Risco & Vulnerabilidades</span>
                  </span>
                  <p className="text-rose-900">{riskFactors || 'Nenhum fator de risco evidente identificado.'}</p>
                </div>

                <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
                  <span className="font-bold text-emerald-800 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Fatores de Proteção & Rede de Apoio</span>
                  </span>
                  <p className="text-emerald-900">{protectiveFactors || 'Rede de apoio familiar e amizades informada.'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Escalas Psicológicas (PHQ-9 & GAD-7) */}
      {activeTab === 'assessments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Escalas Psicométricas e Evolução dos Sintomas</h3>
              <p className="text-xs text-slate-500">Monitoramento quantitativo com PHQ-9 (depressão) e GAD-7 (ansiedade)</p>
            </div>
            <button
              onClick={() => setIsAssessmentModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Aplicar Escala</span>
            </button>
          </div>

          {patientAssessments.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
                Curva de Evolução Temporal dos Escores
              </h4>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="data" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="escore" stroke="#0d9488" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patientAssessments.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500 space-y-2">
                <Activity className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-medium text-slate-700">Nenhuma escala aplicada para este paciente.</p>
                <p className="text-xs text-slate-400">Aplique o PHQ-9 ou GAD-7 para acompanhar o progresso terapêutico com métricas objetivas.</p>
              </div>
            ) : (
              patientAssessments.map((a) => (
                <div key={a.id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold bg-brand-50 text-brand-800 px-2.5 py-1 rounded-lg border border-brand-200">
                      {a.type}
                    </span>
                    <span className="text-xs text-slate-500">{a.date}</span>
                  </div>

                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold text-slate-900">{a.totalScore}</span>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                        Gravidade: {a.severity}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {a.type === 'PHQ-9' ? 'Máx: 27' : 'Máx: 21'}
                      </span>
                    </div>
                  </div>

                  {a.alertItem && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-200">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Alerta Clínico: Resposta positiva no Item 9</span>
                    </div>
                  )}

                  {a.notes && (
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      "{a.notes}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Financeiro & Recibos */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Histórico de Sessões & Emissão de Documentos</h3>
              <p className="text-xs text-slate-500">Recibos para Reembolso e Declaração de IRPF</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 font-bold text-xs text-slate-700 uppercase tracking-wider">
              Atendimentos Registrados
            </div>

            <div className="divide-y divide-slate-100">
              {patientSessions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Nenhuma sessão registrada para este paciente.
                </div>
              ) : (
                patientSessions.map(ses => (
                  <div key={ses.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <span>Data: {ses.date} ({ses.startTime} - {ses.endTime})</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ses.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ses.paymentStatus === 'paid' ? 'PAGO' : 'PENDENTE'}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        Modalidade: {ses.modality.toUpperCase()} • Honorários: R$ {ses.price}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleGenerateReceipt(ses.price, ses.date)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-lg font-semibold transition-colors"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Recibo PDF</span>
                      </button>

                      <button
                        onClick={() => handleGenerateAttendance(ses.date, ses.startTime, ses.endTime)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-lg font-semibold transition-colors"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Declaração</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Dados Cadastrais */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block">Nome Completo</span>
              <p className="text-slate-900 font-medium mt-0.5">{patient.name}</p>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block">CPF</span>
              <p className="text-slate-900 font-medium mt-0.5">{patient.cpf || 'Não informado'}</p>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block">Data de Nascimento</span>
              <p className="text-slate-900 font-medium mt-0.5">{patient.birthDate || 'Não informada'}</p>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block">Telefone / WhatsApp</span>
              <p className="text-slate-900 font-medium mt-0.5">{patient.phone}</p>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block">E-mail</span>
              <p className="text-slate-900 font-medium mt-0.5">{patient.email || 'Não informado'}</p>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block">Profissão</span>
              <p className="text-slate-900 font-medium mt-0.5">{patient.profession || 'Não informada'}</p>
            </div>
            <div className="sm:col-span-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider block">Endereço Residencial</span>
              <p className="text-slate-900 font-medium mt-0.5">{patient.address || 'Não informado'}</p>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block">Contato de Emergência</span>
              <p className="text-slate-900 font-medium mt-0.5">
                {patient.emergencyContact?.name 
                  ? `${patient.emergencyContact.name} (${patient.emergencyContact.relationship}) - ${patient.emergencyContact.phone}` 
                  : 'Nenhum cadastrado'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modais */}
      {isRecordModalOpen && (
        <SessionRecordModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          patientId={patient.id}
          patientName={patient.name}
          existingRecord={selectedRecordForEdit}
        />
      )}

      {isAssessmentModalOpen && (
        <AssessmentModal
          isOpen={isAssessmentModalOpen}
          onClose={() => setIsAssessmentModalOpen(false)}
          patientId={patient.id}
          patientName={patient.name}
        />
      )}

      {isEditPatientModalOpen && (
        <PatientModal
          isOpen={isEditPatientModalOpen}
          onClose={() => setIsEditPatientModalOpen(false)}
          patientToEdit={patient}
        />
      )}
    </div>
  );
};
