/**
 * M2 Training Club - chat proxy (Cloudflare Worker)
 *
 * The website chat widget POSTs { system, messages } to /api/chat.
 * This Worker adds the Anthropic API key (stored as a Worker secret, never
 * in the browser), forwards the request to the Anthropic API, and returns
 * the response in the same shape the widget already expects.
 *
 * The API key is read from the ANTHROPIC_API_KEY secret. See DEPLOY.md.
 */

const ALLOWED_ORIGINS = [
  "https://m2club.co.nz",
  "https://www.m2club.co.nz",
];

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 400;

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders(origin),
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "Invalid JSON" }, 400, origin);
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const system = typeof body.system === "string" ? body.system : "";

    // Basic guard rails so the endpoint can't be abused as a general LLM proxy.
    if (messages.length === 0 || messages.length > 40) {
      return json({ error: "Bad request" }, 400, origin);
    }

    try {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system,
          messages,
        }),
      });

      const data = await upstream.json();
      return json(data, upstream.status, origin);
    } catch (e) {
      return json({ error: "Upstream error" }, 502, origin);
    }
  },
};

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}
