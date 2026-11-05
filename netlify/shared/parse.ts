export type FileItem = { name: string; url: string };

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const asObject = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

export const asString = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

// Accepts an array of strings or a single string
export const asStringList = (
  v: unknown,
  maxItems: number,
  maxLen: number
): string[] => {
  const list = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
  return list
    .map((x) => asString(x, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
};

// Accepts true/false or "yes"/"no" strings, returns "Yes", "No" or ""
export const asYesNo = (v: unknown): string => {
  if (v === true) return "Yes";
  if (v === false) return "No";
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["yes", "true", "y"].includes(s)) return "Yes";
    if (["no", "false", "n"].includes(s)) return "No";
  }
  return "";
};

// Reads an array of { name, url } and only allows https links
export const parseFiles = (
  value: unknown,
  field: string,
  errors: Record<string, string>
): FileItem[] => {
  if (!Array.isArray(value)) return [];
  const out: FileItem[] = [];
  value.slice(0, 10).forEach((f, i) => {
    const item = asObject(f);
    const url = asString(item.url, 1000);
    if (!url) return;
    let isHttps = false;
    try {
      isHttps = new URL(url).protocol === "https:";
    } catch {
      isHttps = false;
    }
    if (!isHttps) {
      errors[`files.${field}.${i}.url`] = "Invalid file URL";
      return;
    }
    out.push({ name: asString(item.name, 200) || `File ${i + 1}`, url });
  });
  return out;
};