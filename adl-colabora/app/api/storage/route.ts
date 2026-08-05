import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

export const dynamic = "force-dynamic";

const PREFIX = "adl-colabora-data/";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (req.nextUrl.searchParams.get("selftest") === "1") {
    try {
      await put(`${PREFIX}__selftest__.json`, JSON.stringify({ ok: true, at: Date.now() }), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return NextResponse.json({ selftest: "ok" });
    } catch (err: any) {
      return NextResponse.json({ selftest: "fail", error: String(err?.message || err), stack: String(err?.stack || "") }, { status: 500 });
    }
  }
  if (!key) return NextResponse.json({ value: null });
  try {
    const { blobs } = await list({ prefix: `${PREFIX}${key}.json`, limit: 1 });
    if (!blobs.length) return NextResponse.json({ value: null });
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    const text = await res.text();
    return NextResponse.json({ value: text });
  } catch (err: any) {
    return NextResponse.json({ value: null, debugError: String(err?.message || err) });
  }
}

export async function POST(req: NextRequest) {
  const { key, value } = await req.json();
  if (!key) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    await put(`${PREFIX}${key}.json`, value ?? "", {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
