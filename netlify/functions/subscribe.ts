import type { Handler } from "@netlify/functions";
import { Resend } from "resend";
import { EMAIL_REGEX, asString } from "../shared/parse";

const resend = new Resend(process.env.RESEND_API_KEY);

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const buildHeaders = (origin?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
};

export const handler: Handler = async (event) => {
  const headers = buildHeaders(event.headers.origin);
  const respond = (statusCode: number, body: Record<string, unknown>) => ({
    statusCode,
    headers,
    body: JSON.stringify(body),
  });

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return respond(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
  if ((event.body ?? "").length > 10_000) return respond(413, { ok: false, error: "PAYLOAD_TOO_LARGE" });

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(event.body ?? "{}");
  } catch {
    return respond(400, { ok: false, error: "INVALID_JSON" });
  }

  // Honeypot: bots fill the hidden field, so pretend success and do nothing
  if (asString(raw.website, 200) !== "") return respond(200, { ok: true });

  const email = asString(raw.email, 200).toLowerCase();
  if (!email) {
    return respond(400, { ok: false, error: "VALIDATION_ERROR", fields: { email: "Email is required" } });
  }
  if (!EMAIL_REGEX.test(email)) {
    return respond(400, { ok: false, error: "VALIDATION_ERROR", fields: { email: "Invalid email" } });
  }

  const segmentId = process.env.RESEND_SEGMENT_ID;
  if (!process.env.RESEND_API_KEY || !segmentId) {
    return respond(500, { ok: false, error: "NOT_CONFIGURED" });
  }

  try {
    const { error } = await resend.contacts.create({
      email,
      unsubscribed: false,
      segments: [{ id: segmentId }],
    });

    if (error) {
      console.error("Resend contacts error:", error);
      return respond(502, { ok: false, error: "SUBSCRIBE_FAILED" });
    }

    return respond(200, { ok: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return respond(500, { ok: false, error: "SERVER_ERROR" });
  }
};