import {
  enqueueOutbox,
  acknowledgeOutbox,
  listOutbox,
} from "./localVaultCrypto";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Patient,
  Session,
  ClinicalRecord,
  Assessment,
  Payment,
  ClinicSettings,
  Anamnesis,
} from "../types";
import { storageService } from "./storageService";
import { auditService } from "./auditService";
import { formatDateBR } from "../utils/dateUtils";

export interface CloudSyncData {
  patients?: Patient[];
  sessions?: Session[];
  records?: ClinicalRecord[];
  assessments?: Assessment[];
  payments?: Payment[];
  settings?: ClinicSettings;
  anamnesis?: Record<string, Anamnesis>;
  publicIntakes?: Patient[];
}

// Remove campos com valor undefined para compatibilidade com o Firestore
function sanitize<T>(data: T): T {
  if (data === null || data === undefined) return null as unknown as T;
  if (Array.isArray(data)) {
    return data.map((item) => sanitize(item)) as unknown as T;
  }
  if (typeof data === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      data as Record<string, unknown>,
    )) {
      if (value !== undefined) {
        clean[key] = sanitize(value);
      }
    }
    return clean as unknown as T;
  }
  return data;
}

export const cloudSyncService = {
  async seedLocalDataToCloud(userId: string): Promise<void> {
    // Replay only explicit pending mutations, never seed entire collections or purge production.
    for (const operation of [...listOutbox()]) {
      const methods: Record<string, string> = {
        patient: "pushPatient",
        session: "pushSession",
        record: "pushRecord",
        assessment: "pushAssessment",
        payment: "pushPayment",
        settings: "pushSettings",
        anamnesis: "pushAnamnesis",
      };
      const method = methods[operation.kind];
      if (method) await (this as any)[method](userId, operation.data);
    }
  },

  // Inicia ouvintes em tempo real para sincronização entre múltiplos dispositivos (PC & Celular)
  startRealtimeSync(
    userId: string,
    onDataUpdate: (data: CloudSyncData) => void,
    onSyncStatusChange?: (status: "synced" | "syncing" | "error") => void,
  ): () => void {
    if (!db) {
      if (onSyncStatusChange) onSyncStatusChange("error");
      return () => {};
    }

    if (onSyncStatusChange) onSyncStatusChange("syncing");
    const unsubscribers: Unsubscribe[] = [];
    const readiness = new Map<string, boolean>();
    let failed = false;
    const markFailed = () => {
      failed = true;
      onSyncStatusChange?.("error");
    };
    window.addEventListener("clinica-sync-error", markFailed);
    unsubscribers.push(() =>
      window.removeEventListener("clinica-sync-error", markFailed),
    );
    const acknowledge = (
      name: string,
      snapshot: { metadata: { fromCache: boolean; hasPendingWrites: boolean } },
    ) => {
      readiness.set(
        name,
        !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites,
      );
      onSyncStatusChange?.(
        failed
          ? "error"
          : readiness.size === 8 &&
              [...readiness.values()].every(Boolean) &&
              listOutbox().length === 0
            ? "synced"
            : "syncing",
      );
    };

    const checkQueue = () =>
      onSyncStatusChange?.(
        failed
          ? "error"
          : readiness.size === 8 &&
              [...readiness.values()].every(Boolean) &&
              listOutbox().length === 0
            ? "synced"
            : "syncing",
      );
    const retry = () => {
      failed = false;
      checkQueue();
    };
    window.addEventListener("clinica-outbox-changed", checkQueue);
    window.addEventListener("clinica-sync-retry", retry);
    unsubscribers.push(() => {
      window.removeEventListener("clinica-outbox-changed", checkQueue);
      window.removeEventListener("clinica-sync-retry", retry);
    });
    try {
      // 1. Ouvinte de Pacientes
      const patientsRef = collection(db, "users", userId, "patients");
      unsubscribers.push(
        onSnapshot(
          patientsRef,
          { includeMetadataChanges: true },
          (snapshot) => {
            acknowledge("patients", snapshot);
            const patients: Patient[] = [];
            snapshot.forEach((docSnap) => {
              const p = { ...docSnap.data(), id: docSnap.id } as Patient;
              if (true) {
                patients.push(p);
              }
            });
            onDataUpdate({ patients });
          },
          (error) => {
            window.dispatchEvent(new Event("clinica-sync-error"));
            if (onSyncStatusChange) onSyncStatusChange("error");
          },
        ),
      );

      // 2. Ouvinte de Sessões
      const sessionsRef = collection(db, "users", userId, "sessions");
      unsubscribers.push(
        onSnapshot(
          sessionsRef,
          { includeMetadataChanges: true },
          (snapshot) => {
            acknowledge("sessions", snapshot);
            const sessions: Session[] = [];
            snapshot.forEach((docSnap) => {
              const s = { ...docSnap.data(), id: docSnap.id } as Session;
              if (true) {
                sessions.push(s);
              }
            });
            onDataUpdate({ sessions });
          },
          (error) => {
            window.dispatchEvent(new Event("clinica-sync-error"));
          },
        ),
      );

      // 3. Ouvinte de Prontuários
      const recordsRef = collection(db, "users", userId, "records");
      unsubscribers.push(
        onSnapshot(
          recordsRef,
          { includeMetadataChanges: true },
          (snapshot) => {
            acknowledge("records", snapshot);
            const records: ClinicalRecord[] = [];
            snapshot.forEach((docSnap) => {
              const r = { ...docSnap.data(), id: docSnap.id } as ClinicalRecord;
              if (true) {
                records.push(r);
              }
            });
            onDataUpdate({ records });
          },
          (error) => {
            window.dispatchEvent(new Event("clinica-sync-error"));
          },
        ),
      );

      // 4. Ouvinte de Escalas
      const assessmentsRef = collection(db, "users", userId, "assessments");
      unsubscribers.push(
        onSnapshot(
          assessmentsRef,
          { includeMetadataChanges: true },
          (snapshot) => {
            acknowledge("assessments", snapshot);
            const assessments: Assessment[] = [];
            snapshot.forEach((docSnap) => {
              const a = { ...docSnap.data(), id: docSnap.id } as Assessment;
              if (true) {
                assessments.push(a);
              }
            });
            onDataUpdate({ assessments });
          },
          (error) => {
            window.dispatchEvent(new Event("clinica-sync-error"));
          },
        ),
      );

      // 5. Ouvinte de Pagamentos
      const paymentsRef = collection(db, "users", userId, "payments");
      unsubscribers.push(
        onSnapshot(
          paymentsRef,
          { includeMetadataChanges: true },
          (snapshot) => {
            acknowledge("payments", snapshot);
            const payments: Payment[] = [];
            snapshot.forEach((docSnap) => {
              const pay = { ...docSnap.data(), id: docSnap.id } as Payment;
              if (true) {
                payments.push(pay);
              }
            });
            onDataUpdate({ payments });
          },
          (error) => {
            window.dispatchEvent(new Event("clinica-sync-error"));
          },
        ),
      );

      // 6. Ouvinte de Configurações
      const settingsRef = doc(db, "users", userId, "settings", "clinic");
      unsubscribers.push(
        onSnapshot(
          settingsRef,
          { includeMetadataChanges: true },
          (docSnap) => {
            acknowledge("settings", docSnap);
            if (docSnap.exists()) {
              onDataUpdate({ settings: docSnap.data() as ClinicSettings });
            }
          },
          (error) => {
            window.dispatchEvent(new Event("clinica-sync-error"));
          },
        ),
      );

      // 7. Ouvinte de Anamneses
      const anamnesisRef = collection(db, "users", userId, "anamnesis");
      unsubscribers.push(
        onSnapshot(
          anamnesisRef,
          { includeMetadataChanges: true },
          (snapshot) => {
            acknowledge("anamnesis", snapshot);
            const anamnesisMap: Record<string, Anamnesis> = {};
            snapshot.forEach((docSnap) => {
              const item = docSnap.data() as Anamnesis;
              if (item.patientId) {
                anamnesisMap[item.patientId] = item;
              }
            });
            onDataUpdate({ anamnesis: anamnesisMap });
          },
          (error) => {
            window.dispatchEvent(new Event("clinica-sync-error"));
          },
        ),
      );

      // 8. Ouvinte de Pré-Cadastros Públicos (enviados pelos pacientes no /cadastro)
      const publicIntakesRef = collection(db, "public_intakes");
      unsubscribers.push(
        onSnapshot(
          publicIntakesRef,
          { includeMetadataChanges: true },
          (snapshot) => {
            acknowledge("publicIntakes", snapshot);
            const publicIntakes: Patient[] = [];
            snapshot.forEach((docSnap) => {
              publicIntakes.push({
                ...docSnap.data(),
                id: docSnap.id,
              } as Patient);
            });
            onDataUpdate({ publicIntakes });
          },
          (error) => {
            window.dispatchEvent(new Event("clinica-sync-error"));
          },
        ),
      );
    } catch (e) {
      window.dispatchEvent(new Event("clinica-sync-error"));
      if (onSyncStatusChange) onSyncStatusChange("error");
    }

    // Retorna função de limpeza (unsubscribe)
    return () => {
      unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // ignora
        }
      });
    };
  },

  // -------------------------------------------------------------
  // MÉTODOS DE ESCRITA INDIVIDUAL NO FIRESTORE
  // -------------------------------------------------------------

  async pushPatient(userId: string, patient: Patient): Promise<void> {
    if (!db) return;
    try {
      const operationToken = await enqueueOutbox(
        "patient",
        patient.id,
        patient,
      );
      const ref = doc(db, "users", userId, "patients", patient.id);
      await runTransaction(db, async (transaction) => {
        const cloudSnap = await transaction.get(ref);
        if (cloudSnap.exists()) {
          const cloudPatient = cloudSnap.data() as Patient;
          if (cloudPatient.updatedAt && patient.updatedAt) {
            const cloudTime = new Date(cloudPatient.updatedAt).getTime();
            const localTime = new Date(patient.updatedAt).getTime();
            if (cloudTime > localTime) {
              window.dispatchEvent(new Event("clinica-sync-error"));
              throw new Error(
                "Conflito de paciente: alteração local preservada para revisão.",
              );
            }
          }
        }
        transaction.set(ref, sanitize(patient));
      });
      await acknowledgeOutbox(operationToken);
      if (!patient.isPreRegistration) await this.removePublicIntake(patient.id);
    } catch (e) {
      window.dispatchEvent(new Event("clinica-sync-error"));
    }
  },

  async removePatient(
    userId: string,
    patientId: string,
    _cascadeIds?: unknown,
  ): Promise<void> {
    if (!db) throw new Error("Banco indisponível.");
    await setDoc(
      doc(db, "users", userId, "patients", patientId),
      {
        status: "discharged",
        dischargeDate: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  },

  async pushSession(userId: string, session: Session): Promise<void> {
    if (!db) return;
    try {
      const operationToken = await enqueueOutbox(
        "session",
        session.id,
        session,
      );
      const ref = doc(db, "users", userId, "sessions", session.id);
      await setDoc(ref, sanitize(session));
      await acknowledgeOutbox(operationToken);
    } catch (e) {
      window.dispatchEvent(new Event("clinica-sync-error"));
    }
  },

  async removeSession(
    userId: string,
    sessionId: string,
    _linkedPaymentIds?: string[],
  ): Promise<void> {
    if (!db) throw new Error("Banco indisponível.");
    await setDoc(
      doc(db, "users", userId, "sessions", sessionId),
      { status: "canceled" },
      { merge: true },
    );
  },

  // Prontuários Clínicos: Transação Atômica com Prevenção de Sobrescrita Offline & Auditoria CFP
  async pushRecord(userId: string, record: ClinicalRecord): Promise<void> {
    if (!db) return;
    try {
      const operationToken = await enqueueOutbox("record", record.id, record);
      const ref = doc(db, "users", userId, "records", record.id);
      await runTransaction(db, async (transaction) => {
        const cloudSnap = await transaction.get(ref);
        if (cloudSnap.exists()) {
          const cloudRecord = cloudSnap.data() as ClinicalRecord;
          const cloudVer = cloudRecord.version || 1;
          const localVer = record.version || 1;

          // Se a nuvem estiver em versão superior, nunca sobrescreva (protege evoluções feitas em outro dispositivo)
          if (cloudVer > localVer) {
            window.dispatchEvent(new Event("clinica-sync-error"));
            throw new Error(
              "Conflito de prontuário: alteração local preservada para revisão.",
            );
          }

          // Se mesma versão mas cloud tem timestamp posterior
          if (
            cloudVer === localVer &&
            cloudRecord.updatedAt &&
            record.updatedAt
          ) {
            const cloudTime = new Date(cloudRecord.updatedAt).getTime();
            const localTime = new Date(record.updatedAt).getTime();
            if (cloudTime > localTime) {
              window.dispatchEvent(new Event("clinica-sync-error"));
              throw new Error(
                "Conflito de prontuário: alteração local preservada para revisão.",
              );
            }
          }

          // Se houve alteração de texto, garante que a versão anterior fique arquivada no histórico
          if (
            cloudRecord.evolution &&
            cloudRecord.evolution !== record.evolution
          ) {
            const hasCloudVerInHistory = (record.history || []).some(
              (h) => h.version === cloudVer,
            );
            if (!hasCloudVerInHistory) {
              record.history = [
                ...(record.history || []),
                {
                  version: cloudVer,
                  editedAt: cloudRecord.updatedAt || new Date().toISOString(),
                  reason:
                    "Registro preservado automaticamente pelo controle de versão de sincronização",
                  evolution: cloudRecord.evolution,
                  privateNotes: cloudRecord.privateNotes,
                },
              ];
            }
          }
        }

        transaction.set(ref, sanitize(record));
      });

      // Registra trilha de auditoria para fins éticos e jurídicos (CFP 001/2009)
      auditService.log("save_record", {
        patientId: record.patientId,
        patientName: record.patientName,
        details: `Evolução clínica salva (v${record.version || 1}) - Sessão ${formatDateBR(record.sessionDate)}`,
      });
      await acknowledgeOutbox(operationToken);
    } catch (e) {
      window.dispatchEvent(new Event("clinica-sync-error"));
    }
  },

  async pushAssessment(userId: string, assessment: Assessment): Promise<void> {
    if (!db) return;
    try {
      const operationToken = await enqueueOutbox(
        "assessment",
        assessment.id,
        assessment,
      );
      const ref = doc(db, "users", userId, "assessments", assessment.id);
      await setDoc(ref, sanitize(assessment));
      await acknowledgeOutbox(operationToken);
    } catch (e) {
      window.dispatchEvent(new Event("clinica-sync-error"));
    }
  },

  async pushPayment(userId: string, payment: Payment): Promise<void> {
    if (!db) return;
    try {
      const operationToken = await enqueueOutbox(
        "payment",
        payment.id,
        payment,
      );
      const ref = doc(db, "users", userId, "payments", payment.id);
      await setDoc(ref, sanitize(payment));
      await acknowledgeOutbox(operationToken);
    } catch (e) {
      window.dispatchEvent(new Event("clinica-sync-error"));
    }
  },

  async pushSettings(userId: string, settings: ClinicSettings): Promise<void> {
    if (!db) return;
    try {
      const operationToken = await enqueueOutbox(
        "settings",
        "clinic",
        settings,
      );
      const ref = doc(db, "users", userId, "settings", "clinic");
      await setDoc(ref, sanitize(settings));
      await acknowledgeOutbox(operationToken);
    } catch (e) {
      window.dispatchEvent(new Event("clinica-sync-error"));
    }
  },

  async pushAnamnesis(userId: string, anamnesis: Anamnesis): Promise<void> {
    if (!db) return;
    try {
      const operationToken = await enqueueOutbox(
        "anamnesis",
        anamnesis.patientId,
        anamnesis,
      );
      const ref = doc(db, "users", userId, "anamnesis", anamnesis.patientId);
      await runTransaction(db, async (transaction) => {
        const cloudSnap = await transaction.get(ref);
        if (cloudSnap.exists()) {
          const cloudAnam = cloudSnap.data() as Anamnesis;
          if (cloudAnam.lastUpdated && anamnesis.lastUpdated) {
            const cloudTime = new Date(cloudAnam.lastUpdated).getTime();
            const localTime = new Date(anamnesis.lastUpdated).getTime();
            if (cloudTime > localTime) {
              window.dispatchEvent(new Event("clinica-sync-error"));
              throw new Error(
                "Conflito de anamnese: alteração local preservada para revisão.",
              );
            }
          }
        }
        transaction.set(ref, sanitize(anamnesis));
      });

      auditService.log("save_record", {
        patientId: anamnesis.patientId,
        details: "Anamnese clínica atualizada",
      });
      await acknowledgeOutbox(operationToken);
    } catch (e) {
      window.dispatchEvent(new Event("clinica-sync-error"));
    }
  },

  // Remove da lista de pré-cadastros temporários quando a psicóloga converte para paciente
  async removePublicIntake(intakeId: string): Promise<void> {
    if (!db) return;
    try {
      const ref = doc(db, "public_intakes", intakeId);
      await deleteDoc(ref);
    } catch (e) {
      window.dispatchEvent(new Event("clinica-sync-error"));
    }
  },
};
