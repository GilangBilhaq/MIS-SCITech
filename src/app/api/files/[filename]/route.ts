import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!filename) {
      return new NextResponse("Nama berkas tidak disertakan.", { status: 400 });
    }

    // 1. Cari berkas di database PostgreSQL (Supabase / local DB)
    try {
      const res = await query(
        `SELECT mime_type, data_base64, original_name FROM uploaded_files WHERE filename = $1`,
        [filename]
      );
      if (res.rows && res.rows.length > 0) {
        const fileRow = res.rows[0];
        const buffer = Buffer.from(fileRow.data_base64, "base64");
        const isPdf = filename.toLowerCase().endsWith(".pdf");
        const defaultMime = isPdf ? "application/pdf" : "image/png";

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": fileRow.mime_type || defaultMime,
            "Content-Disposition": `inline; filename="${encodeURIComponent(fileRow.original_name || filename)}"`,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    } catch (dbErr) {
      console.warn("DB file query deferred, checking local disk:", dbErr);
    }

    // 2. Fallback: cari di filesystem lokal jika tersimpan secara statis
    try {
      const localPath = path.join(process.cwd(), "public", "uploads", filename);
      const fileBuffer = await readFile(localPath);
      const isPdf = filename.toLowerCase().endsWith(".pdf");
      const isPng = filename.toLowerCase().endsWith(".png");
      const isJpg = filename.toLowerCase().endsWith(".jpg") || filename.toLowerCase().endsWith(".jpeg");
      const mime = isPdf ? "application/pdf" : isPng ? "image/png" : isJpg ? "image/jpeg" : "application/octet-stream";

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `inline; filename="${filename}"`,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return new NextResponse("Berkas tidak ditemukan.", { status: 404 });
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return new NextResponse("Kesalahan server: " + err, { status: 500 });
  }
}

