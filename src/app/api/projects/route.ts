import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "sci-tech-01";

    const sql = `
      SELECT p.*, rp.nomor_rab as rab_nomor
      FROM projects p
      LEFT JOIN rab_projects rp ON p.rab_id = rp.id
      WHERE p.company_id = $1
      ORDER BY p.deadline ASC, p.created_at DESC
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
      rab_id,
      nama_project,
      client,
      pic_teknisi,
      deadline,
      progress_persen,
      tahapan_saat_ini,
      catatan_teknis,
      divisi_tag,
      sprint_info,
    } = body;

    if (!nama_project || !client || !pic_teknisi) {
      return NextResponse.json(
        { success: false, message: "Nama proyek, klien, dan PIC teknisi wajib diisi." },
        { status: 400 }
      );
    }

    const id = `PRJ-${Date.now().toString().slice(-5)}`;
    const compId = company_id || "sci-tech-01";
    const rabFk = rab_id && rab_id !== "NONE" ? rab_id : null;

    const res = await query(
      `INSERT INTO projects (id, company_id, rab_id, nama_project, client, pic_teknisi, deadline, progress_persen, tahapan_saat_ini, catatan_teknis, divisi_tag, sprint_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        compId,
        rabFk,
        nama_project,
        client,
        pic_teknisi,
        deadline || new Date().toISOString().split("T")[0],
        parseInt(progress_persen) || 0,
        tahapan_saat_ini || "Development",
        catatan_teknis || "-",
        divisi_tag || "Cloud Infra",
        sprint_info || "Sprint Berjalan",
      ]
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
    const {
      id,
      nama_project,
      client,
      pic_teknisi,
      deadline,
      progress_persen,
      tahapan_saat_ini,
      catatan_teknis,
      divisi_tag,
      rab_id,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Project ID diperlukan." }, { status: 400 });
    }

    const rabFk = rab_id && rab_id !== "NONE" ? rab_id : null;

    const res = await query(
      `UPDATE projects
       SET nama_project = COALESCE($1, nama_project),
           client = COALESCE($2, client),
           pic_teknisi = COALESCE($3, pic_teknisi),
           deadline = COALESCE($4, deadline),
           progress_persen = COALESCE($5, progress_persen),
           tahapan_saat_ini = COALESCE($6, tahapan_saat_ini),
           catatan_teknis = COALESCE($7, catatan_teknis),
           divisi_tag = COALESCE($8, divisi_tag),
           rab_id = COALESCE($9, rab_id)
       WHERE id = $10
       RETURNING *`,
      [
        nama_project,
        client,
        pic_teknisi,
        deadline,
        progress_persen !== undefined ? parseInt(progress_persen) : null,
        tahapan_saat_ini,
        catatan_teknis,
        divisi_tag,
        rabFk,
        id,
      ]
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
      return NextResponse.json({ success: false, message: "Project ID diperlukan." }, { status: 400 });
    }

    await query(`DELETE FROM projects WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: "Proyek berhasil dihapus." });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
