import { getWhatsAppConfig, listWhatsAppTemplates } from "@/lib/whatsapp";
import { getAiConfig } from "@/lib/openai";
import { WhatsAppTestCard } from "@/components/whatsapp-test-card";

const templateStatusStyles: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  "N/A": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function ConfigRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 py-3 last:border-0">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-slate-900 dark:text-white">{value}</span>
        {ok !== undefined && (
          <span
            className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`}
            title={ok ? "Configurado" : "Falta configurar"}
          />
        )}
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const whatsapp = getWhatsAppConfig();
  const phoneNumberIdOk = Boolean(whatsapp.phoneNumberId);
  const ai = getAiConfig();
  const templatesResult = await listWhatsAppTemplates();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ajustes de integración con WhatsApp Cloud API (Meta Graph API) y DeepSeek
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            WhatsApp Cloud API
          </h2>
        </div>
        <div className="px-5">
          <ConfigRow label="Versión de la API" value={whatsapp.apiVersion} />
          <ConfigRow
            label="Phone Number ID"
            value={whatsapp.phoneNumberId || "No configurado"}
            ok={phoneNumberIdOk}
          />
          <ConfigRow label="Access token" value={whatsapp.maskedToken} ok={whatsapp.hasToken} />
          <ConfigRow label="Plantilla" value={whatsapp.templateName} />
          <ConfigRow label="Idioma de la plantilla" value={whatsapp.templateLanguage} />
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Estos valores se leen de variables de entorno en el servidor (
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">
              WHATSAPP_API_VERSION
            </code>
            ,{" "}
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">
              WHATSAPP_PHONE_NUMBER_ID
            </code>
            ,{" "}
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">
              WHATSAPP_ACCESS_TOKEN
            </code>
            ,{" "}
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">
              WHATSAPP_TEMPLATE_NAME
            </code>{" "}
            y{" "}
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">
              WHATSAPP_TEMPLATE_LANGUAGE
            </code>
            ). El token nunca se envía al navegador; edítalos en{" "}
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">
              .env.local
            </code>{" "}
            (o en las variables de entorno del proyecto en Vercel) y reinicia el servidor.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">DeepSeek API</h2>
        </div>
        <div className="px-5">
          <ConfigRow label="URL base" value={ai.baseUrl} />
          <ConfigRow label="Modelo" value={ai.model} />
          <ConfigRow label="API key" value={ai.maskedKey} ok={ai.hasKey} />
          <ConfigRow label="Tracking ID" value={ai.trackingId || "No configurado"} />
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Se leen de{" "}
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">DEEPSEEK_API_KEY</code>,{" "}
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">DEEPSEEK_BASE_URL</code>,{" "}
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">DEEPSEEK_MODEL</code> y{" "}
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">DEEPSEEK_TRACKING_ID</code>{" "}
            en <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">.env.local</code>. La clave
            nunca se envía al navegador; reinicia el servidor tras cambiarlas.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Plantillas de WhatsApp
          </h2>
        </div>

        {!templatesResult.configured && (
          <div className="px-5 py-4">
            <p className="rounded-lg bg-amber-50 dark:bg-amber-950 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              Configura{" "}
              <code className="rounded bg-amber-100 dark:bg-amber-900 px-1 py-0.5">
                WHATSAPP_BUSINESS_ACCOUNT_ID
              </code>{" "}
              en <code className="rounded bg-amber-100 dark:bg-amber-900 px-1 py-0.5">.env.local</code>{" "}
              para listar aquí todas las plantillas de tu cuenta de WhatsApp Business. Mientras
              tanto, solo está disponible la plantilla por defecto.
            </p>
          </div>
        )}

        {templatesResult.configured && !templatesResult.ok && (
          <div className="px-5 py-4">
            <p className="rounded-lg bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              No se pudieron cargar las plantillas de Meta: {templatesResult.error}
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Idioma</th>
                <th className="px-5 py-3 font-medium">Categoría</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {templatesResult.templates.map((template) => (
                <tr
                  key={`${template.name}-${template.language}`}
                  className="border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                >
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                    {template.name}
                    {template.name === whatsapp.templateName && (
                      <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">
                        por defecto
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                    {template.language}
                  </td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                    {template.category || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        templateStatusStyles[template.status] || templateStatusStyles["N/A"]
                      }`}
                    >
                      {template.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <WhatsAppTestCard defaultNumber={whatsapp.defaultTestNumber} />
    </div>
  );
}
