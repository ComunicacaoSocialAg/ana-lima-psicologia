export function assertBackupData(data: any): void {
  if (!data || typeof data !== "object") throw new Error("Backup sem dados.");
  for (const key of [
    "patients",
    "sessions",
    "clinicalRecords",
    "assessments",
    "payments",
  ]) {
    if (!Array.isArray(data[key]) || data[key].length > 100000)
      throw new Error("Coleção ausente ou inválida: " + key);
    const ids = new Set<string>();
    for (const row of data[key]) {
      if (!row || typeof row.id !== "string" || ids.has(row.id))
        throw new Error("Identificador ausente ou repetido em " + key);
      ids.add(row.id);
    }
  }
  if (
    !data.settings ||
    !data.anamnesis ||
    typeof data.anamnesis !== "object" ||
    Array.isArray(data.anamnesis)
  )
    throw new Error("Configurações ou anamneses ausentes.");
}
