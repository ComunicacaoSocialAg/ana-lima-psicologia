export interface CalendarEventDetails {
  title: string;
  patientName?: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  modality: 'presencial' | 'online';
  meetLink?: string;
  address?: string;
}

// Converte YYYY-MM-DD e HH:mm para formato compacto de data e hora (YYYYMMDDTHHmm00)
function formatCompactDateTime(dateStr: string, timeStr: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = timeStr.replace(/:/g, '').padEnd(4, '0') + '00';
  return `${cleanDate}T${cleanTime}`;
}

// Gera o link direto para o Google Agenda (funciona em Android, Web e iPhone)
export function generateGoogleCalendarUrl(event: CalendarEventDetails): string {
  const startStr = formatCompactDateTime(event.date, event.startTime);
  const endStr = formatCompactDateTime(event.date, event.endTime);

  const title = event.title || 'Sessão de Psicoterapia - Ana Lima';
  
  let details = `Sessão de psicoterapia com a Psicóloga Ana Lima (CRP 04/60205).\n`;
  if (event.patientName) {
    details += `Paciente: ${event.patientName}\n`;
  }
  if (event.modality === 'online') {
    details += `Modalidade: Atendimento Online via Google Meet\n`;
    if (event.meetLink) {
      details += `Link da Videochamada: ${event.meetLink}\n`;
    }
  } else {
    details += `Modalidade: Atendimento Presencial\nLocal: ${event.address || 'Consultório em Poços de Caldas/MG'}\n`;
  }
  details += `\nQualquer dúvida ou necessidade de reagendamento, entre em contato pelo WhatsApp: (31) 99294-9211.`;

  const location = event.modality === 'online'
    ? (event.meetLink || 'Google Meet')
    : (event.address || 'Consultório em Poços de Caldas/MG');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startStr}/${endStr}`,
    ctz: 'America/Sao_Paulo',
    details,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Gera o conteúdo do arquivo iCalendar (.ics) para Apple Calendar / iOS / Outlook
export function generateIcsContent(event: CalendarEventDetails): string {
  const startStr = formatCompactDateTime(event.date, event.startTime);
  const endStr = formatCompactDateTime(event.date, event.endTime);
  const nowStr = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const uid = `ana-lima-${event.date}-${event.startTime}-${Date.now()}@analima.psi`;

  const title = (event.title || 'Sessão de Psicoterapia - Ana Lima').replace(/[,;]/g, ' ');
  
  let description = `Sessão de psicoterapia com Psicóloga Ana Lima (CRP 04/60205).\\n`;
  if (event.patientName) {
    description += `Paciente: ${event.patientName}\\n`;
  }
  if (event.modality === 'online') {
    description += `Modalidade: Online via Google Meet\\n`;
    if (event.meetLink) {
      description += `Link: ${event.meetLink}\\n`;
    }
  } else {
    description += `Modalidade: Presencial em ${event.address || 'Poços de Caldas/MG'}\\n`;
  }
  description += `WhatsApp: (31) 99294-9211`;

  const location = (event.modality === 'online'
    ? (event.meetLink || 'Google Meet')
    : (event.address || 'Poços de Caldas/MG')
  ).replace(/[,;]/g, ' ');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Clinica Ana Lima//Psicoterapia//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART;TZID=America/Sao_Paulo:${startStr}`,
    `DTEND;TZID=America/Sao_Paulo:${endStr}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    // Alarme 1: 1 hora antes
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete: Sua sessão com a Psicóloga Ana Lima é em 1 hora',
    'END:VALARM',
    // Alarme 2: 15 minutos antes
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete: Sua sessão com a Psicóloga Ana Lima começa em 15 minutos',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// Dispara o download do arquivo .ics para abrir no calendário nativo (Apple / iPhone / Mac / Windows)
export function downloadIcsFile(event: CalendarEventDetails): void {
  const ics = generateIcsContent(event);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sessao_Ana_Lima_${event.date}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Gera o link universal da página de acolhimento do evento (produção HTTPS para celular do paciente)
export function generateUniversalCalendarUrl(event: CalendarEventDetails): string {
  const baseUrl = typeof window !== 'undefined' && !window.location.origin.includes('localhost')
    ? window.location.origin
    : 'https://ana-lima-psi-app.web.app';

  const params = new URLSearchParams({
    t: event.title || 'Sessão de Psicoterapia - Ana Lima',
    d: event.date,
    s: event.startTime,
    e: event.endTime,
    m: event.modality,
  });

  if (event.patientName) {
    params.set('p', event.patientName);
  }
  if (event.meetLink && event.modality === 'online') {
    params.set('meet', event.meetLink);
  }
  if (event.address && event.modality === 'presencial') {
    params.set('loc', event.address);
  }

  return `${baseUrl}/evento?${params.toString()}`;
}
