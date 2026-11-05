import type { Handler } from "@netlify/functions";
import { Resend } from "resend";
import { asObject, asString } from "./parse";

const resend = new Resend(process.env.RESEND_API_KEY);

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const MAX_BODY_BYTES = 100_000;

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

export type Validation<T> = { errors: Record<string, string>; data: T };

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

type SubmitOptions<T> = {
  validate: (raw: Record<string, unknown>) => Validation<T>;
  render: (data: T, submittedAt: string) => RenderedEmail;
};

// Everything every flow needs: CORS, method check, size limit, JSON parsing,
// honeypot, validation, sending the email and the response codes.
export const createSubmitHandler = <T>(options: SubmitOptions<T>): Handler =>
  async (event) => {
    const headers = buildHeaders(event.headers.origin);

    const respond = (statusCode: number, body: Record<string, unknown>) => ({
      statusCode,
      headers,
      body: JSON.stringify(body),
    });

    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers, body: "" };
    }

    if (event.httpMethod !== "POST") {
      return respond(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    if ((event.body ?? "").length > MAX_BODY_BYTES) {
      return respond(413, { ok: false, error: "PAYLOAD_TOO_LARGE" });
    }

    let raw: Record<string, unknown>;
    try {
      raw = asObject(JSON.parse(event.body ?? "{}"));
    } catch {
      return respond(400, { ok: false, error: "INVALID_JSON" });
    }

    // Honeypot: real users never fill this hidden field, bots often do.
    // Reply with success so bots don't learn they were caught, but send nothing.
    if (asString(raw.website, 200) !== "") {
      return respond(200, { ok: true });
    }

    const { errors, data } = options.validate(raw);
    if (Object.keys(errors).length > 0) {
      return respond(400, { ok: false, error: "VALIDATION_ERROR", fields: errors });
    }

    const submittedAt = new Date().toLocaleString("en-NG", {
      timeZone: "Africa/Lagos",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const email = options.render(data, submittedAt);

    try {
      const { error } = await resend.emails.send({
        from: process.env.FROM_EMAIL!,
        to: process.env.CLIENT_EMAIL!,
        replyTo: email.replyTo,
        // Remove line breaks so user input can't tamper with the subject header
        subject: email.subject.replace(/[\r\n]+/g, " "),
        html: email.html,
        text: email.text,
      });

      if (error) {
        console.error("Resend error:", error);
        return respond(502, { ok: false, error: "EMAIL_FAILED" });
      }

      return respond(200, { ok: true });
    } catch (err) {
      console.error("Unexpected error:", err);
      return respond(500, { ok: false, error: "SERVER_ERROR" });
    }
  };