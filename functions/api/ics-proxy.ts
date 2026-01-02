const MAX_BYTES = 5 * 1024 * 1024;

const isBlockedHost = (hostname: string) => {
  const lower = hostname.toLowerCase();
  if (lower === "localhost") return true;
  if (lower.startsWith("127.")) return true;
  if (lower.startsWith("10.")) return true;
  if (lower.startsWith("192.168.")) return true;
  if (lower.startsWith("169.254.")) return true;
  if (lower.startsWith("::1")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("fe80")) return true;
  return false;
};

export const onRequestGet: PagesFunction = async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");
  if (!rawUrl) {
    return new Response(JSON.stringify({ error: "Missing url" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid url" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (target.protocol !== "https:") {
    return new Response(JSON.stringify({ error: "Only https URLs are allowed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (isBlockedHost(target.hostname)) {
    return new Response(JSON.stringify({ error: "Host not allowed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(target.toString(), {
      signal: controller.signal,
      headers: { "User-Agent": "todo-ics-proxy" },
    });
    clearTimeout(timeout);
    if (!response.ok || !response.body) {
      return new Response(JSON.stringify({ error: "Fetch failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.length;
      if (total > MAX_BYTES) {
        return new Response(JSON.stringify({ error: "Response too large" }), {
          status: 413,
          headers: { "Content-Type": "application/json" },
        });
      }
      chunks.push(value);
    }

    const merged = new Uint8Array(total);
    let offset = 0;
    chunks.forEach((chunk) => {
      merged.set(chunk, offset);
      offset += chunk.length;
    });
    const text = new TextDecoder().decode(merged);
    return new Response(text, {
      status: 200,
      headers: { "Content-Type": "text/calendar; charset=utf-8" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Fetch error" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
};
