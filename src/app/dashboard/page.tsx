import { WhatsAppTestCard } from "@/components/whatsapp-test-card";
import { LeadsSection, type Lead } from "@/components/leads-section";
import { getWhatsAppConfig, listWhatsAppTemplates } from "@/lib/whatsapp";

const stats = [
  { label: "Mensajes enviados", value: "1,284", change: "+12.4%" },
  { label: "Conversaciones activas", value: "56", change: "+3.1%" },
  { label: "Leads nuevos", value: "23", change: "+8.9%" },
  { label: "Tasa de respuesta", value: "94%", change: "+1.2%" },
];

const recentLeads: Lead[] = [
  { id: "1", name: "María Fernández", phone: "+34 611 223 344", status: "Enviado", template: "hello_world", date: "26/08/2026" },
  { id: "2", name: "Carlos Ruiz", phone: "+34 655 998 112", status: "Recibido", template: "hello_world", date: "25/08/2026" },
  { id: "3", name: "Lucía Gómez", phone: "+34 622 445 981", status: "Enviado", template: "hello_world", date: "25/08/2026" },
  { id: "4", name: "Javier Ortega", phone: "+34 699 112 334", status: "Recibido", template: "hello_world", date: "24/08/2026" },
  { id: "5", name: "Sofía Torres", phone: "+34 633 887 221", status: "No Enviado", template: "hello_world", date: "24/08/2026" },
];

export default async function DashboardPage() {
  const whatsapp = getWhatsAppConfig();
  const templatesResult = await listWhatsAppTemplates();
  const availableTemplates = templatesResult.templates.map((t) => t.name);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Panel de control
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Resumen de actividad de los últimos 7 días
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900 dark:text-white">
                {stat.value}
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <WhatsAppTestCard defaultNumber={whatsapp.defaultTestNumber} />

      <LeadsSection initialLeads={recentLeads} availableTemplates={availableTemplates} />
    </div>
  );
}
