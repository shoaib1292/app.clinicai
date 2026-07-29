import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check PostgreSQL
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (e) {
    checks.database = `error: ${(e as Error).message}`;
  }

  // Check Redis connectivity (via store ping)
  try {
    const { store } = await import("@/lib/store");
    // Try a simple set/get to verify the store is alive
    const testKey = `health:${Date.now()}`;
    await store.set(testKey, "ok", 5);
    const val = await store.get(testKey);
    await store.del(testKey);
    checks.redis = val === "ok" ? "ok" : "unexpected_value";
  } catch (e) {
    checks.redis = `error: ${(e as Error).message}`;
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  const statusCode = allOk ? 200 : 503;

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    },
    { status: statusCode }
  );
}
