import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, pin } = body;

    if (!pin || pin.length !== 6) {
      return NextResponse.json(
        { success: false, message: "PIN harus berupa 6-digit angka." },
        { status: 400 }
      );
    }

    let userRes;
    if (userId && userId !== "ANY") {
      userRes = await query(
        `SELECT id, company_id, nama_lengkap, panggilan, role, divisi, jabatan, pin_code, is_active
         FROM users
         WHERE id = $1 AND is_active = true`,
        [userId]
      );
    } else {
      // Find any user matching this PIN
      userRes = await query(
        `SELECT id, company_id, nama_lengkap, panggilan, role, divisi, jabatan, pin_code, is_active
         FROM users
         WHERE pin_code = $1 AND is_active = true
         LIMIT 1`,
        [pin]
      );
    }

    if (userRes.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "PIN keamanan tidak cocok atau pengguna tidak aktif." },
        { status: 401 }
      );
    }

    const user = userRes.rows[0];
    if (userId && userId !== "ANY" && user.pin_code !== pin) {
      return NextResponse.json(
        { success: false, message: "PIN keamanan salah. Verifikasi gagal." },
        { status: 401 }
      );
    }

    // Return user without revealing other PINs
    return NextResponse.json({
      success: true,
      message: "Verifikasi PIN berhasil.",
      user: {
        id: user.id,
        nama_lengkap: user.nama_lengkap,
        role: user.role,
        divisi: user.divisi,
        jabatan: user.jabatan,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
