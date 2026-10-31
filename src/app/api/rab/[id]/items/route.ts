import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rabId } = await params;
    const body = await request.json();
    const { tipe_rincian, nama_item, spesifikasi_teknis, jumlah, satuan, harga_pcs } = body;

    if (!tipe_rincian || !nama_item || !harga_pcs) {
      return NextResponse.json(
        { success: false, message: "Tipe rincian, nama item, dan harga wajib diisi." },
        { status: 400 }
      );
    }

    const id = `RI-${Date.now().toString().slice(-6)}`;
    const qty = parseInt(jumlah) || 1;
    const price = parseFloat(harga_pcs) || 0;
    const total = qty * price;

    const res = await query(
      `INSERT INTO rab_items (id, rab_id, tipe_rincian, nama_item, spesifikasi_teknis, jumlah, satuan, harga_pcs, total_harga)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, rabId, tipe_rincian, nama_item, spesifikasi_teknis || "-", qty, satuan || "Unit", price, total]
    );

    return NextResponse.json({ success: true, data: res.rows[0] });
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
    const { id: rabId } = await params;
    const body = await request.json();
    const { id: itemId, tipe_rincian, nama_item, spesifikasi_teknis, jumlah, satuan, harga_pcs } = body;

    if (!itemId) {
      return NextResponse.json({ success: false, message: "Item ID diperlukan." }, { status: 400 });
    }

    const qty = parseInt(jumlah) || 1;
    const price = parseFloat(harga_pcs) || 0;
    const total = qty * price;

    const res = await query(
      `UPDATE rab_items
       SET tipe_rincian = COALESCE($1, tipe_rincian),
           nama_item = COALESCE($2, nama_item),
           spesifikasi_teknis = COALESCE($3, spesifikasi_teknis),
           jumlah = $4,
           satuan = COALESCE($5, satuan),
           harga_pcs = $6,
           total_harga = $7
       WHERE id = $8 AND rab_id = $9
       RETURNING *`,
      [tipe_rincian, nama_item, spesifikasi_teknis, qty, satuan, price, total, itemId, rabId]
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
    const { id: rabId } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ success: false, message: "Item ID diperlukan." }, { status: 400 });
    }

    await query(`DELETE FROM rab_items WHERE id = $1 AND rab_id = $2`, [itemId, rabId]);
    return NextResponse.json({ success: true, message: "Item berhasil dihapus dari RAB." });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
