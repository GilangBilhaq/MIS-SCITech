import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "sci-tech-01";
    const userId = searchParams.get("userId");
    const bulan = searchParams.get("bulan");
    const tahun = searchParams.get("tahun");

    let sql = `
      SELECT mp.*, 
             u.nama_lengkap as user_nama,
             u.divisi as user_divisi,
             COUNT(w.id)::int as total_worklogs,
             COALESCE(SUM(w.jam_durasi), 0)::numeric(5,1) as total_jam_tercatat
      FROM monthly_plans mp
      LEFT JOIN users u ON mp.user_id = u.id
      LEFT JOIN worklogs w ON w.plan_id = mp.id
      WHERE mp.company_id = $1
    `;
    const params: (string | number)[] = [companyId];

    if (userId && userId !== "ALL") {
      params.push(userId);
      sql += ` AND mp.user_id = $${params.length}`;
    }
    if (bulan) {
      params.push(parseInt(bulan));
      sql += ` AND mp.bulan = $${params.length}`;
    }
    if (tahun) {
      params.push(parseInt(tahun));
      sql += ` AND mp.tahun = $${params.length}`;
    }

    sql += ` GROUP BY mp.id, u.nama_lengkap, u.divisi ORDER BY mp.created_at DESC`;

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
      bulan,
      tahun,
      rencana_pekerjaan,
      kategori,
      prioritas,
      deadline,
      target_output,
      pin,
    } = body;

    if (!user_id || !rencana_pekerjaan || !pin) {
      return NextResponse.json(
        { success: false, message: "User ID, rencana pekerjaan, dan PIN 6-digit wajib diisi." },
        { status: 400 }
      );
    }

    // Verify PIN
    const userRes = await query(`SELECT pin_code FROM users WHERE id = $1`, [user_id]);
    if (userRes.rowCount === 0 || userRes.rows[0].pin_code !== pin) {
      return NextResponse.json(
        { success: false, message: "PIN keamanan tidak sesuai. Aksi ditolak." },
        { status: 401 }
      );
    }

    const id = `MP-${Date.now().toString().slice(-5)}`;
    const compId = company_id || "sci-tech-01";
    const now = new Date();
    const b = bulan || now.getMonth() + 1;
    const y = tahun || now.getFullYear();

    const res = await query(
      `INSERT INTO monthly_plans (id, company_id, user_id, bulan, tahun, rencana_pekerjaan, kategori, prioritas, deadline, target_output, is_completed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
       RETURNING *`,
      [id, compId, user_id, b, y, rencana_pekerjaan, kategori || "Development", prioritas || "Tinggi", deadline, target_output || "-"]
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
      is_completed,
      pin,
      user_id,
      rencana_pekerjaan,
      kategori,
      prioritas,
      deadline,
      target_output,
      bulan,
      tahun,
    } = body;

    if (!id || !pin || !user_id) {
      return NextResponse.json(
        { success: false, message: "Plan ID, User ID, dan PIN 6-digit wajib diisi." },
        { status: 400 }
      );
    }

    // Verify PIN
    const userRes = await query(`SELECT pin_code FROM users WHERE id = $1`, [user_id]);
    if (userRes.rowCount === 0 || userRes.rows[0].pin_code !== pin) {
      return NextResponse.json(
        { success: false, message: "PIN keamanan tidak cocok. Otorisasi ditolak." },
        { status: 401 }
      );
    }

    if (rencana_pekerjaan !== undefined) {
      const res = await query(
        `UPDATE monthly_plans
         SET rencana_pekerjaan = COALESCE($1, rencana_pekerjaan),
             kategori = COALESCE($2, kategori),
             prioritas = COALESCE($3, prioritas),
             deadline = COALESCE($4, deadline),
             target_output = COALESCE($5, target_output),
             bulan = COALESCE($6, bulan),
             tahun = COALESCE($7, tahun)
         WHERE id = $8
         RETURNING *`,
        [rencana_pekerjaan, kategori, prioritas, deadline, target_output, bulan, tahun, id]
      );
      return NextResponse.json({ success: true, data: res.rows[0] });
    }

    const res = await query(
      `UPDATE monthly_plans SET is_completed = $1 WHERE id = $2 RETURNING *`,
      [is_completed, id]
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
        { success: false, message: "Plan ID, User ID, dan PIN 6-digit diperlukan." },
        { status: 400 }
      );
    }

    // Verify PIN
    const userRes = await query(`SELECT pin_code FROM users WHERE id = $1`, [userId]);
    if (userRes.rowCount === 0 || userRes.rows[0].pin_code !== pin) {
      return NextResponse.json(
        { success: false, message: "PIN keamanan tidak cocok. Penghapusan dibatalkan." },
        { status: 401 }
      );
    }

    await query(`DELETE FROM monthly_plans WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: "Rencana bulanan berhasil dihapus." });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
