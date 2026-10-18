import { NextResponse } from "next/server";
import { cleanupExpiredNotices } from "@/lib/server-notice-deletion";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const result = await cleanupExpiredNotices();
        return NextResponse.json({
            ok: true,
            timestamp: new Date().toISOString(),
            ...result,
        });
    } catch (error) {
        console.error("[Notice Auto-Cleanup API]", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Cleanup failed" },
            { status: 500 }
        );
    }
}

export async function POST() {
    return GET();
}

