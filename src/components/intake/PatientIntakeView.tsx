import React, { useState } from "react";
import { callBackend } from "../../services/backend";
export function PatientIntakeView() {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (done)
    return (
      <main className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold">Contato recebido</h1>
        <p>
          Ana entrará em contato para combinar o atendimento. O envio não
          confirma um agendamento.
        </p>
      </main>
    );
  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">Solicitar contato</h1>
      <p className="my-4">
        Informe apenas seus dados de contato. Informações de saúde, documentos e
        histórico serão solicitados em ambiente de atendimento. Para menores,
        preencha com o nome e telefone do responsável.
      </p>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          try {
            await callBackend("submitIntake", {
              name: f.get("name"),
              phone: f.get("phone"),
              preferredModality: f.get("modality"),
              preferredShift: f.get("shift"),
              isMinor: f.get("minor") === "on",
              consent: true,
              noticeVersion: "2026-10-23-v2",
            });
            setDone(true);
          } catch {
            setError(
              "Não foi possível confirmar o recebimento. Tente novamente ou contate a clínica pelo canal habitual.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block">
          Nome
          <input
            name="name"
            minLength={2}
            maxLength={120}
            required
            autoComplete="name"
            className="block w-full border p-3 rounded"
          />
        </label>
        <label className="block">
          WhatsApp com DDD
          <input
            name="phone"
            type="tel"
            minLength={10}
            maxLength={20}
            required
            autoComplete="tel"
            className="block w-full border p-3 rounded"
          />
        </label>
        <label className="block">
          Modalidade
          <select name="modality" className="border p-3">
            <option value="presencial">Presencial</option>
            <option value="online">Online</option>
          </select>
        </label>
        <label className="block">
          Turno preferido
          <select name="shift" className="border p-3">
            <option>Manhã</option>
            <option>Tarde</option>
            <option>Noite</option>
            <option>A combinar</option>
          </select>
        </label>
        <label className="block">
          <input name="minor" type="checkbox" /> Sou responsável por uma pessoa
          menor de idade
        </label>
        <p>
          Os dados serão usados pela clínica Ana Lima para responder à
          solicitação e organizar o primeiro contato. O formulário usa Firebase
          para processamento e proteção contra abuso. Para solicitar acesso,
          correção ou exclusão do contato, use o canal de atendimento da
          clínica.
        </p>
        <label className="block">
          <input type="checkbox" required /> Li o aviso e autorizo o contato
          para esta finalidade.
        </label>
        <p role="alert">{error}</p>
        <button
          disabled={busy}
          className="bg-emerald-800 text-white p-3 rounded"
        >
          {busy ? "Enviando…" : "Solicitar contato"}
        </button>
      </form>
    </main>
  );
}
