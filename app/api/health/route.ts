import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";
export const preferredRegion = "iad1";
export const maxDuration = 5;

export async function GET() {
  try {
    const { env } = getRequestContext();
    const DB = (env as any)?.DB;
    return NextResponse.json({ ok: true, db: Boolean(DB) });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "health check failed" },
      { status: 500 }
    );
  }
}
