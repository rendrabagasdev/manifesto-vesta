import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import YAML from "yaml";

/**
 * GET /api/docs/openapi.json
 * Serve OpenAPI spec dalam format JSON
 */
export async function GET() {
  try {
    const filePath = join(process.cwd(), "docs", "openapi.yaml");
    const fileContents = await readFile(filePath, "utf8");
    const spec = YAML.parse(fileContents);

    return NextResponse.json(spec);
  } catch (error) {
    console.error("Error loading OpenAPI spec:", error);
    return NextResponse.json(
      {
        error: "Failed to load OpenAPI specification",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
