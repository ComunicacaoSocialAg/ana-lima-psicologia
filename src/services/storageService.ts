import { 
  Patient, 
  Anamnesis, 
  Session, 
  ClinicalRecord, 
  Assessment, 
  Payment, 
  ClinicSettings,
  DashboardMetrics 
} from '../types';
import { DEFAULT_TEMPLATES } from './whatsappService';
import { saveAutomatedSnapshot, getAutomatedSnapshots } from './backupService';

const STORAGE_KEYS = {
  PATIENTS: 'ana_lima_patients_v1',
  ANAMNESIS: 'ana_lima_anamnesis_v1',
  SESSIONS: 'ana_lima_sessions_v1',
  RECORDS: 'ana_lima_records_v1',
  ASSESSMENTS: 'ana_lima_assessments_v1',
  PAYMENTS: 'ana_lima_payments_v1',
  SETTINGS: 'ana_lima_settings_v1',
  LOCKED_STATE: 'ana_lima_is_locked_v1',
  DEMO_PURGED_FLAG: 'ana_lima_demo_purged_v2',
};

// IDs dos dados fictícios de teste originais que devem ser expurgados automaticamente
export const LEGACY_DEMO_IDS = {
  patients: new Set(['pat-1', 'pat-2', 'pat-3', 'pat-4', 'pat-5']),
  sessions: new Set(['ses-1', 'ses-2', 'ses-3', 'ses-4']),
  records: new Set(['rec-1']),
  assessments: new Set(['ass-1', 'ass-2', 'ass-3']),
  payments: new Set(['pay-1', 'pay-2', 'pay-3', 'pay-4']),
};

export const INITIAL_SETTINGS: ClinicSettings = {
  psychologistName: "Ana Lima",
  crp: "04/60205",
  cpf: "234.567.890-12",
  email: "contato.anaplima@gmail.com",
  phone: "(31) 99294-9211",
  address: "Poços de Caldas/MG - Atendimento Presencial & Online",
  pixKey: "(31) 99294-9211",
  bankDetails: "Banco Inter (0077) | Agência 0001 | Conta 592819-0",
  defaultOnlineLink: "https://meet.google.com/qzw-mxto-pky",
  idleTimeoutMinutes: 15,
  lockPin: "1234",
  whatsAppTemplates: DEFAULT_TEMPLATES,
};

// Base limpa de produção (sem dados fictícios de teste)
const INITIAL_PATIENTS: Patient[] = [];
const INITIAL_ANAMNESIS: Record<string, Anamnesis> = {};
const INITIAL_SESSIONS: Session[] = [];
const INITIAL_RECORDS: ClinicalRecord[] = [];
const INITIAL_ASSESSMENTS: Assessment[] = [];
const INITIAL_PAYMENTS: Payment[] = [];

class StorageService {
  // Inicializa dados e remove automaticamente quaisquer registros de demonstração legados
  init(): void {
    const currentSettingsRaw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!currentSettingsRaw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    } else {
      try {
        const parsed = JSON.parse(currentSettingsRaw);
        let changed = false;
        if (parsed.address && parsed.address.includes('Belo Horizonte')) {
          parsed.address = parsed.address.replace('Belo Horizonte', 'Poços de Caldas');
          changed = true;
        }
        if (!parsed.lockPin) {
          parsed.lockPin = '1234';
          changed = true;
        }
        if (!parsed.whatsAppTemplates?.intakeInvite || parsed.whatsAppTemplates?.intakeInvite?.includes('🌸') || parsed.whatsAppTemplates?.intakeInvite?.includes('👉')) {
          parsed.whatsAppTemplates = {
            ...parsed.whatsAppTemplates,
            intakeInvite: INITIAL_SETTINGS.whatsAppTemplates.intakeInvite
          };
          changed = true;
        }
        if (!parsed.whatsAppTemplates?.confirmation || !parsed.whatsAppTemplates?.confirmation?.includes('{agenda}')) {
          parsed.whatsAppTemplates = {
            ...parsed.whatsAppTemplates,
            confirmation: INITIAL_SETTINGS.whatsAppTemplates.confirmation
          };
          changed = true;
        }
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn('Erro ao migrar configurações no storage:', e);
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.PATIENTS)) {
      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(INITIAL_PATIENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ANAMNESIS)) {
      localStorage.setItem(STORAGE_KEYS.ANAMNESIS, JSON.stringify(INITIAL_ANAMNESIS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SESSIONS)) {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(INITIAL_SESSIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.RECORDS)) {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(INITIAL_RECORDS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ASSESSMENTS)) {
      localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(INITIAL_ASSESSMENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
    }

    // Expurga automaticamente os dados fictícios de teste caso estejam salvos no navegador
    this.purgeDemoData();

    if (getAutomatedSnapshots().length === 0) {
      this.triggerAutoSnapshot('Snapshot Inicial do Sistema (Base Limpa)');
    }
  }

  // Remove todos os registros fictícios de teste preservando cadastros reais
  purgeDemoData(): void {
    try {
      const patients = this.getPatients().filter(p => !LEGACY_DEMO_IDS.patients.has(p.id));
      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));

      const anamMap = this.getAllAnamnesis();
      for (const demoPid of LEGACY_DEMO_IDS.patients) {
        delete anamMap[demoPid];
      }
      localStorage.setItem(STORAGE_KEYS.ANAMNESIS, JSON.stringify(anamMap));

      const sessions = this.getSessions().filter(
        s => !LEGACY_DEMO_IDS.sessions.has(s.id) && !LEGACY_DEMO_IDS.patients.has(s.patientId)
      );
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));

      const records = this.getRecords().filter(
        r => !LEGACY_DEMO_IDS.records.has(r.id) && !LEGACY_DEMO_IDS.patients.has(r.patientId)
      );
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));

      const assessments = this.getAssessments().filter(
        a => !LEGACY_DEMO_IDS.assessments.has(a.id) && !LEGACY_DEMO_IDS.patients.has(a.patientId)
      );
      localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(assessments));

      const payments = this.getPayments().filter(
        pay => !LEGACY_DEMO_IDS.payments.has(pay.id) && !LEGACY_DEMO_IDS.patients.has(pay.patientId)
      );
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

      localStorage.setItem(STORAGE_KEYS.DEMO_PURGED_FLAG, 'true');
    } catch (e) {
      console.warn('Erro ao limpar dados de teste:', e);
    }
  }

  // Limpa integralmente todos os registros operacionais (mantendo apenas as Configurações da Ana)
  clearAllOperationalData(): void {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ANAMNESIS, JSON.stringify({}));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    this.triggerAutoSnapshot('Base Operacional Zerada Manualmente');
  }

  // Persistência do Bloqueio de Tela contra F5 / recarregamento da aba
  getIsScreenLocked(): boolean {
    return localStorage.getItem(STORAGE_KEYS.LOCKED_STATE) === 'true';
  }

  setIsScreenLocked(locked: boolean): void {
    localStorage.setItem(STORAGE_KEYS.LOCKED_STATE, locked ? 'true' : 'false');
  }

  // Aciona o cofre de espelhamento e redundância automática
  private triggerAutoSnapshot(reason: string): void {
    try {
      saveAutomatedSnapshot(this.getFullBackupData(), reason);
    } catch (e) {
      console.warn('Alerta na redundância automática:', e);
    }
  }

  // Patients
  getPatients(): Patient[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PATIENTS);
    return raw ? JSON.parse(raw) : INITIAL_PATIENTS;
  }

  savePatient(patient: Patient): Patient {
    const list = this.getPatients();
    const index = list.findIndex(p => p.id === patient.id);
    if (index >= 0) {
      list[index] = { ...patient, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(patient);
    }
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(list));
    this.triggerAutoSnapshot(`Atualização de Paciente: ${patient.name}`);
    return patient;
  }

  // Exclusão em cascata relacional: remove paciente e todas as sessões, evoluções, escalas, pagamentos e anamnese vinculados
  deletePatient(id: string): void {
    const list = this.getPatients().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(list));

    const sessions = this.getSessions().filter(s => s.patientId !== id);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));

    const records = this.getRecords().filter(r => r.patientId !== id);
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));

    const assessments = this.getAssessments().filter(a => a.patientId !== id);
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(assessments));

    const payments = this.getPayments().filter(p => p.patientId !== id);
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

    const anamMap = this.getAllAnamnesis();
    if (anamMap[id]) {
      delete anamMap[id];
      localStorage.setItem(STORAGE_KEYS.ANAMNESIS, JSON.stringify(anamMap));
    }

    this.triggerAutoSnapshot('Remoção de Paciente e Registros Vinculados');
  }

  // Anamnesis
  getAllAnamnesis(): Record<string, Anamnesis> {
    const raw = localStorage.getItem(STORAGE_KEYS.ANAMNESIS);
    return raw ? JSON.parse(raw) : INITIAL_ANAMNESIS;
  }

  setAllAnamnesis(map: Record<string, Anamnesis>): void {
    localStorage.setItem(STORAGE_KEYS.ANAMNESIS, JSON.stringify(map));
  }

  getAnamnesis(patientId: string): Anamnesis | null {
    const map = this.getAllAnamnesis();
    return map[patientId] || null;
  }

  saveAnamnesis(anamnesis: Anamnesis): void {
    const map = this.getAllAnamnesis();
    map[anamnesis.patientId] = { ...anamnesis, lastUpdated: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.ANAMNESIS, JSON.stringify(map));
    this.triggerAutoSnapshot('Atualização de Anamnese Clínica');
  }

  // Sessions (Sincronizadas automaticamente com o módulo Financeiro)
  getSessions(): Session[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return raw ? JSON.parse(raw) : INITIAL_SESSIONS;
  }

  saveSession(session: Session): { session: Session; syncedPayment: Payment } {
    const list = this.getSessions();
    const index = list.findIndex(s => s.id === session.id);
    if (index >= 0) {
      list[index] = session;
    } else {
      list.unshift(session);
    }
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(list));

    // Sincroniza automaticamente o lançamento correspondente na aba Financeiro
    const payments = this.getPayments();
    const existingPayIdx = payments.findIndex(p => p.sessionId === session.id);
    const isNonChargeable = session.status === 'canceled' || session.status === 'missed_non_chargeable';
    const targetPayStatus = isNonChargeable ? 'waived' : session.paymentStatus;

    let syncedPayment: Payment;
    if (existingPayIdx >= 0) {
      const prev = payments[existingPayIdx];
      syncedPayment = {
        ...prev,
        patientId: session.patientId,
        patientName: session.patientName,
        sessionDate: session.date,
        dueDate: session.date,
        amount: session.price,
        status: targetPayStatus,
        paidDate: targetPayStatus === 'paid' ? (prev.paidDate || session.date) : undefined,
        paymentMethod: targetPayStatus === 'paid' ? (prev.paymentMethod || 'pix') : prev.paymentMethod,
        receiptNumber: targetPayStatus === 'paid'
          ? (prev.receiptNumber || `REC-${new Date().getFullYear()}-${String(payments.length + 1).padStart(3, '0')}`)
          : prev.receiptNumber,
      };
      payments[existingPayIdx] = syncedPayment;
    } else {
      syncedPayment = {
        id: `pay-ses-${session.id}`,
        patientId: session.patientId,
        patientName: session.patientName,
        sessionId: session.id,
        sessionDate: session.date,
        amount: session.price,
        dueDate: session.date,
        status: targetPayStatus,
        paidDate: targetPayStatus === 'paid' ? session.date : undefined,
        paymentMethod: targetPayStatus === 'paid' ? 'pix' : undefined,
        receiptNumber: targetPayStatus === 'paid'
          ? `REC-${new Date().getFullYear()}-${String(payments.length + 1).padStart(3, '0')}`
          : undefined,
        notes: session.notes || `Sessão (${session.modality}) - ${session.startTime}`,
        createdAt: new Date().toISOString(),
      };
      payments.unshift(syncedPayment);
    }
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

    this.triggerAutoSnapshot(`Agendamento/Sessão: ${session.patientName}`);
    return { session, syncedPayment };
  }

  deleteSession(id: string): void {
    const list = this.getSessions().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(list));

    // Remove também eventual lançamento financeiro vinculado a esta sessão
    const payments = this.getPayments().filter(p => p.sessionId !== id);
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

    this.triggerAutoSnapshot('Cancelamento/Exclusão de Sessão');
  }

  // Clinical Records (Evoluções com Versionamento Imutável)
  getRecords(): ClinicalRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
    return raw ? JSON.parse(raw) : INITIAL_RECORDS;
  }

  getRecordsByPatient(patientId: string): ClinicalRecord[] {
    return this.getRecords()
      .filter(r => r.patientId === patientId)
      .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
  }

  saveRecord(record: ClinicalRecord, editReason?: string): ClinicalRecord {
    const list = this.getRecords();
    const index = list.findIndex(r => r.id === record.id);
    
    if (index >= 0) {
      // Se for edição, arquiva a versão anterior no histórico (Conformidade CFP)
      const existing = list[index];
      const newVersion = existing.version + 1;
      const historyEntry = {
        version: existing.version,
        editedAt: new Date().toISOString(),
        reason: editReason || 'Revisão clínica da anotação',
        evolution: existing.evolution,
        privateNotes: existing.privateNotes,
      };

      const updatedRecord: ClinicalRecord = {
        ...record,
        version: newVersion,
        history: [...(existing.history || []), historyEntry],
        updatedAt: new Date().toISOString(),
      };
      list[index] = updatedRecord;
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(list));
      this.triggerAutoSnapshot(`Revisão de Prontuário (v${newVersion}): ${record.patientName}`);
      return updatedRecord;
    } else {
      const newRecord: ClinicalRecord = {
        ...record,
        version: 1,
        history: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.unshift(newRecord);
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(list));

      // Atualiza a sessão vinculada marcando hasRecord = true
      if (record.sessionId) {
        const sessions = this.getSessions();
        const sesIdx = sessions.findIndex(s => s.id === record.sessionId);
        if (sesIdx >= 0) {
          sessions[sesIdx].hasRecord = true;
          sessions[sesIdx].recordId = newRecord.id;
          localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
        }
      }
      this.triggerAutoSnapshot(`Nova Evolução Clínica: ${record.patientName}`);
      return newRecord;
    }
  }

  // Assessments (PHQ-9 / GAD-7)
  getAssessments(): Assessment[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
    return raw ? JSON.parse(raw) : INITIAL_ASSESSMENTS;
  }

  getAssessmentsByPatient(patientId: string): Assessment[] {
    return this.getAssessments()
      .filter(a => a.patientId === patientId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  saveAssessment(assessment: Assessment): Assessment {
    const list = this.getAssessments();
    const index = list.findIndex(a => a.id === assessment.id);
    if (index >= 0) {
      list[index] = assessment;
    } else {
      list.unshift(assessment);
    }
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(list));
    this.triggerAutoSnapshot(`Escala ${assessment.type}: ${assessment.patientName} (${assessment.severity})`);
    return assessment;
  }

  // Payments
  getPayments(): Payment[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return raw ? JSON.parse(raw) : INITIAL_PAYMENTS;
  }

  savePayment(payment: Payment): Payment {
    const list = this.getPayments();
    const index = list.findIndex(p => p.id === payment.id);
    if (index >= 0) {
      list[index] = payment;
    } else {
      list.unshift(payment);
    }
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(list));
    this.triggerAutoSnapshot(`Recibo/Financeiro: ${payment.patientName} - R$ ${payment.amount}`);
    return payment;
  }

  // Settings
  getSettings(): ClinicSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return INITIAL_SETTINGS;
    try {
      const parsed = JSON.parse(raw);
      let changed = false;
      if (parsed.address && parsed.address.includes('Belo Horizonte')) {
        parsed.address = parsed.address.replace('Belo Horizonte', 'Poços de Caldas');
        changed = true;
      }
      if (!parsed.whatsAppTemplates?.intakeInvite || parsed.whatsAppTemplates?.intakeInvite?.includes('🌸') || parsed.whatsAppTemplates?.intakeInvite?.includes('👉')) {
        parsed.whatsAppTemplates = {
          ...parsed.whatsAppTemplates,
          intakeInvite: INITIAL_SETTINGS.whatsAppTemplates.intakeInvite
        };
        changed = true;
      }
      if (!parsed.whatsAppTemplates?.confirmation || !parsed.whatsAppTemplates?.confirmation?.includes('{agenda}')) {
        parsed.whatsAppTemplates = {
          ...parsed.whatsAppTemplates,
          confirmation: INITIAL_SETTINGS.whatsAppTemplates.confirmation
        };
        changed = true;
      }
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  saveSettings(settings: ClinicSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.triggerAutoSnapshot('Atualização de Configurações da Clínica');
  }

  // Métricas Consolidadas para o Dashboard
  getDashboardMetrics(): DashboardMetrics {
    const patients = this.getPatients();
    const sessions = this.getSessions();
    const payments = this.getPayments();

    const activePatients = patients.filter(p => p.status === 'active').length;
    const pausedPatients = patients.filter(p => p.status === 'paused').length;
    const dischargedPatients = patients.filter(p => p.status === 'discharged').length;
    const waitingListCount = patients.filter(p => p.status === 'waiting_list').length;

    const completedSessions = sessions.filter(s => s.status === 'completed');
    const missedSessions = sessions.filter(s => s.status === 'missed_chargeable' || s.status === 'missed_non_chargeable');
    const totalFinished = completedSessions.length + missedSessions.length;
    const absenceRate = totalFinished > 0 ? Math.round((missedSessions.length / totalFinished) * 100) : 0;

    const onlineCount = sessions.filter(s => s.modality === 'online').length;
    const onlinePercentage = sessions.length > 0 ? Math.round((onlineCount / sessions.length) * 100) : 0;

    const revenueRealized = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingTotal = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const revenueProjected = revenueRealized + pendingTotal;

    const pendingRecords = sessions.filter(s => s.status === 'completed' && !s.hasRecord).length;

    return {
      activePatients,
      pausedPatients,
      dischargedPatients,
      waitingListCount,
      sessionsMonthCount: sessions.length,
      sessionsCompletedCount: completedSessions.length,
      absenceRatePercentage: absenceRate,
      revenueRealizedMonth: revenueRealized,
      revenueProjectedMonth: revenueProjected,
      pendingPaymentsTotal: pendingTotal,
      pendingRecordsCount: pendingRecords,
      onlineSessionsPercentage: onlinePercentage,
    };
  }

  // Backup Completo
  getFullBackupData() {
    return {
      patients: this.getPatients(),
      anamnesis: JSON.parse(localStorage.getItem(STORAGE_KEYS.ANAMNESIS) || '{}'),
      sessions: this.getSessions(),
      clinicalRecords: this.getRecords(),
      assessments: this.getAssessments(),
      payments: this.getPayments(),
      settings: this.getSettings(),
    };
  }

  // Setters diretos para atualização via sincronização em nuvem
  setPatients(patients: Patient[]): void {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
  }

  setSessions(sessions: Session[]): void {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }

  setRecords(records: ClinicalRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  }

  setAssessments(assessments: Assessment[]): void {
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(assessments));
  }

  setPayments(payments: Payment[]): void {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }

  restoreBackupData(data: ReturnType<StorageService['getFullBackupData']>): void {
    if (data.patients) localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(data.patients));
    if (data.anamnesis) localStorage.setItem(STORAGE_KEYS.ANAMNESIS, JSON.stringify(data.anamnesis));
    if (data.sessions) localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(data.sessions));
    if (data.clinicalRecords) localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(data.clinicalRecords));
    if (data.assessments) localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(data.assessments));
    if (data.payments) localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(data.payments));
    if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    this.triggerAutoSnapshot('Restauração de Backup Completo');
  }
}

export const storageService = new StorageService();
