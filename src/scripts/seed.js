const { Client } = require('pg');

async function seed() {
  const dbUrl = 'postgresql://postgres:gIlang6*@localhost:5432/db_mis';
  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log('Seeding initial data into PostgreSQL (db_mis)...');

    // 1. Users
    const users = [
      ['USR-001', 'sci-tech-01', 'Budi Santoso', 'Budi', 'budi@scitech.id', 'STAFF', 'Engineering', 'Lead Frontend Engineer', '123456'],
      ['USR-002', 'sci-tech-01', 'Yosef Satria', 'Yosef', 'yosef@scitech.id', 'MANAGER', 'Cloud Infrastructure', 'Lead Architecture & DevOps', '112233'],
      ['USR-003', 'sci-tech-01', 'Anindya Rahma', 'Anindya', 'anindya@scitech.id', 'STAFF', 'Design & UX', 'Product Designer', '223344'],
      ['USR-004', 'sci-tech-01', 'Dimas Farhan', 'Dimas', 'dimas@scitech.id', 'STAFF', 'Backend & Security', 'Senior Fullstack Engineer', '334455'],
      ['USR-005', 'sci-tech-01', 'Karina Putri', 'Karina', 'karina@scitech.id', 'STAFF', 'QA & Reliability', 'QA & Reliability Eng.', '445566'],
      ['USR-006', 'sci-tech-01', 'Anisa Rahmawati', 'Anisa', 'anisa.keuangan@scitech.id', 'FINANCE_ADMIN', 'Finance & Accounting', 'Finance Lead & Controller', '778899'],
      ['USR-007', 'sci-tech-01', 'Farhan Pratama', 'Farhan', 'farhan@scitech.id', 'CEO_ADMIN', 'Executive Management', 'CEO & Managing Director', '556677'],
    ];

    for (const u of users) {
      await client.query(`
        INSERT INTO users (id, company_id, nama_lengkap, panggilan, email, role, divisi, jabatan, pin_code, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        ON CONFLICT (id) DO UPDATE SET pin_code = EXCLUDED.pin_code;
      `, u);
    }
    console.log('✓ Users & 6-digit PINs seeded.');

    // 2. Announcements
    const announcements = [
      ['ANN-001', 'sci-tech-01', 'All-Hands Meeting Q2 & Evaluasi Target Kuartal', 'Penyampaian milestone korporat Q1 2026, arahan prioritas arsitektur multi-tenant fase kedua, serta apresiasi pencapaian divisi engineering & produk. Terbuka via tautan siaran langsung untuk seluruh staf dan mitra.', 'Penting', true],
      ['ANN-002', 'sci-tech-01', 'Pembaruan Kebijakan Keamanan PIN 6-Digit & Audit Trail', 'Seluruh staf wajib menggunakan PIN 6-digit terenkripsi untuk konfirmasi pengisian worklog dan monthly plan demi kepatuhan ISO 27001.', 'Info', true]
    ];

    for (const a of announcements) {
      await client.query(`
        INSERT INTO announcements (id, company_id, judul, isi_pengumuman, prioritas, is_published)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING;
      `, a);
    }
    console.log('✓ Announcements seeded.');

    // 3. Projects
    const projects = [
      ['PRJ-001', 'sci-tech-01', 'Revamp ERP Cloud Infrastructure', 'PT Mahakarya Digital Nusantara', 'Yosef Satria', '2026-04-30', 72, 'Development', 'Penyelesaian migrasi cluster PostgreSQL baremetal ke High-Availability mode.', 'Cloud Infra', 'Sprint 14/18'],
      ['PRJ-002', 'sci-tech-01', 'Mobile Banking SDK & Middleware', 'Bank Artha Graha Digital', 'Budi Santoso', '2026-05-15', 45, 'Development', 'Integrasi modul m-token enkripsi SHA-256 dan unit testing API.', 'Fintech API', 'Sprint 6/12'],
      ['PRJ-003', 'sci-tech-01', 'Smart City IoT Dashboard & Telemetri', 'Dinas Kominfo Pemprov DKI', 'Dimas Farhan', '2026-04-20', 90, 'Testing', 'Sensor telemetri terpadu, tahap User Acceptance Testing (UAT).', 'IoT Analytics', 'UAT Tahap Akhir']
    ];

    for (const p of projects) {
      await client.query(`
        INSERT INTO projects (id, company_id, nama_project, client, pic_teknisi, deadline, progress_persen, tahapan_saat_ini, catatan_teknis, divisi_tag, sprint_info)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING;
      `, p);
    }
    console.log('✓ Projects seeded.');

    // 4. Transactions
    const transactions = [
      ['TRX-001', 'sci-tech-01', 'PEMASUKAN', 'B2B Enterprise Subscription Renewal', 'Tenant #MahakaryaCloud • INV-2026-0412', '2026-04-18', 'SaaS Subscription', 1, 85000000, 85000000, 'Transfer Bank (BCA)'],
      ['TRX-002', 'sci-tech-01', 'PENGELUARAN', 'Pembayaran Cloud AWS Server Cluster', 'Infrastruktur Multi-tenant • ID: AWS-883921', '2026-04-17', 'Infrastruktur', 1, 14200000, 14200000, 'Corporate Card (Mandiri)'],
      ['TRX-003', 'sci-tech-01', 'PEMASUKAN', 'Jasa Implementasi Custom Tenant', 'PT Sinar Makmur Abadi • INV-2026-0399', '2026-04-15', 'Professional Service', 1, 45000000, 45000000, 'Virtual Account (BNI)'],
      ['TRX-004', 'sci-tech-01', 'PENGELUARAN', 'Payroll & Operasional Tim Engineering', 'Gaji Batch Tengah Bulan • REF-PAY-0414', '2026-04-14', 'SDM & Operasional', 1, 38500000, 38500000, 'Auto-Debit B2B (BCA)']
    ];

    for (const t of transactions) {
      await client.query(`
        INSERT INTO transactions (id, company_id, tipe, nama_item, deskripsi, tanggal, kegunaan, jumlah, harga_pcs, total_harga, metode)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING;
      `, t);
    }
    console.log('✓ Transactions seeded.');

    // 5. KPIs
    const kpis = [
      ['KPI-001', 'sci-tech-01', 'USR-002', 4, 2026, 'Cloud Infrastructure Uptime & Zero Downtime Migration', '99.9% Uptime', '99.98% Uptime dicapai', 98, 'Exemplary', 35, 98, true],
      ['KPI-002', 'sci-tech-01', 'USR-003', 4, 2026, 'Design Token Integration & Micro-Interaction Polish', '100% Tokenized Design', 'Selesai 100% di Figma', 95, 'Exemplary', 30, 95, true],
      ['KPI-003', 'sci-tech-01', 'USR-004', 4, 2026, 'Backend API Response Latency & Security Hardening', 'P95 latency < 120ms', 'P95 latency 88ms tercapai', 92, 'High Performer', 35, 92, true],
      ['KPI-004', 'sci-tech-01', 'USR-005', 4, 2026, 'Automated End-to-End Test Suite Coverage', 'Coverage test > 85%', 'Coverage 88.4% tercapai', 90, 'High Performer', 30, 90, true]
    ];

    for (const k of kpis) {
      await client.query(`
        INSERT INTO kpi_evaluations (id, company_id, user_id, bulan, tahun, indikator_kpi, target, realisasi, skor, skor_kategori, bobot_persen, nilai_akhir, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING;
      `, k);
    }
    console.log('✓ KPIs seeded.');

    // 6. Worklogs
    const worklogs = [
      ['WL-001', 'sci-tech-01', 'USR-001', '2026-04-14', 4.5, 'Integrasi endpoint GraphQL API pembayaran multi-tenant. Webhook checkout gateway.', 'Development', true, true],
      ['WL-002', 'sci-tech-01', 'USR-001', '2026-04-14', 3.0, 'Review PR modul RBAC auth multi-tenant platform. Pengecekan sanitasi input & scope.', 'Development', true, true],
      ['WL-003', 'sci-tech-01', 'USR-001', '2026-04-13', 6.0, 'Resolusi error race condition sinkronisasi data arsip tahunan. Hotfix release v2.4.1.', 'Development', true, true],
      ['WL-004', 'sci-tech-01', 'USR-001', '2026-04-12', 2.5, 'Sync mingguan progres tahapan proyek integrasi client. Diskusi delivery modul audit trail.', 'Client Meeting', true, true]
    ];

    for (const w of worklogs) {
      await client.query(`
        INSERT INTO worklogs (id, company_id, user_id, tanggal, jam_durasi, pekerjaan, kategori, status, pin_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING;
      `, w);
    }
    console.log('✓ Worklogs seeded.');

    await client.end();
    console.log('🎉 ALL DATA SEEDED SUCCESSFULLY INTO POSTGRESQL (db_mis)!');
  } catch (e) {
    console.error('Seed error:', e.message);
  }
}

seed();
