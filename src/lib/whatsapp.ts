export interface WhatsAppConfig {
  apiVersion: string;
  phoneNumberId: string | undefined;
  templateName: string;
  templateLanguage: string;
  defaultTestNumber: string;
  hasToken: boolean;
  /** Token masked for display, e.g. "EAAQ••••AZDZD". Never send the real token to the client. */
  maskedToken: string;
}

function maskToken(token: string | undefined): string {
  if (!token) return "No configurado";
  if (token.length <= 8) return "••••••••";
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
}

/** Safe-to-render config summary for the Configuración page. Contains no secret. */
export function getWhatsAppConfig(): WhatsAppConfig {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  return {
    apiVersion: process.env.WHATSAPP_API_VERSION || "v25.0",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    templateName: process.env.WHATSAPP_TEMPLATE_NAME || "hello_world",
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US",
    defaultTestNumber: process.env.WHATSAPP_DEFAULT_TEST_NUMBER || "",
    hasToken: Boolean(token),
    maskedToken: maskToken(token),
  };
}

export interface SendResult {
  ok: boolean;
  status: number;
  data: unknown;
}

/**
 * Sends the configured WhatsApp template message via the Meta Graph API, equivalent to:
 *
 *   curl -i -X POST https://graph.facebook.com/{version}/{phoneNumberId}/messages \
 *     -H "Authorization: Bearer <access token>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"messaging_product":"whatsapp","to":"<to>","type":"template","template":{"name":"hello_world","language":{"code":"en_US"}}}'
 */
export async function sendWhatsAppTemplate(to: string): Promise<SendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v25.0";
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "hello_world";
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US";

  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp no está configurado (faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID)"
    );
  }

  const res = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLanguage },
        },
      }),
    }
  );

  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

export interface WhatsAppTemplate {
  name: string;
  status: string;
  language: string;
  category?: string;
}

export interface TemplatesResult {
  ok: boolean;
  templates: WhatsAppTemplate[];
  error?: string;
  /** True once a WHATSAPP_BUSINESS_ACCOUNT_ID is set, regardless of fetch outcome. */
  configured: boolean;
}

/**
 * Lists message templates for the configured WhatsApp Business Account, via:
 *
 *   GET https://graph.facebook.com/{version}/{wabaId}/message_templates
 *
 * Falls back to just the default template name when WHATSAPP_BUSINESS_ACCOUNT_ID
 * isn't set or the call fails, so callers always have at least one usable option.
 */
export async function listWhatsAppTemplates(): Promise<TemplatesResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v25.0";
  const defaultTemplateName = process.env.WHATSAPP_TEMPLATE_NAME || "hello_world";

  if (!wabaId || !token) {
    return {
      ok: false,
      configured: false,
      templates: [{ name: defaultTemplateName, status: "N/A", language: "en_US" }],
      error: "WHATSAPP_BUSINESS_ACCOUNT_ID no está configurado",
    };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?fields=name,status,language,category&limit=200`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        configured: true,
        templates: [{ name: defaultTemplateName, status: "N/A", language: "en_US" }],
        error: data?.error?.message || `Meta respondió con el error ${res.status}`,
      };
    }

    const templates: WhatsAppTemplate[] = Array.isArray(data?.data)
      ? data.data.map((t: { name: string; status: string; language: string; category?: string }) => ({
          name: t.name,
          status: t.status,
          language: t.language,
          category: t.category,
        }))
      : [];

    if (templates.length === 0) {
      templates.push({ name: defaultTemplateName, status: "N/A", language: "en_US" });
    }

    return { ok: true, configured: true, templates };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      templates: [{ name: defaultTemplateName, status: "N/A", language: "en_US" }],
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}
