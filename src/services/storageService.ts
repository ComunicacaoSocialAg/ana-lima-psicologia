import { buildLedgerPayments } from "./financialLedger";
import {
  Patient,
  Anamnesis,
  Session,
  ClinicalRecord,
  Assessment,
  Payment,
  ClinicSettings,
  DashboardMetrics,
} from "../types";
import { DEFAULT_TEMPLATES } from "./whatsappService";
import { saveAutomatedSnapshot, getAutomatedSnapshots } from "./backupService";
import {
  vaultSetItem,
  vaultGetItem,
  vaultReadCached,
} from "./localVaultCrypto";

const STORAGE_KEYS = {
  PATIENTS: "ana_lima_patients_v1",
  ANAMNESIS: "ana_lima_anamnesis_v1",
  SESSIONS: "ana_lima_sessions_v1",
  RECORDS: "ana_lima_records_v1",
  ASSESSMENTS: "ana_lima_assessments_v1",
  PAYMENTS: "ana_lima_payments_v1",
  SETTINGS: "ana_lima_settings_v1",
  LOCKED_STATE: "ana_lima_is_locked_v1",
  DEMO_PURGED_FLAG: "ana_lima_demo_purged_v2",
};

// IDs históricos preservados para identificação; nunca usados para limpeza automática.
export const LEGACY_DEMO_IDS = {
  patients: new Set(["pat-1", "pat-2", "pat-3", "pat-4", "pat-5"]),
  sessions: new Set(["ses-1", "ses-2", "ses-3", "ses-4"]),
  records: new Set(["rec-1"]),
  assessments: new Set(["ass-1", "ass-2", "ass-3"]),
  payments: new Set(["pay-1", "pay-2", "pay-3", "pay-4"]),
};

export const INITIAL_SETTINGS: ClinicSettings = {
  psychologistName: "Ana Lima",
  crp: "04/60205",
  cpf: "",
  email: "contato.anaplima@gmail.com",
  phone: "(31) 99294-9211",
  address: "Poços de Caldas/MG - Atendimento Presencial & Online",
  pixKey: "(31) 99294-9211",
  bankDetails: "",
  defaultOnlineLink: "",
  idleTimeoutMinutes: 15,
  lockPin: "",
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
  getFinancialLedger(): { charges: any[]; coverage: string[] } {
    const raw =
      typeof localStorage !== "undefined"
        ? vaultReadCached("ana_lima_financial_ledger_v2") ||
          localStorage.getItem("ana_lima_financial_ledger_v2")
        : null;
    return JSON.parse(raw || '{"charges":[],"coverage":[]}');
  }
  setFinancialLedger(value: { charges?: any[]; coverage?: string[] }) {
    const ledger = { ...this.getFinancialLedger(), ...value };
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(
          "ana_lima_financial_ledger_v2",
          JSON.stringify(ledger),
        );
      } catch {}
    }
    void vaultSetItem("ana_lima_financial_ledger_v2", JSON.stringify(ledger)).catch(() => {});
  }
  getUncoveredPayments() {
    const covered = new Set(this.getFinancialLedger().coverage);
    return this.getPayments().filter((p) => !covered.has(p.id));
  }
  private billingManaged = new Set<string>();
  setBillingManagedPatients(ids: string[]) {
    this.billingManaged = new Set(ids);
  }
  isBillingManaged(id: string) {
    return this.billingManaged.has(id);
  }
  clearInMemory() {
    this.memoryCache.clear();
    this.billingManaged.clear();
  }
  private memoryCache: Map<string, any> = new Map();

  // Persiste simultaneamente no cache em memória (0ms para UI síncrona), no localStorage e no cofre se ativo
  private persist(key: string, data: any): void {
    this.memoryCache.set(key, data);
    const serialized = JSON.stringify(data);
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(key, serialized);
      } catch (e) {
        console.warn(`Alerta ao persistir em localStorage '${key}':`, e);
      }
    }
    vaultSetItem(key, serialized).catch(() => {});
  }

  // Hidrata o cache de memória decifrando os dados protegidos pelo cofre (Web Crypto AES-256-GCM)
  async hydrateFromVault(): Promise<void> {
    const keysToHydrate = [
      STORAGE_KEYS.SETTINGS,
      STORAGE_KEYS.PATIENTS,
      STORAGE_KEYS.ANAMNESIS,
      STORAGE_KEYS.SESSIONS,
      STORAGE_KEYS.RECORDS,
      STORAGE_KEYS.ASSESSMENTS,
      STORAGE_KEYS.PAYMENTS,
    ];

    for (const key of keysToHydrate) {
      try {
        const decrypted = await vaultGetItem(key);
        if (decrypted) {
          const parsed = JSON.parse(decrypted);
          this.memoryCache.set(key, parsed);

          // Se no localStorage ainda estava em texto puro (migração automática transparente), cifra agora
          if (typeof localStorage !== "undefined") {
            const raw = localStorage.getItem(key);
            if (raw && !raw.includes('"_vault":true')) {
              await vaultSetItem(key, decrypted);
            }
          }
        }
      } catch (e) {
        console.warn(`Falha na hidratação do cofre para chave ${key}:`, e);
      }
    }
  }

  // No automatic purge, seed or overwrite during startup. Legacy data remains recoverable.
  init(): void {}

  // Remove todos os registros fictícios de teste preservando cadastros reais
  purgeDemoData(): void {
    throw new Error(
      "Limpeza automática desabilitada. Preserve o histórico e revise dados individualmente.",
    );
  }

  clearAllOperationalData(): void {
    throw new Error(
      "Limpeza da base desabilitada. Use a recuperação documentada em ambiente isolado.",
    );
  }

  // Persistência do Bloqueio de Tela contra F5 / recarregamento da aba
  getIsScreenLocked(): boolean {
    if (this.memoryCache.has(STORAGE_KEYS.LOCKED_STATE)) {
      return this.memoryCache.get(STORAGE_KEYS.LOCKED_STATE) === true;
    }
    return typeof localStorage !== "undefined"
      ? vaultReadCached(STORAGE_KEYS.LOCKED_STATE) === "true"
      : false;
  }

  setIsScreenLocked(locked: boolean): void {
    this.memoryCache.set(STORAGE_KEYS.LOCKED_STATE, locked);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        STORAGE_KEYS.LOCKED_STATE,
        locked ? "true" : "false",
      );
    }
  }

  // Aciona o cofre de espelhamento e redundância automática
  public triggerAutoSnapshot(reason: string): void {
    try {
      saveAutomatedSnapshot(this.getFullBackupData(), reason);
    } catch (e) {
      console.warn("Alerta na redundância automática:", e);
    }
  }

  // Patients
  getPatients(): Patient[] {
    if (this.memoryCache.has(STORAGE_KEYS.PATIENTS)) {
      return this.memoryCache.get(STORAGE_KEYS.PATIENTS);
    }
    const raw =
      typeof localStorage !== "undefined"
        ? vaultReadCached(STORAGE_KEYS.PATIENTS) ||
          localStorage.getItem(STORAGE_KEYS.PATIENTS)
        : null;
    if (raw && !raw.includes('"_vault":true')) {
      try {
        const parsed = JSON.parse(raw);
        this.memoryCache.set(STORAGE_KEYS.PATIENTS, parsed);
        return parsed;
      } catch {
        return INITIAL_PATIENTS;
      }
    }
    return INITIAL_PATIENTS;
  }

  savePatient(patient: Patient): Patient {
    const list = [...this.getPatients()];
    const index = list.findIndex((p) => p.id === patient.id);
    const nowIso = new Date().toISOString();
    const updatedPatient: Patient = {
      ...patient,
      createdAt: patient.createdAt || nowIso,
      updatedAt: nowIso,
    };

    if (index >= 0) {
      list[index] = updatedPatient;
    } else {
      list.unshift(updatedPatient);
    }
    this.persist(STORAGE_KEYS.PATIENTS, list);
    this.triggerAutoSnapshot(`Atualização de Paciente: ${patient.name}`);
    return updatedPatient;
  }

  // Desvinculação de paciente da lista ativa com preservação ética dos prontuários (Lei 13.787/2018 e CFP 001/2009)
  deletePatient(id: string): void {
    const patient = this.getPatients().find((p) => p.id === id);
    if (patient)
      this.savePatient({
        ...patient,
        status: "discharged",
        dischargeDate: new Date().toISOString().slice(0, 10),
      });
  }

  // Anamnesis
  getAllAnamnesis(): Record<string, Anamnesis> {
    if (this.memoryCache.has(STORAGE_KEYS.ANAMNESIS)) {
      return this.memoryCache.get(STORAGE_KEYS.ANAMNESIS);
    }
    const raw =
      typeof localStorage !== "undefined"
        ? vaultReadCached(STORAGE_KEYS.ANAMNESIS) ||
          localStorage.getItem(STORAGE_KEYS.ANAMNESIS)
        : null;
    if (raw && !raw.includes('"_vault":true')) {
      try {
        const parsed = JSON.parse(raw);
        this.memoryCache.set(STORAGE_KEYS.ANAMNESIS, parsed);
        return parsed;
      } catch {
        return INITIAL_ANAMNESIS;
      }
    }
    return INITIAL_ANAMNESIS;
  }

  setAllAnamnesis(map: Record<string, Anamnesis>): void {
    this.persist(STORAGE_KEYS.ANAMNESIS, map);
  }

  getAnamnesis(patientId: string): Anamnesis | null {
    const map = this.getAllAnamnesis();
    return map[patientId] || null;
  }

  saveAnamnesis(anamnesis: Anamnesis): void {
    const map = { ...this.getAllAnamnesis() };
    map[anamnesis.patientId] = {
      ...anamnesis,
      lastUpdated: new Date().toISOString(),
    };
    this.persist(STORAGE_KEYS.ANAMNESIS, map);
    this.triggerAutoSnapshot("Atualização de Anamnese Clínica");
  }

  // Sessions (Sincronizadas automaticamente com o módulo Financeiro)
  getSessions(): Session[] {
    if (this.memoryCache.has(STORAGE_KEYS.SESSIONS)) {
      return this.memoryCache.get(STORAGE_KEYS.SESSIONS);
    }
    const raw =
      typeof localStorage !== "undefined"
        ? vaultReadCached(STORAGE_KEYS.SESSIONS) ||
          localStorage.getItem(STORAGE_KEYS.SESSIONS)
        : null;
    if (raw && !raw.includes('"_vault":true')) {
      try {
        const parsed = JSON.parse(raw);
        this.memoryCache.set(STORAGE_KEYS.SESSIONS, parsed);
        return parsed;
      } catch {
        return INITIAL_SESSIONS;
      }
    }
    return INITIAL_SESSIONS;
  }

  saveSession(session: Session): { session: Session; syncedPayment?: Payment } {
    const list = [...this.getSessions()];
    const index = list.findIndex((s) => s.id === session.id);
    if (index >= 0) {
      list[index] = session;
    } else {
      list.unshift(session);
    }
    this.persist(STORAGE_KEYS.SESSIONS, list);

    if (this.billingManaged.has(session.patientId)) {
      this.triggerAutoSnapshot("Sessão com cobrança integrada");
      return { session };
    }

    // Sincroniza automaticamente o lançamento correspondente na aba Financeiro
    const payments = [...this.getPayments()];
    const existingPayIdx = payments.findIndex(
      (p) => p.sessionId === session.id,
    );
    const isNonChargeable =
      session.status === "canceled" ||
      session.status === "missed_non_chargeable";
    const previouslyPaid =
      existingPayIdx >= 0 && payments[existingPayIdx].status === "paid";
    const targetPayStatus = previouslyPaid
      ? "paid"
      : isNonChargeable
        ? "waived"
        : session.paymentStatus;

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
        paidDate:
          targetPayStatus === "paid"
            ? prev.paidDate || session.date
            : undefined,
        paymentMethod:
          targetPayStatus === "paid"
            ? prev.paymentMethod || "pix"
            : prev.paymentMethod,
        receiptNumber:
          targetPayStatus === "paid"
            ? prev.receiptNumber ||
              `REC-${new Date().getFullYear()}-${String(payments.length + 1).padStart(3, "0")}`
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
        paidDate: targetPayStatus === "paid" ? session.date : undefined,
        paymentMethod: targetPayStatus === "paid" ? "pix" : undefined,
        receiptNumber:
          targetPayStatus === "paid"
            ? `REC-${new Date().getFullYear()}-${String(payments.length + 1).padStart(3, "0")}`
            : undefined,
        notes:
          session.notes ||
          `Sessão (${session.modality}) - ${session.startTime}`,
        createdAt: new Date().toISOString(),
      };
      payments.unshift(syncedPayment);
    }
    this.persist(STORAGE_KEYS.PAYMENTS, payments);

    this.triggerAutoSnapshot(`Agendamento/Sessão: ${session.patientName}`);
    return { session, syncedPayment };
  }

  deleteSession(id: string): void {
    const list = this.getSessions().map((s) =>
      s.id === id ? { ...s, status: "canceled" as const } : s,
    );
    this.persist(STORAGE_KEYS.SESSIONS, list);
    this.triggerAutoSnapshot(
      "Sessão cancelada; histórico financeiro preservado",
    );
  }

  // Clinical Records (Evoluções com Versionamento Imutável & Conformidade CFP)
  getRecords(): ClinicalRecord[] {
    if (this.memoryCache.has(STORAGE_KEYS.RECORDS)) {
      return this.memoryCache.get(STORAGE_KEYS.RECORDS);
    }
    const raw =
      typeof localStorage !== "undefined"
        ? vaultReadCached(STORAGE_KEYS.RECORDS) ||
          localStorage.getItem(STORAGE_KEYS.RECORDS)
        : null;
    if (raw && !raw.includes('"_vault":true')) {
      try {
        const parsed = JSON.parse(raw);
        this.memoryCache.set(STORAGE_KEYS.RECORDS, parsed);
        return parsed;
      } catch {
        return INITIAL_RECORDS;
      }
    }
    return INITIAL_RECORDS;
  }

  getRecordsByPatient(patientId: string): ClinicalRecord[] {
    return this.getRecords()
      .filter((r) => r.patientId === patientId)
      .sort(
        (a, b) =>
          new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime(),
      );
  }

  saveRecord(record: ClinicalRecord, editReason?: string): ClinicalRecord {
    const list = [...this.getRecords()];
    const index = list.findIndex((r) => r.id === record.id);

    if (index >= 0) {
      // Se for edição, arquiva a versão anterior no histórico imutável (Conformidade CFP)
      const existing = list[index];
      const newVersion = (existing.version || 1) + 1;
      const historyEntry = {
        version: existing.version || 1,
        editedAt: new Date().toISOString(),
        reason: editReason || "Revisão clínica da anotação",
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
      this.persist(STORAGE_KEYS.RECORDS, list);
      this.triggerAutoSnapshot(
        `Revisão de Prontuário (v${newVersion}): ${record.patientName}`,
      );
      return updatedRecord;
    } else {
      const newRecord: ClinicalRecord = {
        ...record,
        version: 1,
        history: [],
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.unshift(newRecord);
      this.persist(STORAGE_KEYS.RECORDS, list);

      // Atualiza a sessão vinculada marcando hasRecord = true
      if (record.sessionId) {
        const sessions = [...this.getSessions()];
        const sesIdx = sessions.findIndex((s) => s.id === record.sessionId);
        if (sesIdx >= 0) {
          sessions[sesIdx].hasRecord = true;
          sessions[sesIdx].recordId = newRecord.id;
          this.persist(STORAGE_KEYS.SESSIONS, sessions);
        }
      }
      this.triggerAutoSnapshot(`Nova Evolução Clínica: ${record.patientName}`);
      return newRecord;
    }
  }

  // Assessments (PHQ-9 / GAD-7)
  getAssessments(): Assessment[] {
    if (this.memoryCache.has(STORAGE_KEYS.ASSESSMENTS)) {
      return this.memoryCache.get(STORAGE_KEYS.ASSESSMENTS);
    }
    const raw =
      typeof localStorage !== "undefined"
        ? vaultReadCached(STORAGE_KEYS.ASSESSMENTS) ||
          localStorage.getItem(STORAGE_KEYS.ASSESSMENTS)
        : null;
    if (raw && !raw.includes('"_vault":true')) {
      try {
        const parsed = JSON.parse(raw);
        this.memoryCache.set(STORAGE_KEYS.ASSESSMENTS, parsed);
        return parsed;
      } catch {
        return INITIAL_ASSESSMENTS;
      }
    }
    return INITIAL_ASSESSMENTS;
  }

  getAssessmentsByPatient(patientId: string): Assessment[] {
    return this.getAssessments()
      .filter((a) => a.patientId === patientId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  saveAssessment(assessment: Assessment): Assessment {
    const list = [...this.getAssessments()];
    const index = list.findIndex((a) => a.id === assessment.id);
    if (index >= 0) {
      list[index] = assessment;
    } else {
      list.unshift(assessment);
    }
    this.persist(STORAGE_KEYS.ASSESSMENTS, list);
    this.triggerAutoSnapshot(
      `Escala ${assessment.type}: ${assessment.patientName} (${assessment.severity})`,
    );
    return assessment;
  }

  // Payments
  getPayments(): Payment[] {
    if (this.memoryCache.has(STORAGE_KEYS.PAYMENTS)) {
      return this.memoryCache.get(STORAGE_KEYS.PAYMENTS);
    }
    const raw =
      typeof localStorage !== "undefined"
        ? vaultReadCached(STORAGE_KEYS.PAYMENTS) ||
          localStorage.getItem(STORAGE_KEYS.PAYMENTS)
        : null;
    if (raw && !raw.includes('"_vault":true')) {
      try {
        const parsed = JSON.parse(raw);
        this.memoryCache.set(STORAGE_KEYS.PAYMENTS, parsed);
        return parsed;
      } catch {
        return INITIAL_PAYMENTS;
      }
    }
    return INITIAL_PAYMENTS;
  }

  savePayment(payment: Payment): Payment {
    const list = [...this.getPayments()];
    const index = list.findIndex((p) => p.id === payment.id);
    if (index >= 0) {
      list[index] = payment;
    } else {
      list.unshift(payment);
    }
    this.persist(STORAGE_KEYS.PAYMENTS, list);
    this.triggerAutoSnapshot(
      `Recibo/Financeiro: ${payment.patientName} - R$ ${payment.amount}`,
    );
    return payment;
  }

  // Settings
  getSettings(): ClinicSettings {
    if (this.memoryCache.has(STORAGE_KEYS.SETTINGS)) {
      return this.memoryCache.get(STORAGE_KEYS.SETTINGS);
    }
    const raw =
      typeof localStorage !== "undefined"
        ? vaultReadCached(STORAGE_KEYS.SETTINGS) ||
          localStorage.getItem(STORAGE_KEYS.SETTINGS)
        : null;
    if (!raw) return INITIAL_SETTINGS;
    if (!raw.includes('"_vault":true')) {
      try {
        const parsed = JSON.parse(raw);
        this.memoryCache.set(STORAGE_KEYS.SETTINGS, parsed);
        return parsed;
      } catch {
        return INITIAL_SETTINGS;
      }
    }
    return INITIAL_SETTINGS;
  }

  saveSettings(settings: ClinicSettings): void {
    this.persist(STORAGE_KEYS.SETTINGS, settings);
    this.triggerAutoSnapshot("Atualização de Configurações da Clínica");
  }

  // Métricas Consolidadas para o Dashboard (100% integradas em tempo real ao banco de dados)
  getDashboardMetrics(): DashboardMetrics {
    const patients = this.getPatients();
    const sessions = this.getSessions();
    const ledger = this.getFinancialLedger();
    const payments = buildLedgerPayments(
      this.getPayments(),
      ledger.charges,
      ledger.coverage,
    );
    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM

    const activePatients = patients.filter((p) => p.status === "active").length;
    const pausedPatients = patients.filter((p) => p.status === "paused").length;
    const dischargedPatients = patients.filter(
      (p) => p.status === "discharged",
    ).length;
    const waitingListCount = patients.filter(
      (p) => p.status === "waiting_list",
    ).length;

    // Sessões do mês vigente (excluindo canceladas para volume útil)
    const monthSessions = sessions.filter(
      (s) => s.date.startsWith(currentMonthPrefix) && s.status !== "canceled",
    );
    const monthCompletedSessions = monthSessions.filter(
      (s) => s.status === "completed",
    );

    // Taxa de faltas sobre sessões finalizadas (mês vigente ou geral caso início de mês)
    const scopeForAbsence =
      monthSessions.length > 0
        ? monthSessions
        : sessions.filter((s) => s.status !== "canceled");
    const completedForAbsence = scopeForAbsence.filter(
      (s) => s.status === "completed",
    );
    const missedForAbsence = scopeForAbsence.filter(
      (s) =>
        s.status === "missed_chargeable" ||
        s.status === "missed_non_chargeable",
    );
    const totalFinished = completedForAbsence.length + missedForAbsence.length;
    const absenceRate =
      totalFinished > 0
        ? Math.round((missedForAbsence.length / totalFinished) * 100)
        : 0;

    // Proporção Online sobre sessões ativas (ou preferência dos pacientes ativos se ainda não houver sessões)
    const validSessions = sessions.filter((s) => s.status !== "canceled");
    const onlineCount = validSessions.filter(
      (s) => s.modality === "online",
    ).length;
    const onlinePercentage =
      validSessions.length > 0
        ? Math.round((onlineCount / validSessions.length) * 100)
        : activePatients > 0
          ? Math.round(
              (patients.filter(
                (p) =>
                  p.status === "active" && p.preferredModality === "online",
              ).length /
                activePatients) *
                100,
            )
          : 0;

    // Receita realizada e prevista no mês vigente
    const monthPayments = payments.filter((p) => {
      const refDate = p.paidDate || p.sessionDate || p.dueDate || "";
      return refDate.startsWith(currentMonthPrefix);
    });

    const revenueRealized = monthPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    const monthPendingTotal = monthPayments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + p.amount, 0);

    const revenueProjected = revenueRealized + monthPendingTotal;

    // Total global de pagamentos pendentes e prontuários pendentes (para não ocultar pendências de meses anteriores)
    const pendingTotal = payments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingRecords = sessions.filter(
      (s) => s.status === "completed" && !s.hasRecord,
    ).length;

    return {
      activePatients,
      pausedPatients,
      dischargedPatients,
      waitingListCount,
      sessionsMonthCount: monthSessions.length,
      sessionsCompletedCount: monthCompletedSessions.length,
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
      anamnesis: this.getAllAnamnesis(),
      sessions: this.getSessions(),
      clinicalRecords: this.getRecords(),
      assessments: this.getAssessments(),
      payments: this.getPayments(),
      settings: this.getSettings(),
    };
  }

  // Setters diretos para atualização via sincronização em nuvem
  setPatients(patients: Patient[]): void {
    this.persist(STORAGE_KEYS.PATIENTS, patients);
  }

  setSessions(sessions: Session[]): void {
    this.persist(STORAGE_KEYS.SESSIONS, sessions);
  }

  setRecords(records: ClinicalRecord[]): void {
    this.persist(STORAGE_KEYS.RECORDS, records);
  }

  setAssessments(assessments: Assessment[]): void {
    this.persist(STORAGE_KEYS.ASSESSMENTS, assessments);
  }

  setPayments(payments: Payment[]): void {
    this.persist(STORAGE_KEYS.PAYMENTS, payments);
  }

  restoreBackupData(
    _data: ReturnType<StorageService["getFullBackupData"]>,
  ): void {
    throw new Error(
      "Restauração direta desabilitada. Use o procedimento de recuperação isolada.",
    );
  }
}

export const storageService = new StorageService();
