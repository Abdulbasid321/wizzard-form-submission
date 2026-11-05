import type { FileItem } from "./parse";

// Brand colours, estimated by eye from the website design.
// Replace with the exact hex codes from Faith / the design file.
export const BRAND = {
  dark: "#06201F",
  gold: "#C9A24D",
  goldDeep: "#8F6B1F",
  page: "#F2EFE8",
  card: "#FFFFFF",
  text: "#12201F",
  muted: "#6B7775",
  border: "#E7E2D6",
  softBg: "#F8F6F0",
  headerMuted: "#B7C6C3",
};

export const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";

// Labels shared by every email. Flow-specific labels live in each flow file.
export const COMMON_LABELS = {
  brandName: "Curative Journeys",
  submittedAt: "Submitted",
  language: "Language",
  replyTo: "Reply to",
  call: "Call",
  footer: "Sent from the Curative Journeys website",
};

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const labelStyle = `font-family:${FONT};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.muted};`;

export const row = (label: string, value: string): string =>
  value
    ? `<tr>
        <td style="padding:12px 0;border-bottom:1px solid ${BRAND.border};">
          <div style="${labelStyle}">${escapeHtml(label)}</div>
          <div style="font-family:${FONT};font-size:15px;line-height:1.5;color:${BRAND.text};margin-top:4px;">${escapeHtml(value).replace(/\n/g, "<br>")}</div>
        </td>
      </tr>`
    : "";

// For long free-text answers, shown in a highlighted box
export const textBlock = (label: string, value: string): string =>
  value
    ? `<tr>
        <td style="padding:12px 0 0;">
          <div style="${labelStyle}margin-bottom:8px;">${escapeHtml(label)}</div>
          <div style="font-family:${FONT};font-size:15px;line-height:1.6;color:${BRAND.text};background:${BRAND.softBg};border-left:3px solid ${BRAND.gold};padding:14px 16px;border-radius:4px;">${escapeHtml(value).replace(/\n/g, "<br>")}</div>
        </td>
      </tr>`
    : "";

export const section = (title: string, rows: string): string =>
  rows.trim()
    ? `<tr>
        <td style="padding:28px 32px 0;">
          <div style="font-family:${FONT};font-size:12px;font-weight:bold;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.goldDeep};">${escapeHtml(title)}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">${rows}</table>
        </td>
      </tr>`
    : "";

export const glanceStrip = (items: { label: string; value: string }[]): string => {
  const shown = items.filter((i) => i.value);
  if (shown.length === 0) return "";
  const width = Math.floor(100 / shown.length);
  const cells = shown
    .map(
      (i, idx) => `<td width="${width}%" valign="top" style="padding:14px 16px;${idx > 0 ? `border-left:1px solid ${BRAND.border};` : ""}">
        <div style="${labelStyle}">${escapeHtml(i.label)}</div>
        <div style="font-family:${FONT};font-size:15px;font-weight:bold;color:${BRAND.text};margin-top:4px;">${escapeHtml(i.value)}</div>
      </td>`
    )
    .join("");
  return `<tr>
    <td style="padding:24px 32px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.softBg};border:1px solid ${BRAND.border};border-radius:8px;">
        <tr>${cells}</tr>
      </table>
    </td>
  </tr>`;
};

const fileGroup = (title: string, files: FileItem[]): string =>
  files.length === 0
    ? ""
    : `<div style="margin-top:14px;">
        <div style="${labelStyle}">${escapeHtml(title)}</div>
        <div style="margin-top:8px;">
          ${files
            .map(
              (f) =>
                `<a href="${escapeHtml(f.url)}" style="display:inline-block;background:${BRAND.dark};color:${BRAND.gold};font-family:${FONT};font-size:14px;text-decoration:none;padding:10px 16px;border-radius:6px;margin:0 8px 8px 0;">&#128206; ${escapeHtml(f.name)}</a>`
            )
            .join("")}
        </div>
      </div>`;

export const filesSection = (
  title: string,
  groups: { title: string; files: FileItem[] }[]
): string => {
  const html = groups.map((g) => fileGroup(g.title, g.files)).join("");
  if (!html) return "";
  return `<tr>
    <td style="padding:28px 32px 0;">
      <div style="font-family:${FONT};font-size:12px;font-weight:bold;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.goldDeep};">${escapeHtml(title)}</div>
      ${html}
    </td>
  </tr>`;
};

export type Contact = { fullName: string; email: string; phone: string };

const actionButtons = (c: Contact): string => {
  const firstName = c.fullName.split(" ")[0] || c.fullName;
  const telDigits = c.phone.replace(/[^\d+]/g, "");
  return `<tr>
    <td style="padding:24px 32px 0;">
      <a href="mailto:${escapeHtml(c.email)}" style="display:inline-block;background:${BRAND.gold};color:${BRAND.dark};font-family:${FONT};font-size:14px;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:6px;margin:0 8px 8px 0;">${escapeHtml(COMMON_LABELS.replyTo)} ${escapeHtml(firstName)} &rarr;</a>
      ${
        telDigits
          ? `<a href="tel:${escapeHtml(telDigits)}" style="display:inline-block;color:${BRAND.goldDeep};font-family:${FONT};font-size:14px;font-weight:bold;text-decoration:none;padding:11px 20px;border-radius:6px;border:1px solid ${BRAND.gold};margin:0 8px 8px 0;">${escapeHtml(COMMON_LABELS.call)} ${escapeHtml(c.phone)}</a>`
          : ""
      }
    </td>
  </tr>`;
};

// The outer layout: header, action buttons, your body, footer
export const emailShell = (p: {
  pill: string;
  heading: string;
  subtitle: string;
  preheader: string;
  contact: Contact;
  body: string;
  submittedAt: string;
  locale: string;
}): string => `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:${BRAND.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${BRAND.page};">${escapeHtml(p.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.page};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:${BRAND.card};border-radius:12px;overflow:hidden;">

          <tr>
            <td style="background:${BRAND.dark};padding:32px;">
              <div style="font-family:${FONT};font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND.headerMuted};margin-bottom:18px;">${escapeHtml(COMMON_LABELS.brandName)}</div>
              <span style="display:inline-block;border:1px solid ${BRAND.gold};color:${BRAND.gold};font-family:${FONT};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;border-radius:999px;padding:5px 12px;">${escapeHtml(p.pill)}</span>
              <h1 style="font-family:${FONT};font-size:28px;line-height:1.25;font-weight:normal;color:#ffffff;margin:16px 0 6px;">${escapeHtml(p.heading)}</h1>
              <div style="font-family:${FONT};font-size:14px;color:${BRAND.headerMuted};">${escapeHtml(p.subtitle)}</div>
            </td>
          </tr>

          ${actionButtons(p.contact)}

          ${p.body}

          <tr>
            <td style="padding:32px;">
              <div style="border-top:1px solid ${BRAND.border};padding-top:16px;font-family:${FONT};font-size:12px;line-height:1.6;color:${BRAND.muted};">
                ${escapeHtml(COMMON_LABELS.footer)}<br>
                ${escapeHtml(COMMON_LABELS.submittedAt)}: ${escapeHtml(p.submittedAt)} &middot; ${escapeHtml(COMMON_LABELS.language)}: ${escapeHtml(p.locale.toUpperCase())}
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ---------- Plain-text helpers ----------

export const textLine = (label: string, value: string): string =>
  value ? `${label}: ${value}` : "";

// Joins lines and collapses repeated blank lines
export const joinLines = (lines: string[]): string =>
  lines
    .filter((l, i, arr) => !(l === "" && (i === 0 || arr[i - 1] === "")))
    .join("\n")
    .trim();