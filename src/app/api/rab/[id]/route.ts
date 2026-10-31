import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rabRes = await query(`SELECT * FROM rab_projects WHERE id = $1`, [id]);
    if (rabRes.rowCount === 0) {
      return NextResponse.json({ success: false, message: "RAB tidak ditemukan." }, { status: 404 });
    }

    const itemsRes = await query(
      `SELECT * FROM rab_items WHERE rab_id = $1 ORDER BY tipe_rincian ASC, id ASC`,
      [id]
    );

    const rab = {
      ...rabRes.rows[0],
      items: itemsRes.rows,
    };

    return NextResponse.json({ success: true, data: rab });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, pic_pin_verified, nama_project, nama_client, include_ppn, ppn_percent } = body;

    const res = await query(
      `UPDATE rab_projects
       SET status = COALESCE($1, status),
           pic_pin_verified = COALESCE($2, pic_pin_verified),
           nama_project = COALESCE($3, nama_project),
           nama_client = COALESCE($4, nama_client),
           include_ppn = COALESCE($5, include_ppn),
           ppn_percent = COALESCE($6, ppn_percent)
       WHERE id = $7
       RETURNING *`,
      [status, pic_pin_verified, nama_project, nama_client, include_ppn, ppn_percent, id]
    );

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await query(`DELETE FROM rab_projects WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: "RAB berhasil dihapus." });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
