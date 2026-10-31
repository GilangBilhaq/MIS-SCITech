import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "sci-tech-01";
    const userId = searchParams.get("userId");
    const kategori = searchParams.get("kategori");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let sql = `
      SELECT w.*, 
             u.nama_lengkap as user_nama,
             u.panggilan as user_panggilan,
             u.divisi as user_divisi,
             mp.rencana_pekerjaan as plan_title
      FROM worklogs w
      LEFT JOIN users u ON w.user_id = u.id
      LEFT JOIN monthly_plans mp ON w.plan_id = mp.id
      WHERE w.company_id = $1
    `;
    const params: (string | number)[] = [companyId];

    if (userId && userId !== "ALL") {
      params.push(userId);
      sql += ` AND w.user_id = $${params.length}`;
    }
    if (kategori && kategori !== "Semua") {
      params.push(kategori);
      sql += ` AND w.kategori = $${params.length}`;
    }
    if (startDate) {
      params.push(startDate);
      sql += ` AND w.tanggal >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      sql += ` AND w.tanggal <= $${params.length}`;
    }

    sql += ` ORDER BY w.tanggal DESC, w.created_at DESC`;

    const res = await query(sql, params);
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
      user_id,
      plan_id,
      tanggal,
      jam_durasi,
      pekerjaan,
      kategori,
      dokumentasi_url,
      pin,
    } = body;

    if (!user_id || !pekerjaan || !tanggal || !pin) {
      return NextResponse.json(
        { success: false, message: "User, tanggal, deskripsi pekerjaan, dan PIN 6-digit wajib diisi." },
        { status: 400 }
      );
    }

    // Verify PIN
    const userRes = await query(`SELECT pin_code FROM users WHERE id = $1`, [user_id]);
    if (userRes.rowCount === 0 || userRes.rows[0].pin_code !== pin) {
      return NextResponse.json(
        { success: false, message: "PIN keamanan salah. Pengisian worklog ditolak." },
        { status: 401 }
      );
    }

    const id = `WL-${Date.now().toString().slice(-5)}`;
    const compId = company_id || "sci-tech-01";
    const durasi = parseFloat(jam_durasi) || 4.0;
    const planFk = plan_id && plan_id !== "NONE" ? plan_id : null;

    const res = await query(
      `INSERT INTO worklogs (id, company_id, user_id, plan_id, tanggal, jam_durasi, pekerjaan, kategori, dokumentasi_url, status, pin_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true)
       RETURNING *`,
      [id, compId, user_id, planFk, tanggal, durasi, pekerjaan, kategori || "Development", dokumentasi_url || null]
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
      user_id,
      plan_id,
      tanggal,
      jam_durasi,
      pekerjaan,
      kategori,
      pin,
    } = body;

    if (!id || !user_id || !pin || !pekerjaan) {
      return NextResponse.json(
        { success: false, message: "ID, User, deskripsi, dan PIN 6-digit wajib diisi." },
        { status: 400 }
      );
    }

    // Verify PIN
    const userRes = await query(`SELECT pin_code FROM users WHERE id = $1`, [user_id]);
    if (userRes.rowCount === 0 || userRes.rows[0].pin_code !== pin) {
      return NextResponse.json(
        { success: false, message: "PIN keamanan salah. Pembaruan worklog ditolak." },
        { status: 401 }
      );
    }

    const durasi = parseFloat(jam_durasi) || 4.0;
    const planFk = plan_id && plan_id !== "NONE" ? plan_id : null;

    const res = await query(
      `UPDATE worklogs
       SET plan_id = $1,
           tanggal = $2,
           jam_durasi = $3,
           pekerjaan = $4,
           kategori = $5
       WHERE id = $6
       RETURNING *`,
      [planFk, tanggal, durasi, pekerjaan, kategori || "Development", id]
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
    const userId = searchParams.get("userId");
    const pin = searchParams.get("pin");

    if (!id || !userId || !pin) {
      return NextResponse.json(
        { success: false, message: "Worklog ID, User ID, dan PIN 6-digit diperlukan." },
        { status: 400 }
      );
    }

    // Verify PIN
    const userRes = await query(`SELECT pin_code FROM users WHERE id = $1`, [userId]);
    if (userRes.rowCount === 0 || userRes.rows[0].pin_code !== pin) {
      return NextResponse.json(
        { success: false, message: "PIN keamanan salah. Penghapusan worklog dibatalkan." },
        { status: 401 }
      );
    }

    await query(`DELETE FROM worklogs WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: "Worklog berhasil dihapus." });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
