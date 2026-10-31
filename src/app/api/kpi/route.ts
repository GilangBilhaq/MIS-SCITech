import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "sci-tech-01";
    const publishedOnly = searchParams.get("publishedOnly") === "true";

    let sql = `
      SELECT k.*, 
             u.nama_lengkap as user_nama,
             u.panggilan as user_panggilan,
             u.divisi as user_divisi,
             u.jabatan as user_jabatan
      FROM kpi_evaluations k
      LEFT JOIN users u ON k.user_id = u.id
      WHERE k.company_id = $1
    `;
    const params: (string | boolean)[] = [companyId];

    if (publishedOnly) {
      sql += ` AND k.is_published = true`;
    }

    sql += ` ORDER BY k.tahun DESC, k.bulan DESC, k.nilai_akhir DESC`;

    const res = await query(sql, params);

    // Also get helper stats per user for current month (total worklog hours and completed plans)
    const statsRes = await query(`
      SELECT 
        u.id as user_id,
        COALESCE(SUM(w.jam_durasi), 0)::numeric(5,1) as jam_kerja_bulan_ini,
        COUNT(DISTINCT w.id)::int as jumlah_worklog,
        COUNT(DISTINCT mp.id) FILTER (WHERE mp.is_completed = true)::int as rencana_selesai,
        COUNT(DISTINCT mp.id)::int as total_rencana
      FROM users u
      LEFT JOIN worklogs w ON w.user_id = u.id 
        AND EXTRACT(MONTH FROM w.tanggal) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM w.tanggal) = EXTRACT(YEAR FROM CURRENT_DATE)
      LEFT JOIN monthly_plans mp ON mp.user_id = u.id
        AND mp.bulan = EXTRACT(MONTH FROM CURRENT_DATE)
        AND mp.tahun = EXTRACT(YEAR FROM CURRENT_DATE)
      WHERE u.company_id = $1 AND u.is_active = true
      GROUP BY u.id
    `, [companyId]);

    const statsMap: Record<string, unknown> = {};
    for (const row of statsRes.rows) {
      statsMap[row.user_id] = row;
    }

    return NextResponse.json({ success: true, data: res.rows, userStats: statsMap });
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
      indikator_kpi,
      target,
      realisasi,
      skor,
      bobot_persen,
      is_published,
    } = body;

    if (!user_id || !indikator_kpi) {
      return NextResponse.json(
        { success: false, message: "User ID dan indikator KPI wajib diisi." },
        { status: 400 }
      );
    }

    const id = `KPI-${Date.now().toString().slice(-5)}`;
    const compId = company_id || "sci-tech-01";
    const scoreVal = parseInt(skor) || 90;
    const weightVal = parseInt(bobot_persen) || 30;
    const finalVal = Math.round((scoreVal * weightVal) / 100);

    const kategori =
      scoreVal >= 95
        ? "Exemplary"
        : scoreVal >= 85
        ? "High Performer"
        : scoreVal >= 70
        ? "Average"
        : "Needs Improvement";

    const res = await query(
      `INSERT INTO kpi_evaluations (id, company_id, user_id, bulan, tahun, indikator_kpi, target, realisasi, skor, skor_kategori, bobot_persen, nilai_akhir, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        id,
        compId,
        user_id,
        bulan || new Date().getMonth() + 1,
        tahun || new Date().getFullYear(),
        indikator_kpi,
        target || "-",
        realisasi || "-",
        scoreVal,
        kategori,
        weightVal,
        finalVal,
        is_published !== undefined ? is_published : true,
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
    const { id, is_published, indikator_kpi, target, realisasi, skor, bobot_persen } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "ID KPI diperlukan." }, { status: 400 });
    }

    if (indikator_kpi !== undefined) {
      const scoreVal = parseInt(skor) || 90;
      const weightVal = parseInt(bobot_persen) || 30;
      const finalVal = Math.round((scoreVal * weightVal) / 100);
      const kategori =
        scoreVal >= 95
          ? "Exemplary"
          : scoreVal >= 85
          ? "High Performer"
          : scoreVal >= 70
          ? "Average"
          : "Needs Improvement";

      const res = await query(
        `UPDATE kpi_evaluations
         SET indikator_kpi = COALESCE($1, indikator_kpi),
             target = COALESCE($2, target),
             realisasi = COALESCE($3, realisasi),
             skor = $4,
             bobot_persen = $5,
             nilai_akhir = $6,
             skor_kategori = $7
         WHERE id = $8
         RETURNING *`,
        [indikator_kpi, target, realisasi, scoreVal, weightVal, finalVal, kategori, id]
      );
      return NextResponse.json({ success: true, data: res.rows[0] });
    }

    const res = await query(
      `UPDATE kpi_evaluations SET is_published = $1 WHERE id = $2 RETURNING *`,
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
      return NextResponse.json({ success: false, message: "ID KPI diperlukan." }, { status: 400 });
    }

    await query(`DELETE FROM kpi_evaluations WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: "Evaluasi KPI berhasil dihapus." });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
