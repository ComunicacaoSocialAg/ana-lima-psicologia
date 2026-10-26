/**
 * Utilitários centralizados de formatação de data para o padrão brasileiro (DD/MM/AAAA)
 */

export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (!trimmed) return '';

  // Se já estiver no padrão brasileiro DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // Se estiver no formato internacional YYYY-MM-DD (com ou sem horário ISO)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [year, month, day] = trimmed.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }

  // Se for timestamp numérico (13 dígitos)
  if (/^\d{13}$/.test(trimmed)) {
    const d = new Date(Number(trimmed));
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  // Fallback para tentar parser nativo de Date
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export function formatDateTimeBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (!trimmed) return '';

  try {
    const d = new Date(isNaN(Number(trimmed)) ? trimmed : Number(trimmed));
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}
