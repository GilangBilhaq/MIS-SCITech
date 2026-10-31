import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "sci-tech-01";

    const sql = `
      SELECT rp.*,
             COUNT(ri.id)::int as total_items,
             COALESCE(SUM(ri.total_harga), 0)::numeric(15,2) as subtotal_biaya,
             p.id as linked_project_id,
             p.nama_project as linked_project_nama
      FROM rab_projects rp
      LEFT JOIN rab_items ri ON ri.rab_id = rp.id
      LEFT JOIN projects p ON p.rab_id = rp.id
      WHERE rp.company_id = $1
      GROUP BY rp.id, p.id, p.nama_project
      ORDER BY rp.created_at DESC
    `;

    const res = await query(sql, [companyId]);
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      company_id,
      nama_project,
      nama_client,
      tanggal,
      masa_berlaku,
      pic_name,
      include_ppn,
      ppn_percent,
    } = body;

    if (!nama_project || !nama_client) {
      return NextResponse.json(
        { success: false, message: "Nama proyek dan nama klien wajib diisi." },
        { status: 400 }
      );
    }

    const id = `RAB-${Date.now().toString().slice(-6)}`;
    const compId = company_id || "sci-tech-01";
    const dateStr = tanggal || new Date().toISOString().split("T")[0];
    const yearMonth = dateStr.replace(/-/g, "").slice(0, 6);
    const nomorRab = `RAB/SCI/${yearMonth}/${Date.now().toString().slice(-4)}`;

    const res = await query(
      `INSERT INTO rab_projects (id, company_id, nomor_rab, nama_project, nama_client, tanggal, masa_berlaku, status, pic_name, pic_pin_verified, include_ppn, ppn_percent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Draft', $8, false, $9, $10)
       RETURNING *`,
      [
        id,
        compId,
        nomorRab,
        nama_project,
        nama_client,
        dateStr,
        masa_berlaku || "30 Hari Kalender",
        pic_name || "Lead Architecture & DevOps",
        include_ppn !== undefined ? include_ppn : true,
        ppn_percent || 11,
      ]
    );

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
