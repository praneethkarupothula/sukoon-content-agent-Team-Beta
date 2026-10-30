import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

type SafeResponse = { body: string; url: string; contentType: string };
const maxBytes = 1_000_000;

function isBlockedAddress(address: string) {
  const normalized = address.toLowerCase().split("%")[0];
  if (net.isIPv4(normalized)) {
    const [a, b] = normalized.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (net.isIPv6(normalized)) {
    return normalized === "::" || normalized === "::1" ||
      normalized.startsWith("fc") || normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized) || normalized.startsWith("::ffff:");
  }
  return true;
}

async function requestOnce(url: URL, redirectsLeft: number): Promise<SafeResponse> {
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are allowed.");
  if (url.username || url.password) throw new Error("URLs with embedded credentials are not allowed.");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Only standard HTTP(S) ports are allowed.");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(hostname)
    ? [{ address: hostname, family: net.isIP(hostname) }]
    : await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((item) => isBlockedAddress(item.address))) {
    throw new Error("This URL resolves to a private, reserved, or unavailable network address.");
  }
  const selected = addresses[0];
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        protocol: url.protocol,
        hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: { "User-Agent": "SukoonContentAgent/1.0", Accept: "text/html,text/plain;q=0.9" },
        servername: net.isIP(hostname) ? undefined : hostname,
        // Pin the connection to the vetted address. Node's happy-eyeballs (autoSelectFamily) asks for
        // `all: true` and expects an array, otherwise it fails with "Invalid IP address: undefined".
        lookup: ((_host: string, options: { all?: boolean }, callback: (...args: unknown[]) => void) => {
          if (options?.all) callback(null, [{ address: selected.address, family: selected.family }]);
          else callback(null, selected.address, selected.family);
        }) as unknown as net.LookupFunction,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if ([301, 302, 303, 307, 308].includes(status) && location) {
          res.resume();
          if (redirectsLeft <= 0) return reject(new Error("The URL exceeded the redirect limit."));
          const nextUrl = new URL(location, url);
          void requestOnce(nextUrl, redirectsLeft - 1).then(resolve, reject);
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          reject(new Error(`The source returned HTTP ${status}.`));
          return;
        }
        const contentType = String(res.headers["content-type"] ?? "");
        if (!/^(text\/html|text\/plain|application\/xhtml\+xml)/i.test(contentType)) {
          res.resume();
          reject(new Error("The provided URL did not return an HTML or text page."));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            req.destroy(new Error("The source exceeds the 1 MB response limit."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ body: Buffer.concat(chunks).toString("utf8"), url: url.toString(), contentType }));
      },
    );
    req.setTimeout(8000, () => req.destroy(new Error("The source request timed out.")));
    req.on("error", reject);
    req.end();
  });
}

export async function fetchSafeUrl(input: string) {
  return requestOnce(new URL(input), 3);
}

export function extractPage(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "Provided article";
  const text = html
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
  return { title, text };
}
