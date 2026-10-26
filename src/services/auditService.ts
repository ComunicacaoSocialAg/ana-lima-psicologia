import { vaultSetItem, vaultReadCached } from "./localVaultCrypto";
import {
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import { authService } from "./authService";

export type AuditAction =
  | "view_record"
  | "save_record"
  | "export_record_pdf"
  | "export_financial_pdf"
  | "export_backup"
  | "restore_backup"
  | "delete_patient"
  | "view_anamnesis"
  | "auth_login"
  | "auth_logout";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  userId: string;
  patientId?: string;
  patientName?: string;
  details?: string;
  userAgent?: string;
}

const LOCAL_AUDIT_LOGS_KEY = "ana_lima_audit_logs_v1";

export const auditService = {
  // Registra um evento de auditoria imutável na nuvem e no cache de auditoria
  async log(
    action: AuditAction,
    data?: { patientId?: string; patientName?: string; details?: string },
  ): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      const userId = user ? user.uid : "psHLxoIeGfRNqQSwTbPUVxFCU8H2";
      const logId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const entry: AuditLogEntry = {
        id: logId,
        timestamp: new Date().toISOString(),
        action,
        userId,
        patientId: data?.patientId,
        patientName: data?.patientName,
        details: data?.details,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      };

      // 1. Grava no cache local (últimos 100 registros)
      if (typeof localStorage !== "undefined") {
        try {
          const raw = vaultReadCached(LOCAL_AUDIT_LOGS_KEY);
          const list: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
          list.unshift(entry);
          if (list.length > 100) list.length = 100;
          await vaultSetItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify(list));
        } catch {
          // ignora falha de cache local
        }
      }

      // 2. Grava na nuvem no Firestore se online
      if (db && user) {
        const ref = doc(db, "users", userId, "audit_logs", logId);
        await setDoc(ref, JSON.parse(JSON.stringify(entry)));
      }
    } catch (e) {
      console.warn("Aviso ao registrar log de auditoria:", e);
    }
  },

  // Obtém histórico recente de auditoria para inspeção da psicóloga
  async getRecentLogs(limitCount = 50): Promise<AuditLogEntry[]> {
    const user = authService.getCurrentUser();
    if (db && user) {
      try {
        const ref = collection(db, "users", user.uid, "audit_logs");
        const q = query(ref, orderBy("timestamp", "desc"), limit(limitCount));
        const snap = await getDocs(q);
        const cloudLogs: AuditLogEntry[] = [];
        snap.forEach((d) => cloudLogs.push(d.data() as AuditLogEntry));
        if (cloudLogs.length > 0) return cloudLogs;
      } catch (e) {
        console.warn("Aviso ao buscar logs de auditoria na nuvem:", e);
      }
    }

    if (typeof localStorage !== "undefined") {
      try {
        const raw = vaultReadCached(LOCAL_AUDIT_LOGS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  },
};
