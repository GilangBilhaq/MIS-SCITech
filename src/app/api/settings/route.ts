import { NextResponse } from "next/server";
import { query } from "@/lib/db";

async function ensureFinanceColumns() {
  try {
    await query(`
      ALTER TABLE finance_settings 
      ADD COLUMN IF NOT EXISTS default_ppn_percent INT DEFAULT 11,
      ADD COLUMN IF NOT EXISTS invoice_prefix VARCHAR(100) DEFAULT 'INV-SCI/{YYYY}/{MM}',
      ADD COLUMN IF NOT EXISTS default_payment_terms_days INT DEFAULT 14,
      ADD COLUMN IF NOT EXISTS default_invoice_notes TEXT DEFAULT 'Pembayaran dianggap sah apabila dana telah efektif masuk ke rekening resmi PT Solusi Cerdas Infrastructure Technology. Mohon sertakan nomor invoice pada berita transfer.',
      ADD COLUMN IF NOT EXISTS minimum_cash_alert NUMERIC(15, 2) DEFAULT 25000000;
    `);
  } catch {
    // Ignore if table/columns already updated or running in restricted mode
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || "sci-tech-01";

    await ensureFinanceColumns();

    const compRes = await query(`SELECT * FROM companies WHERE id = $1`, [companyId]);
    const finRes = await query(`SELECT * FROM finance_settings WHERE company_id = $1`, [companyId]);

    return NextResponse.json({
      success: true,
      company: compRes.rows[0] || null,
      finance: finRes.rows[0] || null,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { type, company_id, companyData, financeData, passwordData } = body;
    const compId = company_id || "sci-tech-01";

    if (type === "COMPANY" && companyData) {
      const { nama_perusahaan, domain_sub } = companyData;
      await query(
        `UPDATE companies
         SET nama_perusahaan = COALESCE($1, nama_perusahaan),
             domain_sub = COALESCE($2, domain_sub)
         WHERE id = $3`,
        [nama_perusahaan, domain_sub, compId]
      );
    } else if (type === "FINANCE" && financeData) {
      await ensureFinanceColumns();
      const {
        bank_name,
        account_number,
        account_holder,
        show_cash_to_public,
        qr_image_url,
        default_ppn_percent,
        invoice_prefix,
        default_payment_terms_days,
        default_invoice_notes,
        minimum_cash_alert,
      } = financeData;

      await query(
        `UPDATE finance_settings
         SET bank_name = COALESCE($1, bank_name),
             account_number = COALESCE($2, account_number),
             account_holder = COALESCE($3, account_holder),
             show_cash_to_public = COALESCE($4, show_cash_to_public),
             qr_image_url = COALESCE($5, qr_image_url),
             default_ppn_percent = COALESCE($6, default_ppn_percent),
             invoice_prefix = COALESCE($7, invoice_prefix),
             default_payment_terms_days = COALESCE($8, default_payment_terms_days),
             default_invoice_notes = COALESCE($9, default_invoice_notes),
             minimum_cash_alert = COALESCE($10, minimum_cash_alert),
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $11`,
        [
          bank_name,
          account_number,
          account_holder,
          show_cash_to_public,
          qr_image_url,
          default_ppn_percent,
          invoice_prefix,
          default_payment_terms_days,
          default_invoice_notes,
          minimum_cash_alert,
          compId,
        ]
      );
    } else if (type === "PASSWORD_FINANCE" && passwordData) {
      const { newPassword } = passwordData;
      await query(
        `UPDATE finance_settings SET finance_password_hash = $1 WHERE company_id = $2`,
        [newPassword, compId]
      );
    }

    const updatedComp = await query(`SELECT * FROM companies WHERE id = $1`, [compId]);
    const updatedFin = await query(`SELECT * FROM finance_settings WHERE company_id = $1`, [compId]);

    return NextResponse.json({
      success: true,
      message: "Pengaturan berhasil diperbarui di database.",
      company: updatedComp.rows[0],
      finance: updatedFin.rows[0],
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, company_id, password } = body;
    const compId = company_id || "sci-tech-01";

    if (action === "RESET_ALL_DATA") {
      // Verifikasi password manajemen
      const defaultPw = "admin123";
      if (!password || (password !== defaultPw && password !== "556677")) {
        return NextResponse.json(
          { success: false, message: "Kata sandi manajemen tidak valid." },
          { status: 401 }
        );
      }

      // Bersihkan seluruh data operasional di PostgreSQL
      await query(`TRUNCATE TABLE worklogs CASCADE`);
      await query(`TRUNCATE TABLE monthly_plans CASCADE`);
      await query(`TRUNCATE TABLE kpi_evaluations CASCADE`);
      await query(`TRUNCATE TABLE rab_items CASCADE`);
      await query(`TRUNCATE TABLE projects CASCADE`);
      await query(`TRUNCATE TABLE rab_projects CASCADE`);
      await query(`TRUNCATE TABLE transactions CASCADE`);
      await query(`TRUNCATE TABLE announcements CASCADE`);
      await query(`TRUNCATE TABLE users CASCADE`);

      // Sisakan 1 Akun Utama CEO_ADMIN agar tetap bisa login
      await query(`
        INSERT INTO users (id, company_id, nama_lengkap, panggilan, role, divisi, jabatan, pin_code, is_active)
        VALUES ('USR-001', $1, 'Farhan Pratama', 'Farhan', 'CEO_ADMIN', 'Executive Management', 'CEO & Managing Director', '556677', true)
        ON CONFLICT (id) DO UPDATE SET is_active = true
      `, [compId]);

      // Sisakan 1 Akun Utama Finance
      await query(`
        INSERT INTO users (id, company_id, nama_lengkap, panggilan, role, divisi, jabatan, pin_code, is_active)
        VALUES ('USR-002', $1, 'Admin Keuangan', 'Finance', 'FINANCE_ADMIN', 'Finance & Accounting', 'Finance Lead', '123456', true)
        ON CONFLICT (id) DO UPDATE SET is_active = true
      `, [compId]);

      return NextResponse.json({
        success: true,
        message: "Seluruh data dummy operasional berhasil dihapus bersih dari database.",
      });
    }

    return NextResponse.json({ success: false, message: "Aksi tidak dikenali." }, { status: 400 });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: err }, { status: 500 });
  }
}
