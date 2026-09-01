"use client";

import { useId, useState } from "react";

type SendState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function WhatsAppTestCard({
  defaultNumber,
  compact = false,
}: {
  defaultNumber: string;
  compact?: boolean;
}) {
  const inputId = useId();
  const [to, setTo] = useState(defaultNumber);
  const [state, setState] = useState<SendState>({ status: "idle" });

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: "loading" });

    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();

      if (!res.ok) {
        setState({
          status: "error",
          message: data.error || `La solicitud falló (${res.status})`,
        });
        return;
      }

      setState({
        status: "success",
        message: `Mensaje enviado a ${to}. ID: ${
          data.details?.messages?.[0]?.id ?? "desconocido"
        }`,
      });
    } catch {
      setState({ status: "error", message: "Error de red. Inténtalo de nuevo." });
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400">
          ✆
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Probar envío de WhatsApp
          </h2>
          {!compact && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Envía la plantilla &quot;hello_world&quot; vía WhatsApp Cloud API
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSend} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor={inputId}
            className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Número de destino
          </label>
          <input
            id={inputId}
            type="tel"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="525535122303"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <button
          type="submit"
          disabled={state.status === "loading"}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.status === "loading" ? "Enviando..." : "Enviar mensaje de prueba"}
        </button>
      </form>

      {state.status === "success" && (
        <p className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          {state.message}
        </p>
      )}
      {state.status === "error" && (
        <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}
    </div>
  );
}
