import { apiAccessError } from "@/lib/api-access";
import { NextResponse } from "next/server";
import { importStatement } from "@/lib/statement-import";
export async function POST(request: Request) {
  const accessError = await apiAccessError("POST");
  if (accessError) return accessError;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return NextResponse.json(
        { error: "A statement file is required." },
        { status: 400 },
      );
    const count = await importStatement(file);
    return NextResponse.json({
      ok: true,
      importedRows: count,
      totalStored: count,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Statement import failed.",
      },
      { status: 400 },
    );
  }
}
