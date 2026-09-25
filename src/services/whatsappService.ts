import { WhatsAppTemplates } from '../types';

export const DEFAULT_TEMPLATES: WhatsAppTemplates = {
  reminder: "Olá, {nome}! Tudo bem? Passando para lembrar do nosso horário agendado para amanhã ({data}) às {hora}. Caso precise de qualquer ajuste, por favor me avise com antecedência. Um abraço, Ana Lima.",
  confirmation: "Olá, {nome}! Gostaria de confirmar nossa sessão agendada para hoje ({data}) às {hora}.\n\nPara não esquecer, adicione à sua agenda em 1 clique:\n{agenda}\n\nAté breve! Ana Lima (CRP 04/60205).",
  onlineLink: "Olá, {nome}! Segue o link para nossa sessão online hoje às {hora}:\n{link}\nQuando estiver pronto(a), pode acessar. Até já! Ana Lima.",
  friendlyCharge: "Olá, {nome}! Tudo bem? Segue o resumo da(s) nossa(s) sessão(ões) recente(s) no valor de R$ {valor}. Chave PIX: {pix}. Qualquer dúvida estou à disposição! Ana Lima.",
  intakeInvite: "Olá, {nome}! Aqui é a psicóloga Ana Lima (CRP 04/60205).\n\nPara agilizarmos nosso início e prepararmos seu prontuário clínico com total sigilo e comodidade, por favor preencha sua ficha cadastral prévia pelo link seguro abaixo:\n\n{link}\n-\nAssim que você preencher, recebo seus dados e já entro em contato para combinarmos o seu horário de atendimento! Até breve.",
};

export function cleanPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  // Se não começar com código do país (55), adiciona 55
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function formatWhatsAppMessage(
  template: string,
  params: {
    nome?: string;
    data?: string;
    hora?: string;
    link?: string;
    valor?: string | number;
    pix?: string;
    agenda?: string;
  }
): string {
  let message = template;
  if (params.nome) message = message.replace(/{nome}/g, params.nome.split(' ')[0]); // Primeiro nome
  if (params.data) message = message.replace(/{data}/g, params.data);
  if (params.hora) message = message.replace(/{hora}/g, params.hora);
  if (params.link) message = message.replace(/{link}/g, params.link);
  if (params.valor) message = message.replace(/{valor}/g, String(params.valor));
  if (params.pix) message = message.replace(/{pix}/g, params.pix);
  if (params.agenda) {
    message = message.replace(/{agenda}/g, params.agenda);
  } else {
    message = message.replace(/\n\nPara não esquecer, adicione à sua agenda em 1 clique:\n\{agenda\}/g, '');
    message = message.replace(/{agenda}/g, '');
  }
  return message;
}

export function generateWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  if (!cleanPhone) {
    return `https://wa.me/?text=${encodedText}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
