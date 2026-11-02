import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "sci-tech-01";

    const res = await query(
      `SELECT id, company_id, nama_lengkap, panggilan, role, divisi, jabatan, pin_code, avatar, is_active, pin_last_updated, created_at
       FROM users
       WHERE company_id = $1
       ORDER BY created_at ASC`,
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
    const { company_id, nama_lengkap, panggilan, role, divisi, jabatan, pin_code } = body;

    if (!nama_lengkap || !pin_code) {
      return NextResponse.json(
        { success: false, message: "Nama lengkap dan PIN/Password wajib diisi." },
        { status: 400 }
      );
    }

    const id = `USR-${Date.now().toString().slice(-4)}`;
    const compId = company_id || "sci-tech-01";
    const nick = panggilan || nama_lengkap.split(" ")[0];

    const res = await query(
      `INSERT INTO users (id, company_id, nama_lengkap, panggilan, role, divisi, jabatan, pin_code, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING *`,
      [id, compId, nama_lengkap, nick, role || "STAFF", divisi || "Engineering", jabatan || "Staff", pin_code]
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
    const { id, is_active, nama_lengkap, panggilan, divisi, jabatan, role, pin_code } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "User ID diperlukan." }, { status: 400 });
    }

    // Soft delete or field update
    if (is_active !== undefined) {
      await query(`UPDATE users SET is_active = $1 WHERE id = $2`, [is_active, id]);
    }

    if (pin_code) {
      await query(`UPDATE users SET pin_code = $1, pin_last_updated = CURRENT_DATE WHERE id = $2`, [pin_code, id]);
    }

    if (nama_lengkap || panggilan !== undefined || divisi || jabatan || role) {
      await query(
        `UPDATE users
         SET nama_lengkap = COALESCE($1, nama_lengkap),
             panggilan = COALESCE($2, panggilan),
             divisi = COALESCE($3, divisi),
             jabatan = COALESCE($4, jabatan),
             role = COALESCE($5, role)
         WHERE id = $6`,
        [nama_lengkap, panggilan, divisi, jabatan, role, id]
      );
    }

    const updated = await query(`SELECT * FROM users WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, data: updated.rows[0] });
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
      return NextResponse.json({ success: false, message: "ID anggota diperlukan." }, { status: 400 });
    }

    // Cascade delete relasi data anggota sebelum menghapus profil user
    await query(`DELETE FROM worklogs WHERE user_id = $1`, [id]);
    await query(`DELETE FROM monthly_plans WHERE user_id = $1`, [id]);
    await query(`DELETE FROM kpi_evaluations WHERE user_id = $1`, [id]);

    await query(`DELETE FROM users WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: "Anggota tim beserta riwayat terkait berhasil dihapus permanen." });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
