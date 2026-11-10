import type { Handler } from "@netlify/functions";
import { createHash } from "crypto";

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

// What the signature locks the upload to
const FOLDER = "consultations";
const ALLOWED_FORMATS = "pdf,jpg,jpeg,png";
// "upload" = anyone with the link can open the file.
// "authenticated" = private, needs signed links (ask the client, then see notes).
const DELIVERY_TYPE = "upload";

export const handler: Handler = async (event) => {
  const headers = buildCorsHeaders(event.headers.origin, "POST, OPTIONS");
  const respond = (statusCode: number, body: unknown) => ({
    statusCode,
    headers,
    body: JSON.stringify(body),
  });

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return respond(405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  // Only requests from approved websites get a signature
  const origin = event.headers.origin;
  if (!origin || !allowedOrigins.includes(origin)) {
    return respond(403, { ok: false, error: "ORIGIN_NOT_ALLOWED" });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return respond(500, { ok: false, error: "NOT_CONFIGURED" });
  }

  const timestamp = Math.round(Date.now() / 1000);


  // Cloudinary signs these params: sorted by name, joined as key=value&key=value
  const paramsToSign: Record<string, string | number> = {
    allowed_formats: ALLOWED_FORMATS,
    folder: FOLDER,
    timestamp,
    type: DELIVERY_TYPE,
  };

  const toSign = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join("&");

  const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");

  return respond(200, {
    ok: true,
    cloudName,
    apiKey, // public identifier, not the secret
    signature,
    ...paramsToSign,
  });
};