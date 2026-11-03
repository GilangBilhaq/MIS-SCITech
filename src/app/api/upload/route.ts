import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { query } from "@/lib/db";

async function ensureUploadedFilesTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id VARCHAR(100) PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        original_name VARCHAR(255),
        file_type VARCHAR(50),
        mime_type VARCHAR(100),
        data_base64 TEXT NOT NULL,
        size_bytes INT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_uploaded_files_filename ON uploaded_files(filename);
    `);
  } catch {
    // Ignore if table already exists or permission
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileType = (formData.get("type") as string | null)?.toLowerCase(); // "compro", "pitch", "pitchdeck", "qris", "logo", "icon"

    if (!file) {
      return NextResponse.json({ success: false, message: "Tidak ada berkas yang diunggah." }, { status: 400 });
    }

    const isDocument = fileType === "compro" || fileType === "pitch" || fileType === "pitchdeck";
    const isImage = fileType === "qris" || fileType === "logo" || fileType === "icon";

    if (!isDocument && !isImage) {
      return NextResponse.json(
        { success: false, message: "Keamanan Sistem: Kategori upload tidak sah." },
        { status: 400 }
      );
    }

    // 1. Validasi Batasan Ukuran Berkas
    // Dokumen PDF: Maks 5 MB (5 * 1024 * 1024 bytes)
    // Gambar (QRIS, Logo, Icon): Maks 2 MB (2 * 1024 * 1024 bytes)
    const maxSizeBytes = isImage ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    const maxLimitLabel = isImage ? "2 MB" : "5 MB";

    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        {
          success: false,
          message: `Ukuran berkas (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimum ${maxLimitLabel}.`,
        },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. Validasi Keamanan Ketat Ekstensi Berkas
    const ext = path.extname(file.name).toLowerCase();

    if (isDocument) {
      // Keamanan Dokumen: Hanya PDF yang diizinkan (Cegah file .env, .config, .php, .exe, .sh, dll)
      if (ext !== ".pdf") {
        return NextResponse.json(
          {
            success: false,
            message: `Keamanan Sistem: Berkas "${file.name}" ditolak. Hanya dokumen berformat PDF (.pdf) yang diizinkan untuk menjaga integritas server.`,
          },
          { status: 400 }
        );
      }

      // Validasi MIME Type
      if (file.type && file.type !== "application/pdf") {
        return NextResponse.json(
          {
            success: false,
            message: "Keamanan Sistem: MIME type berkas tidak sesuai dengan spesifikasi dokumen PDF resmi.",
          },
          { status: 400 }
        );
      }

      // Validasi Magic Bytes: PDF wajib diawali dengan '%PDF' (0x25, 0x50, 0x44, 0x46)
      const magicBytes = buffer.subarray(0, 4).toString("utf-8");
      if (!magicBytes.startsWith("%PDF")) {
        return NextResponse.json(
          {
            success: false,
            message: "Keamanan Sistem: Berkas tidak valid. Header berkas bukan format PDF asli.",
          },
          { status: 400 }
        );
      }
    } else if (isImage) {
      const allowedImageExts = [".png", ".jpg", ".jpeg", ".webp"];
      if (!allowedImageExts.includes(ext)) {
        return NextResponse.json(
          {
            success: false,
            message: `Keamanan Sistem: Hanya format gambar (.png, .jpg, .jpeg, .webp) yang diizinkan.`,
          },
          { status: 400 }
        );
      }

      // Validasi Magic Bytes Gambar
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
      const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isWebp = buffer.subarray(0, 4).toString("utf-8") === "RIFF" && buffer.subarray(8, 12).toString("utf-8") === "WEBP";

      if (!isPng && !isJpg && !isWebp) {
        return NextResponse.json(
          {
            success: false,
            message: "Keamanan Sistem: Berkas gambar tidak valid atau rusak.",
          },
          { status: 400 }
        );
      }
    }

    // 3. Generate Nama Berkas Bersih & Parameter
    const cleanPrefix = (fileType === "pitch" ? "pitchdeck" : fileType || "doc").toLowerCase();
    const finalExt = isDocument ? ".pdf" : ext;
    const filename = `${cleanPrefix}_${Date.now()}${finalExt}`;
    const fileMime = isDocument ? "application/pdf" : file.type || (ext === ".png" ? "image/png" : "image/jpeg");

    // 4. Simpan ke Database PostgreSQL (Solusi Serverless Vercel / Cloud Database)
    // Serverless Vercel memiliki read-only filesystem, sehingga berkas disimpan ke PostgreSQL
    try {
      await ensureUploadedFilesTable();
      const fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const base64Data = buffer.toString("base64");
      await query(
        `INSERT INTO uploaded_files (id, filename, original_name, file_type, mime_type, data_base64, size_bytes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (filename) DO UPDATE
         SET data_base64 = EXCLUDED.data_base64,
             size_bytes = EXCLUDED.size_bytes,
             created_at = CURRENT_TIMESTAMP`,
        [fileId, filename, file.name, fileType, fileMime, base64Data, file.size]
      );
    } catch (dbErr) {
      console.warn("Penyimpanan berkas ke database PostgreSQL gagal atau tertunda:", dbErr);
    }

    // 5. Coba simpan ke filesystem lokal jika dapat ditulis (writable)
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, filename);
      await writeFile(filePath, buffer);
    } catch {
      // Diharapkan di Vercel (read-only filesystem EROFS), berkas tetap tersimpan utuh di database
    }

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      message: `Berkas ${file.name} berhasil diunggah secara aman.`,
      filename,
      originalName: file.name,
      url: publicUrl,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
