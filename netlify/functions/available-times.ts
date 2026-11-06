import type { Handler } from "@netlify/functions";

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const buildCorsHeaders = (origin: string | undefined, methods: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
};

export const handler: Handler = async (event) => {
  const headers = buildCorsHeaders(event.headers.origin, "GET, OPTIONS");
  const respond = (statusCode: number, body: unknown, extra: Record<string, string> = {}) => ({
    statusCode,
    headers: { ...headers, ...extra },
    body: JSON.stringify(body),
  });

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "GET") return respond(405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  const token = process.env.CALENDLY_TOKEN;
  const eventType = process.env.CALENDLY_EVENT_TYPE_URI;
  if (!token || !eventType) return respond(500, { ok: false, error: "NOT_CONFIGURED" });

  // ?start=2026-11-09&days=7 (Calendly allows at most 7 days per call)
  const params = event.queryStringParameters ?? {};
  const days = Math.min(Math.max(Number(params.days) || 7, 1), 7);

  let start = new Date();
  if (params.start) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.start)) {
      return respond(400, { ok: false, error: "INVALID_START" });
    }
    start = new Date(`${params.start}T00:00:00Z`);
    if (Number.isNaN(start.getTime())) return respond(400, { ok: false, error: "INVALID_START" });
  }

  const earliest = new Date(Date.now() + 5 * 60 * 1000); // start must be in the future
  if (start < earliest) start = earliest;
  const end = new Date(start.getTime() + days * 86400000 - 60 * 1000);

  const url =
    "https://api.calendly.com/event_type_available_times?" +
    new URLSearchParams({
      event_type: eventType,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    });

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      console.error("Calendly error", res.status, await res.text());
      return respond(502, { ok: false, error: "CALENDLY_FAILED" });
    }

    const data = (await res.json()) as {
      collection: { start_time: string; status: string }[];
    };
    const slots = data.collection
      .filter((s) => s.status === "available")
      .map((s) => s.start_time);

    // Short cache so a busy form doesn't hammer Calendly's rate limit
    return respond(200, { ok: true, slots }, { "Cache-Control": "public, max-age=60" });
  } catch (err) {
    console.error("Unexpected error:", err);
    return respond(500, { ok: false, error: "SERVER_ERROR" });
  }
};