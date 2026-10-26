import {
  waitForPendingWrites,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { callBackend } from "../services/backend";
import { db } from "../services/firebase";
import {
  flushVault,
  getLegacyRecovery,
  listOutbox,
} from "../services/localVaultCrypto";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { User } from "firebase/auth";
import {
  Patient,
  Session,
  ClinicalRecord,
  Assessment,
  Payment,
  ClinicSettings,
  DashboardMetrics,
  SessionStatus,
  Anamnesis,
} from "../types";
import { storageService } from "../services/storageService";
import {
  exportCompleteBackup,
  exportEncryptedBackup,
  validateOrDecryptBackup,
  RedundantSnapshot,
} from "../services/backupService";
import { authService } from "../services/authService";
import { cloudSyncService } from "../services/cloudSyncService";
import {
  syncSessionToGoogleCalendar,
  deleteSessionFromGoogleCalendar,
} from "../services/calendarService";
import {
  notificationService,
  playNotificationChime,
} from "../services/notificationService";

export type AppView =
  | "dashboard"
  | "schedule"
  | "patients"
  | "patient-detail"
  | "financial"
  | "settings"
  | "blog";
export type SyncStatus = "synced" | "syncing" | "offline" | "error";

interface AppContextType {
  currentView: AppView;
  selectedPatientId: string | null;
  navigateTo: (view: AppView, patientId?: string) => void;

  // Data
  billingPatientIds: string[];
  patients: Patient[];
  sessions: Session[];
  records: ClinicalRecord[];
  assessments: Assessment[];
  payments: Payment[];
  settings: ClinicSettings;
  metrics: DashboardMetrics;

  // Cloud & Auth
  currentUser: User | null;
  syncStatus: SyncStatus;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  logout: () => Promise<void>;

  // Intake & Notification Review System
  reviewingPatient: Patient | null;
  openReviewPatient: (patientOrId: Patient | string) => void;
  closeReviewPatient: () => void;
  intakeToastPatient: Patient | null;
  dismissIntakeToast: () => void;
  triggerNewIntakeAlert: (patient: Patient) => void;

  // Quick Dispatch Session Modal
  isNewSessionModalOpen: boolean;
  defaultSessionPatientId: string | null;
  openNewSessionModal: (patientId?: string) => void;
  closeNewSessionModal: () => void;

  // Actions
  savePatient: (patient: Patient) => void;
  deletePatient: (id: string) => void;
  getAnamnesis: (patientId: string) => Anamnesis | null;
  saveAnamnesis: (anamnesis: Anamnesis) => void;

  saveSession: (session: Session) => void;
  deleteSession: (id: string) => void;
  updateSessionStatus: (id: string, status: SessionStatus) => void;

  saveClinicalRecord: (record: ClinicalRecord, editReason?: string) => void;
  getRecordsByPatient: (patientId: string) => ClinicalRecord[];

  saveAssessment: (assessment: Assessment) => void;
  getAssessmentsByPatient: (patientId: string) => Assessment[];

  savePayment: (payment: Payment) => void;
  updateSettings: (settings: ClinicSettings) => void;

  // Security & Privacy
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  isLocked: boolean;
  lockApp: () => void;
  unlockApp: () => void;

  // Backup
  triggerBackup: () => void;
  triggerEncryptedBackup: (passphrase: string) => Promise<void>;
  restoreFromBackupString: (
    content: string,
    passphrase?: string,
  ) => Promise<boolean>;
  restoreSnapshot: (data: RedundantSnapshot["data"]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Read the unlocked vault without seeding, purging or rewriting historical data.
  useState(() => {
    storageService.init();
  });

  const [currentView, setCurrentView] = useState<AppView>("dashboard");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );

  const [patients, setPatients] = useState<Patient[]>(() =>
    storageService.getPatients(),
  );
  const [sessions, setSessions] = useState<Session[]>(() =>
    storageService.getSessions(),
  );
  const [records, setRecords] = useState<ClinicalRecord[]>(() =>
    storageService.getRecords(),
  );
  const [assessments, setAssessments] = useState<Assessment[]>(() =>
    storageService.getAssessments(),
  );
  const [payments, setPayments] = useState<Payment[]>(() =>
    storageService.getUncoveredPayments(),
  );
  const [settings, setSettings] = useState<ClinicSettings>(() =>
    storageService.getSettings(),
  );
  const [metrics, setMetrics] = useState<DashboardMetrics>(() =>
    storageService.getDashboardMetrics(),
  );

  const refreshAllData = useCallback(() => {
    setPatients(storageService.getPatients());
    setSessions(storageService.getSessions());
    setRecords(storageService.getRecords());
    setAssessments(storageService.getAssessments());
    setPayments(storageService.getUncoveredPayments());
    setSettings(storageService.getSettings());
    setMetrics(storageService.getDashboardMetrics());
  }, []);

  // Hidratação transparente do cofre criptográfico local (AES-256-GCM)
  useEffect(() => {
    storageService.hydrateFromVault().then(() => {
      refreshAllData();
    });
  }, [refreshAllData]);

  // Privacy and Lock (persisted in localStorage so F5 never bypasses LockScreen)
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(() =>
    storageService.getIsScreenLocked(),
  );

  // Intake & Notification Review State
  const [reviewingPatient, setReviewingPatient] = useState<Patient | null>(
    null,
  );
  const [intakeToastPatient, setIntakeToastPatient] = useState<Patient | null>(
    null,
  );

  // Quick Dispatch Session Modal
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [defaultSessionPatientId, setDefaultSessionPatientId] = useState<
    string | null
  >(null);

  const openReviewPatient = useCallback((patientOrId: Patient | string) => {
    if (typeof patientOrId === "string") {
      const p = storageService
        .getPatients()
        .find((item) => item.id === patientOrId);
      if (p) {
        setReviewingPatient(p);
      }
    } else {
      setReviewingPatient(patientOrId);
    }
  }, []);

  const closeReviewPatient = useCallback(() => {
    setReviewingPatient(null);
  }, []);

  const dismissIntakeToast = useCallback(() => {
    setIntakeToastPatient(null);
  }, []);

  const triggerNewIntakeAlert = useCallback(
    (patient: Patient) => {
      notificationService.notifyNewIntake(patient, () => {
        openReviewPatient(patient);
      });
      setIntakeToastPatient(patient);
    },
    [openReviewPatient],
  );

  const openNewSessionModal = useCallback((patientId?: string) => {
    setDefaultSessionPatientId(patientId || null);
    setIsNewSessionModalOpen(true);
  }, []);

  const closeNewSessionModal = useCallback(() => {
    setIsNewSessionModalOpen(false);
    setDefaultSessionPatientId(null);
  }, []);

  // Ouvinte de eventos locais de novo pré-cadastro (mesma aba ou abas no mesmo navegador)
  useEffect(() => {
    const handleNewIntake = (event: any) => {
      if (event.detail) {
        triggerNewIntakeAlert(event.detail);
        refreshAllData();
      }
    };
    window.addEventListener("clinica-new-intake", handleNewIntake);
    return () =>
      window.removeEventListener("clinica-new-intake", handleNewIntake);
  }, [triggerNewIntakeAlert, refreshAllData]);

  // Cloud & Auth State
  const billingReady = useRef(false);
  const [billingPatientIds, setBillingPatientIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    authService.getCurrentUser(),
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("offline");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const activeUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    billingReady.current = false;
    if (!db || !currentUser) return;
    const clean = [
      onSnapshot(
        collection(db, "users", currentUser.uid, "billingPolicies"),
        (snapshot) => {
          const ids = snapshot.docs.map((d) => d.id);
          storageService.setBillingManagedPatients(ids);
          setBillingPatientIds(ids);
          billingReady.current = true;
        },
        () => window.dispatchEvent(new Event("clinica-sync-error")),
      ),
      onSnapshot(
        collection(db, "users", currentUser.uid, "charges"),
        (snapshot) => {
          storageService.setFinancialLedger({
            charges: snapshot.docs.map((d) => ({ ...d.data(), id: d.id })),
          });
          refreshAllData();
        },
        () => window.dispatchEvent(new Event("clinica-sync-error")),
      ),
      onSnapshot(
        collection(db, "users", currentUser.uid, "legacyCoverage"),
        (snapshot) => {
          storageService.setFinancialLedger({
            coverage: snapshot.docs.map((d) => d.id),
          });
          refreshAllData();
        },
        () => window.dispatchEvent(new Event("clinica-sync-error")),
      ),
    ];
    return () => clean.forEach((f) => f());
  }, [currentUser]);

  // Monitorar Autenticação e Configurar Sincronização em Nuvem em Tempo Real
  useEffect(() => {
    const unsubAuth = authService.subscribeToAuthState((user) => {
      setCurrentUser(user);

      if (user) {
        setSyncStatus("syncing");

        // Se a psicóloga conectou, garante que dados locais existentes subam para a nuvem
        cloudSyncService
          .seedLocalDataToCloud(user.uid)
          .then(() => {
            // Cancela ouvinte anterior se houver
            if (activeUnsubscribeRef.current) {
              activeUnsubscribeRef.current();
            }

            // Inicia listeners em tempo real para sincronizar entre computador e iPhone
            const unsubSync = cloudSyncService.startRealtimeSync(
              user.uid,
              (cloudData) => {
                if (cloudData.patients) {
                  storageService.setPatients(cloudData.patients);
                  setPatients(cloudData.patients);
                }
                if (cloudData.sessions) {
                  storageService.setSessions(cloudData.sessions);
                  setSessions(cloudData.sessions);
                }
                if (cloudData.records) {
                  storageService.setRecords(cloudData.records);
                  setRecords(cloudData.records);
                }
                if (cloudData.assessments) {
                  storageService.setAssessments(cloudData.assessments);
                  setAssessments(cloudData.assessments);
                }
                if (cloudData.payments) {
                  storageService.setPayments(cloudData.payments);
                  setPayments(storageService.getUncoveredPayments());
                }
                if (cloudData.settings) {
                  storageService.saveSettings(cloudData.settings);
                  setSettings(cloudData.settings);
                }
                if (cloudData.anamnesis) {
                  storageService.setAllAnamnesis(cloudData.anamnesis);
                }

                // Ingestão em tempo real de pré-cadastros públicos recebidos pelo /cadastro
                if (
                  cloudData.publicIntakes &&
                  cloudData.publicIntakes.length > 0
                ) {
                  const currentLocal = storageService.getPatients();
                  let hasNew = false;
                  let latestNewIntake: Patient | null = null;
                  for (const intake of cloudData.publicIntakes) {
                    if (!currentLocal.some((p) => p.id === intake.id)) {
                      const waitingPatient: Patient = {
                        ...intake,
                        status: "waiting_list",
                      };
                      currentLocal.unshift(waitingPatient);
                      hasNew = true;
                      latestNewIntake = waitingPatient;
                      // Persiste na coleção privada da psicóloga e remove da fila pública temporária (LGPD)
                      cloudSyncService.pushPatient(user.uid, waitingPatient);
                      // Keep original intake until reviewed; do not delete before persistence acknowledgement.
                    } else {
                      // Se já está salvo nos pacientes da psicóloga, limpa da fila pública temporária
                      // Intake kept for explicit review.
                    }
                  }
                  if (hasNew) {
                    storageService.setPatients(currentLocal);
                    setPatients([...currentLocal]);
                    if (latestNewIntake) {
                      triggerNewIntakeAlert(latestNewIntake);
                    }
                  }
                }

                setMetrics(storageService.getDashboardMetrics());
              },
              (status) => {
                setSyncStatus(status);
              },
            );

            activeUnsubscribeRef.current = unsubSync;
          })
          .catch((err) => {
            console.warn("Erro ao inicializar sincronização em nuvem:", err);
            setSyncStatus("error");
          });
      } else {
        if (activeUnsubscribeRef.current) {
          activeUnsubscribeRef.current();
          activeUnsubscribeRef.current = null;
        }
        setSyncStatus("offline");
      }
    });

    return () => {
      unsubAuth();
      if (activeUnsubscribeRef.current) {
        activeUnsubscribeRef.current();
      }
    };
  }, []);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);
  const logout = useCallback(async () => {
    if (!navigator.onLine) {
      window.alert(
        "Conecte-se e aguarde a sincronização antes de sair. Seus dados locais continuam protegidos.",
      );
      return;
    }
    await flushVault();
    if (listOutbox().length)
      throw new Error(
        "Existem alterações pendentes de sincronização. Gere uma recuperação e resolva a pendência antes de sair.",
      );
    if (db)
      await Promise.race([
        waitForPendingWrites(db),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Gravações pendentes. Aguarde a sincronização antes de sair.",
                ),
              ),
            10000,
          ),
        ),
      ]);
    await authService.logout();
    setSyncStatus("offline");
  }, [refreshAllData]);

  const navigateTo = useCallback((view: AppView, patientId?: string) => {
    setCurrentView(view);
    if (patientId) {
      setSelectedPatientId(patientId);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const savePatient = useCallback(
    (patient: Patient) => {
      const savedPatient = storageService.savePatient(patient);
      refreshAllData();
      if (currentUser) {
        cloudSyncService.pushPatient(currentUser.uid, savedPatient);
      }
    },
    [refreshAllData, currentUser],
  );

  const deletePatient = useCallback(
    (id: string) => {
      const patient = storageService.getPatients().find((p) => p.id === id);
      if (patient)
        savePatient({
          ...patient,
          status: "discharged",
          dischargeDate: new Date().toISOString().slice(0, 10),
        });
    },
    [savePatient],
  );

  const getAnamnesis = useCallback((patientId: string) => {
    return storageService.getAnamnesis(patientId);
  }, []);

  const saveAnamnesis = useCallback(
    (anamnesis: Anamnesis) => {
      storageService.saveAnamnesis(anamnesis);
      refreshAllData();
      if (currentUser) {
        cloudSyncService.pushAnamnesis(currentUser.uid, anamnesis);
      }
    },
    [refreshAllData, currentUser],
  );

  const saveSession = useCallback(
    (session: Session) => {
      if (!billingReady.current) {
        window.alert(
          "Aguarde a configuração financeira sincronizar antes de salvar a sessão.",
        );
        return;
      }
      const { session: savedSession, syncedPayment } =
        storageService.saveSession(session);
      refreshAllData();
      if (currentUser) {
        cloudSyncService.pushSession(currentUser.uid, savedSession);
        if (syncedPayment)
          cloudSyncService.pushPayment(currentUser.uid, syncedPayment);
      }

      // Sincronização automática com Google Agenda e geração de sala Google Meet quando conectado via Google
      if (authService.hasGoogleCalendarIntegration()) {
        const patientObj = storageService
          .getPatients()
          .find((p) => p.id === savedSession.patientId);
        const currentSettings = storageService.getSettings();
        syncSessionToGoogleCalendar(
          savedSession,
          patientObj,
          currentSettings.address,
        )
          .then((gcalResult) => {
            if (gcalResult) {
              const enrichedSession: Session = {
                ...savedSession,
                googleEventId: gcalResult.googleEventId,
                googleCalendarUrl: gcalResult.googleCalendarUrl,
                meetLink:
                  savedSession.modality === "online" && gcalResult.meetLink
                    ? gcalResult.meetLink
                    : savedSession.meetLink,
              };
              const { session: finalSession } =
                storageService.saveSession(enrichedSession);
              refreshAllData();
              if (currentUser) {
                cloudSyncService.pushSession(currentUser.uid, finalSession);
              }
            }
          })
          .catch((err) => {
            console.warn("Aviso ao sincronizar sessão com Google Agenda:", err);
          });
      }
    },
    [refreshAllData, currentUser],
  );

  const deleteSession = useCallback(
    (id: string) => {
      const session = storageService.getSessions().find((s) => s.id === id);
      if (session) saveSession({ ...session, status: "canceled" });
    },
    [saveSession],
  );

  const updateSessionStatus = useCallback(
    (id: string, status: SessionStatus) => {
      if (!billingReady.current) return;
      const ses = sessions.find((s) => s.id === id);
      if (ses) {
        const updated: Session = { ...ses, status };
        const { session: savedSession, syncedPayment } =
          storageService.saveSession(updated);
        refreshAllData();
        if (currentUser) {
          cloudSyncService.pushSession(currentUser.uid, savedSession);
          if (syncedPayment)
            cloudSyncService.pushPayment(currentUser.uid, syncedPayment);
        }
      }
    },
    [sessions, refreshAllData, currentUser],
  );

  const saveClinicalRecord = useCallback(
    (record: ClinicalRecord, editReason?: string) => {
      const savedRecord = storageService.saveRecord(record, editReason);
      refreshAllData();
      if (currentUser) {
        cloudSyncService.pushRecord(currentUser.uid, savedRecord);
        if (savedRecord.sessionId) {
          const updatedSession = storageService
            .getSessions()
            .find((s) => s.id === savedRecord.sessionId);
          if (updatedSession) {
            cloudSyncService.pushSession(currentUser.uid, updatedSession);
          }
        }
      }
    },
    [refreshAllData, currentUser],
  );

  const getRecordsByPatient = useCallback((patientId: string) => {
    return storageService.getRecordsByPatient(patientId);
  }, []);

  const saveAssessment = useCallback(
    (assessment: Assessment) => {
      storageService.saveAssessment(assessment);
      refreshAllData();
      if (currentUser) {
        cloudSyncService.pushAssessment(currentUser.uid, assessment);
      }
    },
    [refreshAllData, currentUser],
  );

  const getAssessmentsByPatient = useCallback((patientId: string) => {
    return storageService.getAssessmentsByPatient(patientId);
  }, []);

  const savePayment = useCallback(
    (payment: Payment) => {
      if (
        storageService.isBillingManaged(payment.patientId) &&
        !storageService.getPayments().some((p) => p.id === payment.id)
      ) {
        window.alert(
          "Paciente com cobrança integrada: registre o recebimento no Asaas e concilie a cobrança.",
        );
        return;
      }
      storageService.savePayment(payment);
      refreshAllData();
      if (currentUser) {
        cloudSyncService.pushPayment(currentUser.uid, payment);
      }
    },
    [refreshAllData, currentUser],
  );

  const updateSettings = useCallback(
    (newSettings: ClinicSettings) => {
      storageService.saveSettings(newSettings);
      refreshAllData();
      if (currentUser) {
        cloudSyncService.pushSettings(currentUser.uid, newSettings);
      }
    },
    [refreshAllData, currentUser],
  );

  const togglePrivacyMode = useCallback(() => {
    setIsPrivacyMode((prev) => !prev);
  }, []);

  const lockApp = useCallback(() => {
    storageService.setIsScreenLocked(true);
    setIsLocked(true);
  }, []);

  const unlockApp = useCallback(() => {
    storageService.setIsScreenLocked(false);
    setIsLocked(false);
  }, []);

  // Idle timeout detector
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const timeoutMs = (settings.idleTimeoutMinutes || 15) * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        storageService.setIsScreenLocked(true);
        setIsLocked(true);
      }, timeoutMs);
    };

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];
    events.forEach((evt) =>
      window.addEventListener(evt, resetTimer, { passive: true }),
    );
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [settings.idleTimeoutMinutes]);

  const triggerBackup = useCallback(() => {
    const backupData = storageService.getFullBackupData();
    exportCompleteBackup(backupData);
  }, []);

  const triggerEncryptedBackup = useCallback(async (passphrase: string) => {
    const billingData = await callBackend<Record<string, unknown[]>>(
      "exportBillingArchive",
      {},
    );
    const backupData = {
      ...storageService.getFullBackupData(),
      legacyRecovery: getLegacyRecovery(),
      pendingOperations: listOutbox(),
      billingData,
    };
    await exportEncryptedBackup(backupData, passphrase);
  }, []);

  const restoreFromBackupString = useCallback(
    async (_content: string, _passphrase?: string): Promise<boolean> => {
      throw new Error(
        "Restauração exige ambiente isolado e conferência; use o procedimento de recuperação documentado.",
      );
    },
    [],
  );
  const restoreSnapshot = useCallback((_data: RedundantSnapshot["data"]) => {
    throw new Error(
      "Restaure a cópia em ambiente isolado antes de substituir dados.",
    );
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentView,
        selectedPatientId,
        navigateTo,
        billingPatientIds,
        patients,
        sessions,
        records,
        assessments,
        payments,
        settings,
        metrics,
        currentUser,
        syncStatus,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        logout,
        reviewingPatient,
        openReviewPatient,
        closeReviewPatient,
        intakeToastPatient,
        dismissIntakeToast,
        triggerNewIntakeAlert,
        isNewSessionModalOpen,
        defaultSessionPatientId,
        openNewSessionModal,
        closeNewSessionModal,
        savePatient,
        deletePatient,
        getAnamnesis,
        saveAnamnesis,
        saveSession,
        deleteSession,
        updateSessionStatus,
        saveClinicalRecord,
        getRecordsByPatient,
        saveAssessment,
        getAssessmentsByPatient,
        savePayment,
        updateSettings,
        isPrivacyMode,
        togglePrivacyMode,
        isLocked,
        lockApp,
        unlockApp,
        triggerBackup,
        triggerEncryptedBackup,
        restoreFromBackupString,
        restoreSnapshot,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp deve ser utilizado dentro de um AppProvider");
  }
  return context;
};
