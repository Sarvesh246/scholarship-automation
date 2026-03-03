import { NextResponse } from "next/server";
import { US_STATES } from "@/lib/usStates";

export const dynamic = "force-dynamic";

/**
 * GET /api/states
 * Returns US states/territories for dropdown. No auth required.
 */
export async function GET() {
  return NextResponse.json(US_STATES);
}
