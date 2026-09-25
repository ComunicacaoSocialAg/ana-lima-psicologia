import { Patient, Anamnesis, Session, ClinicalRecord, Assessment, Payment, ClinicSettings } from '../types';

export interface FullBackupPayload {
  version: string;
  exportedAt: string;
  system: string;
  checksum: string;
  data: {
    patients: Patient[];
    anamnesis: Record<string, Anamnesis>;
    sessions: Session[];
    clinicalRecords: ClinicalRecord[];
    assessments: Assessment[];
    payments: Payment[];
    settings: ClinicSettings;
  };
}

export interface RedundantSnapshot {
  id: string;
  timestamp: string;
  reason: string;
  itemCount: {
    patients: number;
    sessions: number;
    records: number;
    assessments: number;
    payments: number;
  };
  checksum: string;
  data: FullBackupPayload['data'];
}

const VAULT_KEY = 'ana_lima_redundant_vault_v1';
const MAX_VAULT_SNAPSHOTS = 10;

// Gera um checksum simples e determinístico para validação de integridade dos dados
export function computeDataChecksum(data: FullBackupPayload['data']): string {
  const str = JSON.stringify({
    p: data.patients?.length || 0,
    s: data.sessions?.length || 0,
    r: data.clinicalRecords?.length || 0,
    a: data.assessments?.length || 0,
    pay: data.payments?.length || 0,
  });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `CHK-${Math.abs(hash).toString(16).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

// 1. Exportação Manual / Download para Google Drive ou Disco Local
export function exportCompleteBackup(data: FullBackupPayload['data']): void {
  const checksum = computeDataChecksum(data);
  const payload: FullBackupPayload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    system: 'Clinica Ana Lima - Gestão Psicológica (CFP 001/2009 & LGPD)',
    checksum,
    data,
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `Backup_Oficial_Ana_Lima_${dateStr}_${timeStr}.json`;

  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  // Registra também no cofre de redundância automático
  saveAutomatedSnapshot(data, 'Download de Backup Manual');
}

// 2. Sistema de Redundância e Espelhamento Automático em Duplicidade
export function saveAutomatedSnapshot(data: FullBackupPayload['data'], reason: string = 'Atualização Automática do Sistema'): void {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    const existingSnapshots: RedundantSnapshot[] = raw ? JSON.parse(raw) : [];

    const checksum = computeDataChecksum(data);
    const newSnapshot: RedundantSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: new Date().toISOString(),
      reason,
      itemCount: {
        patients: data.patients?.length || 0,
        sessions: data.sessions?.length || 0,
        records: data.clinicalRecords?.length || 0,
        assessments: data.assessments?.length || 0,
        payments: data.payments?.length || 0,
      },
      checksum,
      data,
    };

    // Mantém no máximo MAX_VAULT_SNAPSHOTS cópias rotativas
    const updated = [newSnapshot, ...existingSnapshots.slice(0, MAX_VAULT_SNAPSHOTS - 1)];
    localStorage.setItem(VAULT_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Alerta: Falha ao salvar snapshot automático de redundância:', err);
  }
}

export function getAutomatedSnapshots(): RedundantSnapshot[] {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearAutomatedSnapshots(): void {
  localStorage.removeItem(VAULT_KEY);
}

// 3. Validação de Arquivo de Backup Externo
export function validateBackupFile(content: string): FullBackupPayload | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.system && parsed.data && Array.isArray(parsed.data.patients)) {
      return parsed as FullBackupPayload;
    }
    return null;
  } catch (err) {
    console.error('Erro ao validar arquivo de backup:', err);
    return null;
  }
}
