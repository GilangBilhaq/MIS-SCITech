import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "sci-tech-01";
    const tipe = searchParams.get("tipe");
    const kegunaan = searchParams.get("kegunaan");

    let sql = `SELECT * FROM transactions WHERE company_id = $1`;
    const params: string[] = [companyId];

    if (tipe && tipe !== "Semua") {
      params.push(tipe.toUpperCase());
      sql += ` AND tipe = $${params.length}`;
    }
    if (kegunaan && kegunaan !== "Semua") {
      params.push(kegunaan);
      sql += ` AND kegunaan = $${params.length}`;
    }

    sql += ` ORDER BY tanggal DESC, created_at DESC`;

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
      tipe,
      nama_item,
      deskripsi,
      tanggal,
      kegunaan,
      jumlah,
      harga_pcs,
      metode,
    } = body;

    if (!tipe || !nama_item || !tanggal || !harga_pcs) {
      return NextResponse.json(
        { success: false, message: "Tipe, nama item, tanggal, dan harga wajib diisi." },
        { status: 400 }
      );
    }

    const id = `TRX-${Date.now().toString().slice(-6)}`;
    const compId = company_id || "sci-tech-01";
    const qty = parseInt(jumlah) || 1;
    const price = parseFloat(harga_pcs) || 0;
    const total = qty * price;

    const res = await query(
      `INSERT INTO transactions (id, company_id, tipe, nama_item, deskripsi, tanggal, kegunaan, jumlah, harga_pcs, total_harga, metode, status_verifikasi)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Terverifikasi')
       RETURNING *`,
      [id, compId, tipe.toUpperCase(), nama_item, deskripsi || "-", tanggal, kegunaan || "Operasional", qty, price, total, metode || "Transfer Bank (BCA)"]
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
      tipe,
      nama_item,
      deskripsi,
      tanggal,
      kegunaan,
      jumlah,
      harga_pcs,
      metode,
    } = body;

    if (!id || !nama_item || !harga_pcs) {
      return NextResponse.json(
        { success: false, message: "ID, nama item, dan harga wajib diisi." },
        { status: 400 }
      );
    }

    const qty = parseInt(jumlah) || 1;
    const price = parseFloat(harga_pcs) || 0;
    const total = qty * price;

    const res = await query(
      `UPDATE transactions
       SET tipe = COALESCE($1, tipe),
           nama_item = COALESCE($2, nama_item),
           deskripsi = COALESCE($3, deskripsi),
           tanggal = COALESCE($4, tanggal),
           kegunaan = COALESCE($5, kegunaan),
           jumlah = COALESCE($6, jumlah),
           harga_pcs = COALESCE($7, harga_pcs),
           total_harga = $8,
           metode = COALESCE($9, metode)
       WHERE id = $10
       RETURNING *`,
      [tipe, nama_item, deskripsi, tanggal, kegunaan, qty, price, total, metode, id]
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
      return NextResponse.json({ success: false, message: "ID transaksi diperlukan." }, { status: 400 });
    }

    await query(`DELETE FROM transactions WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: "Transaksi berhasil dihapus." });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
