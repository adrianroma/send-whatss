"use client";

import { useId, useRef, useState } from "react";

export type EstadoLead = "No Enviado" | "Enviado" | "Recibido";

export const ESTADOS_LEAD: EstadoLead[] = ["No Enviado", "Enviado", "Recibido"];

export interface Lead {
  id: string;
  name: string;
  phone: string;
  status: EstadoLead;
  template: string;
  date: string;
}

const statusStyles: Record<EstadoLead, string> = {
  "No Enviado": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  Enviado: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  Recibido: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
};

const DEFAULT_TEMPLATE = "hello_world";

function isEstado(value: string): value is EstadoLead {
  return (ESTADOS_LEAD as string[]).includes(value);
}

/** Minimal CSV parser: comma-separated, one row per line, no quoted-field support. */
function parseLeadsCsv(text: string, availableTemplates: string[]): Lead[] {
  const lines = text.split(/\r\n|\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => names.map((n) => header.indexOf(n)).find((i) => i !== -1) ?? -1;

  const nameIdx = col("nombre", "name");
  const phoneIdx = col("telefono", "teléfono", "phone");
  const statusIdx = col("estado", "status");
  const templateIdx = col("plantilla", "template");
  const dateIdx = col("fecha", "date");

  return lines.slice(1).map((line, i) => {
    const cells = line.split(",").map((c) => c.trim());
    const rawStatus = statusIdx !== -1 ? cells[statusIdx] : "";
    const rawTemplate = templateIdx !== -1 ? cells[templateIdx] : "";

    return {
      id: `csv-${Date.now()}-${i}`,
      name: nameIdx !== -1 ? cells[nameIdx] || "—" : "—",
      phone: phoneIdx !== -1 ? cells[phoneIdx] || "—" : "—",
      status: isEstado(rawStatus) ? rawStatus : "No Enviado",
      template:
        rawTemplate && availableTemplates.includes(rawTemplate) ? rawTemplate : DEFAULT_TEMPLATE,
      date: dateIdx !== -1 ? cells[dateIdx] || "" : "",
    };
  });
}

export function LeadsSection({
  initialLeads,
  availableTemplates,
}: {
  initialLeads: Lead[];
  availableTemplates: string[];
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [uploadMessage, setUploadMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  const templateOptions = availableTemplates.includes(DEFAULT_TEMPLATE)
    ? availableTemplates
    : [DEFAULT_TEMPLATE, ...availableTemplates];

  function updateLead(id: string, patch: Partial<Pick<Lead, "status" | "template">>) {
    setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseLeadsCsv(text, templateOptions);

      if (parsed.length === 0) {
        setUploadMessage({
          type: "error",
          text: "No se encontraron filas válidas. Revisa que el archivo tenga un encabezado y al menos una fila de datos.",
        });
        return;
      }

      setLeads(parsed);
      setUploadMessage({
        type: "success",
        text: `${parsed.length} lead${parsed.length === 1 ? "" : "s"} cargado${parsed.length === 1 ? "" : "s"} desde "${file.name}".`,
      });
    } catch {
      setUploadMessage({ type: "error", text: "No se pudo leer el archivo." });
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Cargar leads desde archivo
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              CSV con encabezado: nombre, telefono, estado, plantilla, fecha
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor={fileInputId}
              className="cursor-pointer rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Elegir archivo…
            </label>
          </div>
        </div>

        {uploadMessage && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              uploadMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
            }`}
          >
            {uploadMessage.text}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Leads recientes
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Teléfono</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Plantilla</th>
                <th className="px-5 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                >
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                    {lead.name}
                  </td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{lead.phone}</td>
                  <td className="px-5 py-3">
                    <select
                      value={lead.status}
                      onChange={(e) =>
                        updateLead(lead.id, { status: e.target.value as EstadoLead })
                      }
                      className={`rounded-full border-0 px-2.5 py-0.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-500 ${statusStyles[lead.status]}`}
                    >
                      {ESTADOS_LEAD.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={lead.template}
                      onChange={(e) => updateLead(lead.id, { template: e.target.value })}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-900 dark:text-white focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    >
                      {templateOptions.map((template) => (
                        <option key={template} value={template}>
                          {template}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{lead.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
