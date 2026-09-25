import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Patient,
  Session,
  ClinicalRecord,
  Assessment,
  Payment,
  ClinicSettings,
  Anamnesis
} from '../types';
import { storageService, LEGACY_DEMO_IDS } from './storageService';

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
    return data.map(item => sanitize(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        clean[key] = sanitize(value);
      }
    }
    return clean as unknown as T;
  }
  return data;
}

export const cloudSyncService = {
  // Remove permanentemente qualquer dado de teste/demonstração legado salvo no Firestore
  async purgeDemoDataFromCloud(userId: string): Promise<void> {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      for (const id of LEGACY_DEMO_IDS.patients) {
        batch.delete(doc(db, 'users', userId, 'patients', id));
        batch.delete(doc(db, 'users', userId, 'anamnesis', id));
      }
      for (const id of LEGACY_DEMO_IDS.sessions) {
        batch.delete(doc(db, 'users', userId, 'sessions', id));
        batch.delete(doc(db, 'users', userId, 'payments', `pay-ses-${id}`));
      }
      for (const id of LEGACY_DEMO_IDS.records) {
        batch.delete(doc(db, 'users', userId, 'records', id));
      }
      for (const id of LEGACY_DEMO_IDS.assessments) {
        batch.delete(doc(db, 'users', userId, 'assessments', id));
      }
      for (const id of LEGACY_DEMO_IDS.payments) {
        batch.delete(doc(db, 'users', userId, 'payments', id));
      }
      await batch.commit();
    } catch (e) {
      console.warn('Aviso ao limpar dados de demonstração da nuvem:', e);
    }
  },

  // Envia todos os dados locais para a nuvem no primeiro login da psicóloga
  async seedLocalDataToCloud(userId: string): Promise<void> {
    if (!db) return;

    try {
      // Primeiro garante que qualquer registro de teste/demo antigo seja removido da nuvem
      await this.purgeDemoDataFromCloud(userId);

      const patientsRef = collection(db, 'users', userId, 'patients');
      const existing = await getDocs(patientsRef);

      // Se a nuvem já tiver pacientes reais salvos, mantém sincronização
      if (!existing.empty) {
        console.log('Nuvem já contém dados reais do usuário. Sincronização inicial mantida.');
        return;
      }

      console.log('Iniciando seed inicial de dados locais para o Firestore...');
      const batch = writeBatch(db);

      // 1. Pacientes
      const localPatients = storageService.getPatients();
      for (const p of localPatients) {
        const ref = doc(db, 'users', userId, 'patients', p.id);
        batch.set(ref, sanitize(p));
      }

      // 2. Sessões
      const localSessions = storageService.getSessions();
      for (const s of localSessions) {
        const ref = doc(db, 'users', userId, 'sessions', s.id);
        batch.set(ref, sanitize(s));
      }

      // 3. Prontuários
      const localRecords = storageService.getRecords();
      for (const r of localRecords) {
        const ref = doc(db, 'users', userId, 'records', r.id);
        batch.set(ref, sanitize(r));
      }

      // 4. Escalas
      const localAssessments = storageService.getAssessments();
      for (const a of localAssessments) {
        const ref = doc(db, 'users', userId, 'assessments', a.id);
        batch.set(ref, sanitize(a));
      }

      // 5. Pagamentos
      const localPayments = storageService.getPayments();
      for (const pay of localPayments) {
        const ref = doc(db, 'users', userId, 'payments', pay.id);
        batch.set(ref, sanitize(pay));
      }

      // 6. Configurações
      const localSettings = storageService.getSettings();
      const settingsRef = doc(db, 'users', userId, 'settings', 'clinic');
      batch.set(settingsRef, sanitize(localSettings));

      // 7. Anamneses Clínicas
      const localAnamnesis = storageService.getAllAnamnesis();
      for (const [patientId, anam] of Object.entries(localAnamnesis)) {
        if (anam && patientId) {
          const ref = doc(db, 'users', userId, 'anamnesis', patientId);
          batch.set(ref, sanitize({ ...anam, patientId }));
        }
      }

      await batch.commit();
      console.log('Seed inicial de dados locais para Firestore concluído com sucesso!');
    } catch (error) {
      console.warn('Erro ao realizar seed de dados locais para o Firestore:', error);
    }
  },

  // Sincroniza restauração completa de backup para a nuvem
  async pushFullBackupToCloud(
    userId: string,
    data: ReturnType<typeof storageService.getFullBackupData>
  ): Promise<void> {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      for (const p of data.patients || []) {
        batch.set(doc(db, 'users', userId, 'patients', p.id), sanitize(p));
      }
      for (const s of data.sessions || []) {
        batch.set(doc(db, 'users', userId, 'sessions', s.id), sanitize(s));
      }
      for (const r of data.clinicalRecords || []) {
        batch.set(doc(db, 'users', userId, 'records', r.id), sanitize(r));
      }
      for (const a of data.assessments || []) {
        batch.set(doc(db, 'users', userId, 'assessments', a.id), sanitize(a));
      }
      for (const pay of data.payments || []) {
        batch.set(doc(db, 'users', userId, 'payments', pay.id), sanitize(pay));
      }
      if (data.settings) {
        batch.set(doc(db, 'users', userId, 'settings', 'clinic'), sanitize(data.settings));
      }
      for (const [patientId, anam] of Object.entries(data.anamnesis || {})) {
        if (anam && patientId) {
          batch.set(doc(db, 'users', userId, 'anamnesis', patientId), sanitize({ ...(anam as Anamnesis), patientId }));
        }
      }
      await batch.commit();
    } catch (e) {
      console.warn('Erro ao enviar backup restaurado para a nuvem:', e);
    }
  },

  // Inicia ouvintes em tempo real para sincronização entre múltiplos dispositivos (PC & Celular)
  startRealtimeSync(
    userId: string,
    onDataUpdate: (data: CloudSyncData) => void,
    onSyncStatusChange?: (status: 'synced' | 'syncing' | 'error') => void
  ): () => void {
    if (!db) {
      if (onSyncStatusChange) onSyncStatusChange('error');
      return () => {};
    }

    if (onSyncStatusChange) onSyncStatusChange('syncing');
    const unsubscribers: Unsubscribe[] = [];

    try {
      // 1. Ouvinte de Pacientes
      const patientsRef = collection(db, 'users', userId, 'patients');
      unsubscribers.push(
        onSnapshot(patientsRef, (snapshot) => {
          const patients: Patient[] = [];
          snapshot.forEach((docSnap) => {
            const p = docSnap.data() as Patient;
            if (!LEGACY_DEMO_IDS.patients.has(p.id)) {
              patients.push(p);
            }
          });
          onDataUpdate({ patients });
          if (onSyncStatusChange) onSyncStatusChange('synced');
        }, (error) => {
          console.warn('Erro no listener de pacientes:', error);
          if (onSyncStatusChange) onSyncStatusChange('error');
        })
      );

      // 2. Ouvinte de Sessões
      const sessionsRef = collection(db, 'users', userId, 'sessions');
      unsubscribers.push(
        onSnapshot(sessionsRef, (snapshot) => {
          const sessions: Session[] = [];
          snapshot.forEach((docSnap) => {
            const s = docSnap.data() as Session;
            if (!LEGACY_DEMO_IDS.sessions.has(s.id) && !LEGACY_DEMO_IDS.patients.has(s.patientId)) {
              sessions.push(s);
            }
          });
          onDataUpdate({ sessions });
          if (onSyncStatusChange) onSyncStatusChange('synced');
        }, (error) => {
          console.warn('Erro no listener de sessões:', error);
        })
      );

      // 3. Ouvinte de Prontuários
      const recordsRef = collection(db, 'users', userId, 'records');
      unsubscribers.push(
        onSnapshot(recordsRef, (snapshot) => {
          const records: ClinicalRecord[] = [];
          snapshot.forEach((docSnap) => {
            const r = docSnap.data() as ClinicalRecord;
            if (!LEGACY_DEMO_IDS.records.has(r.id) && !LEGACY_DEMO_IDS.patients.has(r.patientId)) {
              records.push(r);
            }
          });
          onDataUpdate({ records });
        }, (error) => {
          console.warn('Erro no listener de prontuários:', error);
        })
      );

      // 4. Ouvinte de Escalas
      const assessmentsRef = collection(db, 'users', userId, 'assessments');
      unsubscribers.push(
        onSnapshot(assessmentsRef, (snapshot) => {
          const assessments: Assessment[] = [];
          snapshot.forEach((docSnap) => {
            const a = docSnap.data() as Assessment;
            if (!LEGACY_DEMO_IDS.assessments.has(a.id) && !LEGACY_DEMO_IDS.patients.has(a.patientId)) {
              assessments.push(a);
            }
          });
          onDataUpdate({ assessments });
        }, (error) => {
          console.warn('Erro no listener de escalas:', error);
        })
      );

      // 5. Ouvinte de Pagamentos
      const paymentsRef = collection(db, 'users', userId, 'payments');
      unsubscribers.push(
        onSnapshot(paymentsRef, (snapshot) => {
          const payments: Payment[] = [];
          snapshot.forEach((docSnap) => {
            const pay = docSnap.data() as Payment;
            if (!LEGACY_DEMO_IDS.payments.has(pay.id) && !LEGACY_DEMO_IDS.patients.has(pay.patientId)) {
              payments.push(pay);
            }
          });
          onDataUpdate({ payments });
        }, (error) => {
          console.warn('Erro no listener de pagamentos:', error);
        })
      );

      // 6. Ouvinte de Configurações
      const settingsRef = doc(db, 'users', userId, 'settings', 'clinic');
      unsubscribers.push(
        onSnapshot(settingsRef, (docSnap) => {
          if (docSnap.exists()) {
            onDataUpdate({ settings: docSnap.data() as ClinicSettings });
          }
        }, (error) => {
          console.warn('Erro no listener de configurações:', error);
        })
      );

      // 7. Ouvinte de Anamneses
      const anamnesisRef = collection(db, 'users', userId, 'anamnesis');
      unsubscribers.push(
        onSnapshot(anamnesisRef, (snapshot) => {
          const anamnesisMap: Record<string, Anamnesis> = {};
          snapshot.forEach((docSnap) => {
            const item = docSnap.data() as Anamnesis;
            if (item.patientId && !LEGACY_DEMO_IDS.patients.has(item.patientId)) {
              anamnesisMap[item.patientId] = item;
            }
          });
          onDataUpdate({ anamnesis: anamnesisMap });
        }, (error) => {
          console.warn('Erro no listener de anamneses:', error);
        })
      );

      // 8. Ouvinte de Pré-Cadastros Públicos (enviados pelos pacientes no /cadastro)
      const publicIntakesRef = collection(db, 'public_intakes');
      unsubscribers.push(
        onSnapshot(publicIntakesRef, (snapshot) => {
          const publicIntakes: Patient[] = [];
          snapshot.forEach((docSnap) => {
            publicIntakes.push(docSnap.data() as Patient);
          });
          onDataUpdate({ publicIntakes });
        }, (error) => {
          console.warn('Erro no listener de pré-cadastros públicos:', error);
        })
      );

    } catch (e) {
      console.warn('Erro geral ao configurar listeners do Firestore:', e);
      if (onSyncStatusChange) onSyncStatusChange('error');
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
      const ref = doc(db, 'users', userId, 'patients', patient.id);
      await setDoc(ref, sanitize(patient));
    } catch (e) {
      console.warn('Erro ao sincronizar paciente na nuvem:', e);
    }
  },

  async removePatient(
    userId: string,
    patientId: string,
    cascadeIds?: {
      sessionIds?: string[];
      recordIds?: string[];
      assessmentIds?: string[];
      paymentIds?: string[];
    }
  ): Promise<void> {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', userId, 'patients', patientId));
      batch.delete(doc(db, 'users', userId, 'anamnesis', patientId));
      if (cascadeIds) {
        for (const sid of cascadeIds.sessionIds || []) {
          batch.delete(doc(db, 'users', userId, 'sessions', sid));
          batch.delete(doc(db, 'users', userId, 'payments', `pay-ses-${sid}`));
        }
        for (const rid of cascadeIds.recordIds || []) {
          batch.delete(doc(db, 'users', userId, 'records', rid));
        }
        for (const aid of cascadeIds.assessmentIds || []) {
          batch.delete(doc(db, 'users', userId, 'assessments', aid));
        }
        for (const pid of cascadeIds.paymentIds || []) {
          batch.delete(doc(db, 'users', userId, 'payments', pid));
        }
      }
      await batch.commit();
    } catch (e) {
      console.warn('Erro ao remover paciente e registros vinculados na nuvem:', e);
    }
  },

  async pushSession(userId: string, session: Session): Promise<void> {
    if (!db) return;
    try {
      const ref = doc(db, 'users', userId, 'sessions', session.id);
      await setDoc(ref, sanitize(session));
    } catch (e) {
      console.warn('Erro ao sincronizar sessão na nuvem:', e);
    }
  },

  async removeSession(userId: string, sessionId: string, linkedPaymentIds?: string[]): Promise<void> {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', userId, 'sessions', sessionId));
      batch.delete(doc(db, 'users', userId, 'payments', `pay-ses-${sessionId}`));
      for (const pid of linkedPaymentIds || []) {
        batch.delete(doc(db, 'users', userId, 'payments', pid));
      }
      await batch.commit();
    } catch (e) {
      console.warn('Erro ao remover sessão e pagamento vinculado na nuvem:', e);
    }
  },

  async pushRecord(userId: string, record: ClinicalRecord): Promise<void> {
    if (!db) return;
    try {
      const ref = doc(db, 'users', userId, 'records', record.id);
      await setDoc(ref, sanitize(record));
    } catch (e) {
      console.warn('Erro ao sincronizar prontuário na nuvem:', e);
    }
  },

  async pushAssessment(userId: string, assessment: Assessment): Promise<void> {
    if (!db) return;
    try {
      const ref = doc(db, 'users', userId, 'assessments', assessment.id);
      await setDoc(ref, sanitize(assessment));
    } catch (e) {
      console.warn('Erro ao sincronizar escala na nuvem:', e);
    }
  },

  async pushPayment(userId: string, payment: Payment): Promise<void> {
    if (!db) return;
    try {
      const ref = doc(db, 'users', userId, 'payments', payment.id);
      await setDoc(ref, sanitize(payment));
    } catch (e) {
      console.warn('Erro ao sincronizar pagamento na nuvem:', e);
    }
  },

  async pushSettings(userId: string, settings: ClinicSettings): Promise<void> {
    if (!db) return;
    try {
      const ref = doc(db, 'users', userId, 'settings', 'clinic');
      await setDoc(ref, sanitize(settings));
    } catch (e) {
      console.warn('Erro ao sincronizar configurações na nuvem:', e);
    }
  },

  async pushAnamnesis(userId: string, anamnesis: Anamnesis): Promise<void> {
    if (!db) return;
    try {
      const ref = doc(db, 'users', userId, 'anamnesis', anamnesis.patientId);
      await setDoc(ref, sanitize(anamnesis));
    } catch (e) {
      console.warn('Erro ao sincronizar anamnese na nuvem:', e);
    }
  },

  // Envio de ficha pública de pré-cadastro pelo paciente (/cadastro)
  async submitPublicIntake(intake: Patient): Promise<boolean> {
    if (!db) return false;
    try {
      const ref = doc(db, 'public_intakes', intake.id);
      await setDoc(ref, sanitize(intake));
      return true;
    } catch (e) {
      console.warn('Erro ao submeter pré-cadastro na nuvem:', e);
      return false;
    }
  },

  // Remove da lista de pré-cadastros temporários quando a psicóloga converte para paciente
  async removePublicIntake(intakeId: string): Promise<void> {
    if (!db) return;
    try {
      const ref = doc(db, 'public_intakes', intakeId);
      await deleteDoc(ref);
    } catch (e) {
      console.warn('Erro ao remover pré-cadastro público:', e);
    }
  }
};
