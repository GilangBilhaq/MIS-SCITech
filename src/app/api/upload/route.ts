import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileType = formData.get("type") as string | null; // e.g. "compro", "pitchdeck", "qris", "logo"

    if (!file) {
      return NextResponse.json({ success: false, message: "Tidak ada berkas yang diunggah." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Clean file name
    const ext = path.extname(file.name) || (fileType === "qris" || fileType === "logo" ? ".png" : ".pdf");
    const cleanPrefix = (fileType || "doc").toLowerCase();
    const filename = `${cleanPrefix}_${Date.now()}${ext}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadsDir, filename);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      message: `Berkas ${file.name} berhasil diunggah ke server.`,
      filename,
      originalName: file.name,
      url: publicUrl,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
