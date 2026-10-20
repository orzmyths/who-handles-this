import { createHash } from "node:crypto";
import { isOfficialContactUrl } from "./agency-contacts";

export type Observation = {
  status: "ok" | "restricted" | "unavailable";
  checkedAt: string;
  detail: string;
  text: string | null;
  hash: string | null;
};

// Keep text and link targets, but ignore scripts, styling and shared site chrome.
// Conservative changes are review signals, never authoritative replacements.
export function normalizeContactPage(html: string): string {
  const entities: Record<string, string> = {
    nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", ndash: "–", mdash: "—",
  };
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|svg|header|footer|nav)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const main = cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i)?.[1] ?? cleaned;
  return main
    .replace(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi, " [link: $1] ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => decodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => decodePoint(Number(decimal)))
    .replace(/&(nbsp|amp|quot|apos|lt|gt|ndash|mdash);/gi, (_, entity) =>
      entities[entity.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ").trim();
}

function decodePoint(point: number) {
  return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
}

export function observeResponse(status: number, html: string, checkedAt: string, contentType = "text/html"): Observation {
  if (status === 401 || status === 403) {
    return { status: "restricted", checkedAt, detail: `HTTP ${status}: automated access restricted; content not compared.`, text: null, hash: null };
  }
  if (status < 200 || status >= 300 || !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
    return { status: "unavailable", checkedAt, detail: `HTTP ${status}: no usable official HTML; content not compared.`, text: null, hash: null };
  }
  const text = normalizeContactPage(html);
  if (text.length < 100 || /just a moment|verify you are human|access denied|captcha|request rejected|enable javascript and cookies/i.test(text)) {
    return { status: "restricted", checkedAt, detail: "Empty or challenge page; manual browser verification needed. Content not compared.", text: null, hash: null };
  }
  return { status: "ok", checkedAt, detail: "Official page text and link targets compared.", text, hash: createHash("sha256").update(text).digest("hex") };
}

export async function fetchContactSource(url: string): Promise<Observation> {
  const checkedAt = new Date().toISOString();
  try {
    if (!isOfficialContactUrl(url)) throw new Error("Not an approved official source");
    // Validate every redirect before requesting it.
    for (let redirects = 0; redirects < 6; redirects++) {
      const response = await fetch(url, {
        redirect: "manual", signal: AbortSignal.timeout(5_000),
        headers: { accept: "text/html,application/xhtml+xml", "user-agent": "Who-Handles-This-contact-review/1.0" },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const next = new URL(response.headers.get("location") ?? "", url).href;
        if (!isOfficialContactUrl(next)) throw new Error("Redirect left approved official hosts");
        url = next;
        continue;
      }
      // Bound memory usage; oversized responses are unknown, not changed.
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.length;
          if (size > 2_000_000) { await reader.cancel(); throw new Error("Page exceeds comparison size limit"); }
          chunks.push(part.value);
        }
      }
      return observeResponse(response.status, Buffer.concat(chunks).toString("utf8"), checkedAt, response.headers.get("content-type") ?? "");
    }
    throw new Error("Too many redirects");
  } catch (error) {
    return { status: "unavailable", checkedAt, detail: `Could not compare page: ${error instanceof Error ? error.message : String(error)}`, text: null, hash: null };
  }
}