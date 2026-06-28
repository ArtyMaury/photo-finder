import { NextRequest, NextResponse } from "next/server";
import { searchCommunes } from "@/lib/communes";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const communes = await searchCommunes(query);
    return NextResponse.json(communes);
  } catch (error) {
    console.error("Communes search error:", error);
    return NextResponse.json({ error: "Failed to search communes" }, { status: 500 });
  }
}
