import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rabId } = await params;
    const body = await request.json().catch(() => ({}));
    const { pic_teknisi, deadline, catatan_teknis } = body;

    // 1. Get RAB details
    const rabRes = await query(`SELECT * FROM rab_projects WHERE id = $1`, [rabId]);
    if (rabRes.rowCount === 0) {
      return NextResponse.json({ success: false, message: "RAB tidak ditemukan." }, { status: 404 });
    }
    const rab = rabRes.rows[0];

    // Check if already converted
    const existingProj = await query(`SELECT id, nama_project FROM projects WHERE rab_id = $1`, [rabId]);
    if (existingProj.rowCount && existingProj.rowCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `RAB ini sudah pernah dikonversi ke Proyek: ${existingProj.rows[0].nama_project} (${existingProj.rows[0].id})`,
        },
        { status: 400 }
      );
    }

    // 2. Mark RAB as Approved
    await query(`UPDATE rab_projects SET status = 'Approved', pic_pin_verified = true WHERE id = $1`, [rabId]);

    // 3. Create Project in projects table
    const projId = `PRJ-${Date.now().toString().slice(-5)}`;
    const projRes = await query(
      `INSERT INTO projects (id, company_id, rab_id, nama_project, client, pic_teknisi, deadline, progress_persen, tahapan_saat_ini, catatan_teknis, divisi_tag, sprint_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 10, 'Pengadaan Alat', $8, 'Project Delivery', 'Sprint Inisiasi')
       RETURNING *`,
      [
        projId,
        rab.company_id,
        rab.id,
        rab.nama_project,
        rab.nama_client,
        pic_teknisi || rab.pic_name || "Lead Architecture & DevOps",
        deadline || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
        catatan_teknis || `Dikonversi dari RAB resmi No: ${rab.nomor_rab}`,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "RAB berhasil disetujui & otomatis dikonversi menjadi Proyek Berjalan!",
      data: projRes.rows[0],
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
