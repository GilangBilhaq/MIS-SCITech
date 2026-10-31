import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "sci-tech-01";

    const res = await query(
      `SELECT * FROM announcements WHERE company_id = $1 ORDER BY tanggal_terbit DESC`,
      [companyId]
    );

    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { company_id, judul, isi_pengumuman, prioritas, is_published } = body;

    if (!judul || !isi_pengumuman) {
      return NextResponse.json(
        { success: false, message: "Judul dan isi pengumuman wajib diisi." },
        { status: 400 }
      );
    }

    const id = `ANN-${Date.now().toString().slice(-5)}`;
    const compId = company_id || "sci-tech-01";

    const res = await query(
      `INSERT INTO announcements (id, company_id, judul, isi_pengumuman, prioritas, is_published)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, compId, judul, isi_pengumuman, prioritas || "Penting", is_published !== undefined ? is_published : true]
    );

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, is_published } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "ID Pengumuman diperlukan." }, { status: 400 });
    }

    const res = await query(
      `UPDATE announcements SET is_published = $1 WHERE id = $2 RETURNING *`,
      [is_published, id]
    );

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "ID Pengumuman diperlukan." }, { status: 400 });
    }

    await query(`DELETE FROM announcements WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: "Pengumuman berhasil dihapus." });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
