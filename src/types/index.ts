export type PatientStatus = 'active' | 'paused' | 'discharged' | 'waiting_list' | 'abandoned';

export type Modality = 'presencial' | 'online';

export type SessionStatus = 
  | 'scheduled'            // Agendada
  | 'confirmed'            // Confirmada via WhatsApp
  | 'completed'            // Realizada
  | 'missed_chargeable'    // Falta com cobrança
  | 'missed_non_chargeable'// Falta sem cobrança
  | 'canceled';            // Cancelada

export type PaymentStatus = 'paid' | 'pending' | 'waived';

export type PaymentMethod = 'pix' | 'transfer' | 'cash' | 'card';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Patient {
  id: string;
  name: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  gender?: string;
  profession?: string;
  maritalStatus?: string;
  phone: string;
  email?: string;
  address?: string;
  emergencyContact?: EmergencyContact;
  legalGuardian?: string; // Se menor de idade
  status: PatientStatus;
  preferredModality: Modality;
  agreedPrice: number;
  usualSchedule?: string; // Ex: "Terças 14h"
  startDate: string;
  referralSource?: string; // Indicação, Instagram, etc.
  dischargeDate?: string;
  dischargeReason?: string;
  notes?: string;
  isPreRegistration?: boolean;
  preRegistrationData?: {
    submittedAt: string;
    consentLgpd: boolean;
    preferredShift?: string;
    initialComplaint?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Anamnesis {
  patientId: string;
  chiefComplaint: string;            // Queixa principal / motivo da busca
  symptomOnset?: string;             // Início dos sintomas
  medicalHistory?: string;           // Histórico médico e doenças preexistentes
  currentMedications?: string;       // Medicações em uso relatadas
  psychiatricHistory?: string;       // Acompanhamento psiquiátrico prévio
  familyHistory?: string;            // Dinâmica e histórico familiar
  routineAndHabits?: string;         // Sono, alimentação, substâncias
  riskFactors?: string;              // Ideação, autolesão, vulnerabilidades (com destaque)
  protectiveFactors?: string;        // Rede de apoio, hobbies, fatores protetivos
  therapeuticGoals?: string;         // Objetivos e metas terapêuticas
  lastUpdated: string;
}

export interface ClinicalRecordHistoryEntry {
  version: number;
  editedAt: string;
  reason: string;
  evolution: string;
  privateNotes?: string;
}

export interface ClinicalRecord {
  id: string;
  patientId: string;
  patientName?: string;
  sessionId: string;
  sessionDate: string;
  modality: Modality;
  themes: string;                    // Demandas e temas trabalhados
  interventions: string;             // Técnicas e intervenções realizadas
  emotionalState?: string;           // Humor, afeto e comportamento observado
  evolution: string;                 // Registro formal da evolução clínica
  homework?: string;                 // Tarefas/combinados para a próxima sessão
  privateNotes?: string;             // Anotações pessoais / reflexões do terapeuta (separado do prontuário oficial)
  version: number;
  history: ClinicalRecordHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  date: string;                      // YYYY-MM-DD
  startTime: string;                 // HH:mm
  endTime: string;                   // HH:mm
  modality: Modality;
  meetLink?: string;
  status: SessionStatus;
  price: number;
  paymentStatus: PaymentStatus;
  hasRecord: boolean;                // Se já possui evolução preenchida
  recordId?: string;
  notes?: string;
  createdAt: string;
}

export type AssessmentType = 'PHQ-9' | 'GAD-7';

export interface Assessment {
  id: string;
  patientId: string;
  patientName: string;
  type: AssessmentType;
  date: string;
  answers: number[];                 // Valores de 0 a 3 para cada item
  totalScore: number;
  severity: string;                  // Ex: Mínima, Leve, Moderada, Severa
  alertItem?: boolean;               // Ex: item 9 do PHQ-9 (ideação suicida)
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  patientId: string;
  patientName: string;
  sessionId?: string;
  sessionDate?: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface WhatsAppTemplates {
  reminder: string;
  confirmation: string;
  onlineLink: string;
  friendlyCharge: string;
  intakeInvite?: string;
}

export interface ClinicSettings {
  psychologistName: string;
  crp: string;
  cpf: string;
  email: string;
  phone: string;
  address: string;
  pixKey: string;
  bankDetails: string;
  defaultOnlineLink: string;
  idleTimeoutMinutes: number;
  lockPin?: string;
  whatsAppTemplates: WhatsAppTemplates;
}

export interface DashboardMetrics {
  activePatients: number;
  pausedPatients: number;
  dischargedPatients: number;
  waitingListCount: number;
  sessionsMonthCount: number;
  sessionsCompletedCount: number;
  absenceRatePercentage: number;
  revenueRealizedMonth: number;
  revenueProjectedMonth: number;
  pendingPaymentsTotal: number;
  pendingRecordsCount: number;
  onlineSessionsPercentage: number;
}
