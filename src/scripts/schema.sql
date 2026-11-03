-- ============================================================
-- SKEMA BASIS DATA POSTGRESQL - SAAS-MIS SCI TECH (db_mis)
-- Versi: 2.0.0
-- ============================================================

-- 1. Tabel companies (Tenant Perusahaan)
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(50) PRIMARY KEY,
    nama_perusahaan VARCHAR(255) NOT NULL,
    domain_sub VARCHAR(100) UNIQUE,
    status_langganan VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel users (Anggota Tim & PIN 6-Digit)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
    nama_lengkap VARCHAR(255) NOT NULL,
    panggilan VARCHAR(100),
    role VARCHAR(50) DEFAULT 'STAFF',
    divisi VARCHAR(100),
    jabatan VARCHAR(100),
    pin_code VARCHAR(255) NOT NULL, -- PIN 6-digit atau Password kredensial akun
    avatar VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    pin_last_updated DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel finance_settings (Pengaturan Keuangan Perusahaan)
CREATE TABLE IF NOT EXISTS finance_settings (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_holder VARCHAR(255) NOT NULL,
    qr_image_url TEXT,
    show_cash_to_public BOOLEAN DEFAULT FALSE,
    finance_password_hash VARCHAR(255) DEFAULT 'keuangan123',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel monthly_plans (Rencana Bulanan)
CREATE TABLE IF NOT EXISTS monthly_plans (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    bulan INT NOT NULL,
    tahun INT NOT NULL,
    rencana_pekerjaan TEXT NOT NULL,
    kategori VARCHAR(50) DEFAULT 'Development',
    prioritas VARCHAR(20) DEFAULT 'Tinggi',
    deadline DATE,
    target_output TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel worklogs (Buku Log Harian)
CREATE TABLE IF NOT EXISTS worklogs (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) REFERENCES monthly_plans(id) ON DELETE SET NULL,
    tanggal DATE NOT NULL,
    jam_durasi NUMERIC(4, 1) DEFAULT 4.0,
    pekerjaan TEXT NOT NULL,
    kategori VARCHAR(50) DEFAULT 'Development',
    dokumentasi_url TEXT,
    status BOOLEAN DEFAULT TRUE,
    pin_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel transactions (Arus Kas Keuangan)
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
    tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('PEMASUKAN', 'PENGELUARAN')),
    nama_item VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    tanggal DATE NOT NULL,
    kegunaan VARCHAR(100) NOT NULL,
    jumlah INT DEFAULT 1,
    harga_pcs NUMERIC(15, 2) NOT NULL,
    total_harga NUMERIC(15, 2) NOT NULL,
    metode VARCHAR(100) DEFAULT 'Transfer Bank (BCA)',
    status_verifikasi VARCHAR(50) DEFAULT 'Terverifikasi',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel rab_projects & rab_items (Kalkulator RAB)
CREATE TABLE IF NOT EXISTS rab_projects (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
    nomor_rab VARCHAR(100) NOT NULL,
    nama_project VARCHAR(255) NOT NULL,
    nama_client VARCHAR(255) NOT NULL,
    tanggal DATE NOT NULL,
    masa_berlaku VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Draft',
    pic_name VARCHAR(100),
    pic_pin_verified BOOLEAN DEFAULT TRUE,
    include_ppn BOOLEAN DEFAULT TRUE,
    ppn_percent INT DEFAULT 11,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rab_items (
    id VARCHAR(50) PRIMARY KEY,
    rab_id VARCHAR(50) REFERENCES rab_projects(id) ON DELETE CASCADE,
    tipe_rincian VARCHAR(20) NOT NULL CHECK (tipe_rincian IN ('Primary', 'Secondary', 'Tertiary')),
    nama_item VARCHAR(255) NOT NULL,
    spesifikasi_teknis TEXT,
    jumlah INT DEFAULT 1,
    satuan VARCHAR(50) DEFAULT 'Unit',
    harga_pcs NUMERIC(15, 2) NOT NULL,
    total_harga NUMERIC(15, 2) NOT NULL
);

-- 8. Tabel projects (Proyek Berjalan)
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
    rab_id VARCHAR(50) REFERENCES rab_projects(id) ON DELETE SET NULL,
    nama_project VARCHAR(255) NOT NULL,
    client VARCHAR(255) NOT NULL,
    pic_teknisi VARCHAR(100) NOT NULL,
    deadline DATE,
    progress_persen INT DEFAULT 0 CHECK (progress_persen BETWEEN 0 AND 100),
    tahapan_saat_ini VARCHAR(50) DEFAULT 'Development',
    catatan_teknis TEXT,
    divisi_tag VARCHAR(50) DEFAULT 'Cloud Infra',
    sprint_info VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabel kpi_evaluations (Penilaian Kinerja)
CREATE TABLE IF NOT EXISTS kpi_evaluations (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    bulan INT NOT NULL,
    tahun INT NOT NULL,
    indikator_kpi TEXT NOT NULL,
    target TEXT,
    realisasi TEXT,
    skor INT DEFAULT 90,
    skor_kategori VARCHAR(50) DEFAULT 'Exemplary',
    bobot_persen INT DEFAULT 30,
    nilai_akhir INT DEFAULT 90,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabel announcements (Informasi & Pengumuman)
CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
    judul VARCHAR(255) NOT NULL,
    isi_pengumuman TEXT NOT NULL,
    prioritas VARCHAR(20) DEFAULT 'Penting',
    tanggal_terbit TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indeks Multi-Tenant untuk performa kueri optimal
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_worklogs_company ON worklogs(company_id, user_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_monthly_plans_company ON monthly_plans(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_kpis_company ON kpi_evaluations(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_company ON announcements(company_id, is_published);

-- Seed Data Perusahaan SCI Tech
INSERT INTO companies (id, nama_perusahaan, domain_sub, status_langganan)
VALUES ('sci-tech-01', 'SCI Tech', 'scitech', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO finance_settings (id, company_id, bank_name, account_number, account_holder, show_cash_to_public, finance_password_hash)
VALUES ('fin-001', 'sci-tech-01', 'Bank Central Asia (BCA)', '883-092-1920', 'PT Solusi Cerdas Infrastructure Technology', FALSE, 'keuangan123')
ON CONFLICT (id) DO NOTHING;
