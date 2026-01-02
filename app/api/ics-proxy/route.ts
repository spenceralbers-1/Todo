import { NextResponse } from "next/server";
import { resolve } from "node:dns/promises";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

const isPrivateIp = (ip: string) => {
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("127.")) return true;
  if (ip.startsWith("169.254.")) return true;
  if (ip.startsWith("172.")) {
    const second = Number(ip.split(".")[1]);
    return second >= 16 && second <= 31;
  }
  if (ip.startsWith("192.168.")) return true;
  if (ip === "::1") return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  if (ip.startsWith("fe80")) return true;
  return false;
};

const validateUrl = async (rawUrl: string) => {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") {
    throw new Error("Only https URLs are allowed");
  }
  if (!url.hostname) {
    throw new Error("Invalid URL");
  }
  const addresses = await resolve(url.hostname);
  if (addresses.some((addr) => isPrivateIp(addr))) {
    throw new Error("Private IPs are not allowed");
  }
  return url;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const url = await validateUrl(rawUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "todo-ics-proxy",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "Empty response" }, { status: 502 });
    }

    let total = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.length;
      if (total > MAX_BYTES) {
        return NextResponse.json({ error: "Response too large" }, { status: 413 });
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
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "text/calendar; charset=utf-8" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
}
