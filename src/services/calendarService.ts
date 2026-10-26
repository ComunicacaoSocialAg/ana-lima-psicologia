export interface CalendarEventDetails {
  title: string;
  patientName?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  modality: "presencial" | "online";
  meetLink?: string;
  address?: string;
}

// Converte YYYY-MM-DD e HH:mm para formato compacto de data e hora (YYYYMMDDTHHmm00)
function formatCompactDateTime(dateStr: string, timeStr: string): string {
  const cleanDate = dateStr.replace(/-/g, "");
  const cleanTime = timeStr.replace(/:/g, "").padEnd(4, "0") + "00";
  return `${cleanDate}T${cleanTime}`;
}

// Gera o link direto para o Google Agenda (funciona em Android, Web e iPhone)
export function generateGoogleCalendarUrl(event: CalendarEventDetails): string {
  const startStr = formatCompactDateTime(event.date, event.startTime);
  const endStr = formatCompactDateTime(event.date, event.endTime);

  const title = event.title || "Sessão de Psicoterapia - Ana Lima";

  let details = `Sessão de psicoterapia com a Psicóloga Ana Lima (CRP 04/60205).\n`;
  if (event.patientName) {
    details += `Paciente: ${event.patientName}\n`;
  }
  if (event.modality === "online") {
    details += `Modalidade: Atendimento Online via Google Meet\n`;
    if (event.meetLink) {
      details += `Link da Videochamada: ${event.meetLink}\n`;
    }
  } else {
    details += `Modalidade: Atendimento Presencial\nLocal: ${event.address || "Consultório em Poços de Caldas/MG"}\n`;
  }
  details += `\nQualquer dúvida ou necessidade de reagendamento, entre em contato pelo WhatsApp: (31) 99294-9211.`;

  const location =
    event.modality === "online"
      ? event.meetLink || "Google Meet"
      : event.address || "Consultório em Poços de Caldas/MG";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startStr}/${endStr}`,
    ctz: "America/Sao_Paulo",
    details,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Gera o conteúdo do arquivo iCalendar (.ics) para Apple Calendar / iOS / Outlook
export function generateIcsContent(event: CalendarEventDetails): string {
  const startStr = formatCompactDateTime(event.date, event.startTime);
  const endStr = formatCompactDateTime(event.date, event.endTime);
  const nowStr =
    new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const uid = `ana-lima-${event.date}-${event.startTime}-${Date.now()}@analima.psi`;

  const clean = (text: string) => text.replace(/[\r\n\\;,]/g, " ");
  const title = clean(event.title || "Atendimento — Ana Lima");

  let description = `Sessão de psicoterapia com Psicóloga Ana Lima (CRP 04/60205).\\n`;
  if (event.patientName) {
    description += `Paciente: ${event.patientName}\\n`;
  }
  if (event.modality === "online") {
    description += `Modalidade: Online via Google Meet\\n`;
    if (event.meetLink) {
      description += `Link: ${event.meetLink}\\n`;
    }
  } else {
    description += `Modalidade: Presencial em ${event.address || "Poços de Caldas/MG"}\\n`;
  }
  description += `WhatsApp: (31) 99294-9211`;

  const location = (
    event.modality === "online"
      ? event.meetLink || "Google Meet"
      : event.address || "Poços de Caldas/MG"
  ).replace(/[,;]/g, " ");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Clinica Ana Lima//Psicoterapia//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART;TZID=America/Sao_Paulo:${startStr}`,
    `DTEND;TZID=America/Sao_Paulo:${endStr}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${clean(description)}`,
    `LOCATION:${clean(location)}`,
    "STATUS:CONFIRMED",
    // Alarme 1: 1 hora antes
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Lembrete: Sua sessão com a Psicóloga Ana Lima é em 1 hora",
    "END:VALARM",
    // Alarme 2: 15 minutos antes
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Lembrete: Sua sessão com a Psicóloga Ana Lima começa em 15 minutos",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// Dispara o download do arquivo .ics para abrir no calendário nativo (Apple / iPhone / Mac / Windows)
export function downloadIcsFile(event: CalendarEventDetails): void {
  const ics = generateIcsContent(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Sessao_Ana_Lima_${event.date}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Gera o link universal da página de acolhimento do evento (produção HTTPS para celular do paciente)
export function generateUniversalCalendarUrl(
  event: CalendarEventDetails,
): string {
  const baseUrl =
    typeof window !== "undefined" &&
    !window.location.origin.includes("localhost")
      ? window.location.origin
      : "https://ana-lima-psi-app.web.app";

  const params = new URLSearchParams({
    t: "Atendimento — Ana Lima",
    d: event.date,
    s: event.startTime,
    e: event.endTime,
    m: event.modality,
  });

  if (event.meetLink && event.modality === "online") {
    params.set("meet", event.meetLink);
  }
  if (event.address && event.modality === "presencial") {
    params.set("loc", event.address);
  }

  return `${baseUrl}/evento#${params.toString()}`;
}

// ============================================================================
// INTEGRAÇÃO DIRETA COM GOOGLE CALENDAR API v3 & GOOGLE MEET AUTOMÁTICO
// ============================================================================
import { authService } from "./authService";
import { Session, Patient } from "../types";

export interface GoogleCalendarSyncResult {
  googleEventId: string;
  meetLink?: string;
  googleCalendarUrl?: string;
}

// Formata o nome do paciente no padrão sigiloso CFP (apenas primeiro nome e iniciais do sobrenome)
// Ex: "Mariana Silva Santos" -> "Mariana S. S."
export function formatConfidentialPatientName(fullName: string): string {
  if (!fullName) return "Paciente";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0];
  const firstName = parts[0];
  const initials = parts
    .slice(1)
    .map((p) => `${p[0]?.toUpperCase()}.`)
    .join(" ");
  return `${firstName} ${initials}`;
}

export async function syncSessionToGoogleCalendar(
  session: Session,
  patient?: Patient | null,
  clinicAddress?: string,
): Promise<GoogleCalendarSyncResult | null> {
  const accessToken = authService.getGoogleAccessToken();
  if (!accessToken) {
    return null;
  }

  const startDateTime = `${session.date}T${session.startTime.padEnd(5, ":00").slice(0, 5)}:00`;
  const endDateTime = `${session.date}T${session.endTime.padEnd(5, ":00").slice(0, 5)}:00`;

  const confidentialName = formatConfidentialPatientName(session.patientName);

  const descriptionLines = [
    `Sessão de psicoterapia com a Psicóloga Ana Lima (CRP 04/60205).`,
    `Paciente: ${confidentialName}`,

    `Modalidade: ${session.modality === "online" ? "Atendimento Online via Google Meet" : "Atendimento Presencial"}`,
  ].filter(Boolean);

  const eventBody: Record<string, any> = {
    summary: `Atendimento — ${confidentialName}`,
    description: descriptionLines.join("\n"),
    location:
      session.modality === "online"
        ? session.meetLink || "Google Meet"
        : clinicAddress || "Consultório em Poços de Caldas/MG",
    start: {
      dateTime: startDateTime,
      timeZone: "America/Sao_Paulo",
    },
    end: {
      dateTime: endDateTime,
      timeZone: "America/Sao_Paulo",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 },
        { method: "popup", minutes: 15 },
      ],
    },
  };

  // Invitations are sent manually through the existing patient channel.

  // Solicita geração de sala oficial do Google Meet se a modalidade for online
  if (session.modality === "online") {
    eventBody.conferenceData = {
      createRequest: {
        requestId: `meet-${session.id}-${Date.now()}`,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    };
  }

  try {
    let response: Response | null = null;

    if (session.googleEventId) {
      response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
          session.googleEventId,
        )}?conferenceDataVersion=1`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventBody),
        },
      );
      if (response.status === 404) {
        response = null;
      }
    }

    if (!response) {
      response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventBody),
        },
      );
    }

    if (response.status === 401 || response.status === 403) {
      console.warn(
        "Token do Google Calendar expirado ou sem permissão:",
        response.status,
      );
      return null;
    }

    if (!response.ok) {
      console.warn("Google Agenda não confirmou a gravação:", response.status);
      return null;
    }

    const data = await response.json();
    const generatedMeetLink: string | undefined =
      data.hangoutLink ||
      data.conferenceData?.entryPoints?.find(
        (ep: any) => ep.entryPointType === "video",
      )?.uri ||
      session.meetLink;

    return {
      googleEventId: data.id,
      meetLink: generatedMeetLink,
      googleCalendarUrl: data.htmlLink,
    };
  } catch (err) {
    console.warn("Erro de rede ao sincronizar com Google Calendar:", err);
    return null;
  }
}

export async function deleteSessionFromGoogleCalendar(
  googleEventId?: string,
): Promise<void> {
  if (!googleEventId) return;
  const accessToken = authService.getGoogleAccessToken();
  if (!accessToken) return;

  try {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
  } catch (e) {
    console.warn("Erro ao remover evento do Google Calendar:", e);
  }
}
