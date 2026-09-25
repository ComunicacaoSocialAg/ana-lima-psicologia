import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Video, DollarSign, Save, MessageSquare } from 'lucide-react';
import { Session, SessionStatus, Modality, PaymentStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { WhatsAppModal } from '../common/WhatsAppModal';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToEdit?: Session | null;
  defaultDate?: string;
  defaultPatientId?: string;
}

export const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  onClose,
  sessionToEdit,
  defaultDate,
  defaultPatientId,
}) => {
  const { patients, settings, saveSession } = useApp();

  const [patientId, setPatientId] = useState('');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('14:50');
  const [modality, setModality] = useState<Modality>('presencial');
  const [meetLink, setMeetLink] = useState('');
  const [status, setStatus] = useState<SessionStatus>('scheduled');
  const [price, setPrice] = useState(200);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [notes, setNotes] = useState('');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(!sessionToEdit);
  const [whatsAppPayload, setWhatsAppPayload] = useState<{ session: Session; patient: any } | null>(null);

  useEffect(() => {
    if (sessionToEdit) {
      setPatientId(sessionToEdit.patientId);
      setDate(sessionToEdit.date);
      setStartTime(sessionToEdit.startTime);
      setEndTime(sessionToEdit.endTime);
      setModality(sessionToEdit.modality);
      setMeetLink(sessionToEdit.meetLink || '');
      setStatus(sessionToEdit.status);
      setPrice(sessionToEdit.price);
      setPaymentStatus(sessionToEdit.paymentStatus);
      setNotes(sessionToEdit.notes || '');
    } else {
      const selected = defaultPatientId 
        ? patients.find(p => p.id === defaultPatientId) 
        : (patients[0] || null);

      if (selected) {
        setPatientId(selected.id);
        setPrice(selected.agreedPrice || 200);
        setModality(selected.preferredModality || 'presencial');
      }
      setDate(defaultDate || new Date().toISOString().slice(0, 10));
      setStartTime('14:00');
      setEndTime('14:50');
      setMeetLink(settings.defaultOnlineLink || '');
      setStatus('scheduled');
      setPaymentStatus('pending');
      setNotes('');
    }
  }, [sessionToEdit, isOpen, defaultDate, defaultPatientId, patients, settings]);

  if (!isOpen) return null;

  const handlePatientSelect = (pId: string) => {
    setPatientId(pId);
    const p = patients.find(item => item.id === pId);
    if (p) {
      setPrice(p.agreedPrice || 200);
      setModality(p.preferredModality || 'presencial');
    }
  };

  const handleModalityChange = (newModality: Modality) => {
    setModality(newModality);
    if (newModality === 'online' && !meetLink) {
      setMeetLink(settings.defaultOnlineLink || 'https://meet.google.com/qzw-mxto-pky');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
      alert('Selecione um paciente.');
      return;
    }

    const payload: Session = {
      id: sessionToEdit?.id || `ses-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      patientPhone: patient.phone,
      date,
      startTime,
      endTime,
      modality,
      meetLink: modality === 'online' ? (meetLink.trim() || settings.defaultOnlineLink) : undefined,
      status,
      price: Number(price) || 200,
      paymentStatus,
      hasRecord: sessionToEdit?.hasRecord || false,
      recordId: sessionToEdit?.recordId,
      notes: notes.trim() || undefined,
      createdAt: sessionToEdit?.createdAt || new Date().toISOString(),
    };

    saveSession(payload);
    if (notifyWhatsApp) {
      setWhatsAppPayload({ session: payload, patient });
    } else {
      onClose();
    }
  };

  return (
    <>
      <div className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 ${whatsAppPayload ? 'hidden' : ''}`}>
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">
                {sessionToEdit ? 'Editar Sessão' : 'Agendar Nova Sessão'}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Calendário clínico de Ana Lima
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <form id="session-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Paciente */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paciente <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={patientId}
                onChange={(e) => handlePatientSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.phone} ({p.preferredModality})
                  </option>
                ))}
              </select>
            </div>

            {/* Data e Horário */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Início</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Término</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modalidade e Link do Meet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidade</label>
                <select
                  value={modality}
                  onChange={(e) => handleModalityChange(e.target.value as Modality)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="presencial">🏢 Presencial (Consultório)</option>
                  <option value="online">💻 Online (Google Meet / Jitsi)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status da Sessão</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SessionStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="scheduled">📅 Agendada</option>
                  <option value="confirmed">✅ Confirmada (WhatsApp)</option>
                  <option value="completed">🎉 Realizada</option>
                  <option value="missed_chargeable">⚠️ Falta com Cobrança</option>
                  <option value="missed_non_chargeable">ℹ️ Falta Justificada</option>
                  <option value="canceled">❌ Cancelada</option>
                </select>
              </div>
            </div>

            {modality === 'online' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-brand-600" />
                  <span>Link da Sala Virtual (Google Meet / Vídeo)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            )}

            {/* Financeiro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor da Sessão (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-500 font-medium">R$</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pagamento
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="pending">⏳ Pendente</option>
                  <option value="paid">💰 Pago</option>
                  <option value="waived">🤝 Isento</option>
                </select>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lembretes Internos / Observações da Sessão
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Checar envio do exercício de respiração; paciente pediu para focar no trabalho..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {/* Banner explicativo rápido */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-900">
              <span className="text-base">📅</span>
              <p className="leading-tight">
                O link inteligente de agenda (Google & Apple Calendar) é gerado automaticamente com os dados da sessão em Poços de Caldas, MG.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer select-none">
            <input
              type="checkbox"
              id="notify-whatsapp"
              checked={notifyWhatsApp}
              onChange={(e) => setNotifyWhatsApp(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
            />
            <span className="font-medium">
              Abrir WhatsApp com <strong className="text-emerald-700">link de agenda</strong> após salvar
            </span>
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="session-form"
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{sessionToEdit ? 'Atualizar Sessão' : 'Salvar Agendamento'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

      {whatsAppPayload && (
        <WhatsAppModal
          isOpen={Boolean(whatsAppPayload)}
          onClose={() => {
            setWhatsAppPayload(null);
            onClose();
          }}
          patientName={whatsAppPayload.session.patientName}
          patientPhone={whatsAppPayload.session.patientPhone}
          emergencyContact={whatsAppPayload.patient?.emergencyContact}
          sessionDate={whatsAppPayload.session.date}
          sessionTime={whatsAppPayload.session.startTime}
          endTime={whatsAppPayload.session.endTime}
          modality={whatsAppPayload.session.modality}
          meetLink={whatsAppPayload.session.meetLink}
          amount={whatsAppPayload.session.price}
          initialTemplate="confirmation"
        />
      )}
    </>
  );
};
