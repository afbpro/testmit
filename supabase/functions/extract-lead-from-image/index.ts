import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const extractionPrompt = `Analizá esta captura de WhatsApp de una
inmobiliaria en Uruguay. Extraé la información
del cliente/lead en JSON:
{
  nombre: string,
  whatsapp: string,
  operacion: 'Compra' | 'Alquiler temporal' |
             'Alquiler anual' | 'Alquiler invernal' |
             'Venta',
  tipo_propiedad: string,
  presupuesto: string,
  zona: string,
  departamento: string,
  dormitorios: string,
  notas: string
}
If a field is not found, return empty string.
Return ONLY valid JSON, no explanation.`;

function jsonResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}

function extractJsonBlock(content: string) {
  const trimmed = content.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Método no permitido" });
  }

  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) {
    return jsonResponse(500, { error: "Falta configurar ANTHROPIC_API_KEY" });
  }

  let body: { imageBase64?: string; mediaType?: string; fileName?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "JSON inválido" });
  }

  const imageBase64 = body?.imageBase64?.trim() ?? "";
  const mediaType = body?.mediaType?.trim() || "image/jpeg";

  if (!imageBase64) {
    return jsonResponse(400, { error: "Falta imageBase64" });
  }

  const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: extractionPrompt,
            },
          ],
        },
      ],
    }),
  });

  const responsePayload = await anthropicResponse.json().catch(() => null);

  if (!anthropicResponse.ok) {
    return jsonResponse(500, {
      error: "No se pudo procesar la imagen con Claude",
      details: responsePayload,
    });
  }

  const textContent = Array.isArray(responsePayload?.content)
    ? responsePayload.content
        .filter((item: { type?: string }) => item?.type === "text")
        .map((item: { text?: string }) => item?.text ?? "")
        .join("\n")
    : "";

  const jsonText = extractJsonBlock(textContent);

  if (!jsonText) {
    return jsonResponse(500, {
      error: "Claude no devolvió un JSON válido",
      raw: textContent,
    });
  }

  try {
    const lead = JSON.parse(jsonText);
    return jsonResponse(200, { ok: true, lead });
  } catch {
    return jsonResponse(500, {
      error: "No se pudo parsear el JSON devuelto por Claude",
      raw: jsonText,
    });
  }
});
