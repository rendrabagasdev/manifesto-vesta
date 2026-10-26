import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * GET /api/docs/postman.json
 * Serve Postman collection untuk import
 */
export async function GET() {
  try {
    const filePath = join(process.cwd(), "docs", "postman_collection.json");
    const fileContents = await readFile(filePath, "utf8");
    const collection = JSON.parse(fileContents);

    return NextResponse.json(collection);
  } catch (error) {
    console.error("Error loading Postman collection:", error);
    return NextResponse.json(
      {
        error: "Failed to load Postman collection",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
