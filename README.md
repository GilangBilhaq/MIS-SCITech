# Web Manajemen SCI - PT Sentra Cipta Inovasi (SCI Tech)
> **Sistem Manajemen Informasi Enterprise, Keuangan, Proyek, & Transparansi Operasional**

Aplikasi platform terpadu berbasis **Next.js 16 (App Router + Turbopack)**, **TypeScript**, **Tailwind CSS**, dan **PostgreSQL 16**. Dirancang dengan arsitektur tangguh *Dual-Layer (PostgreSQL + High-Speed Local Storage Fallback)* sehingga sistem tetap dapat diakses 100% tanpa downtime bahkan saat koneksi server database offline.

---

## 📑 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Struktur Folder & Arsitektur](#-struktur-folder--arsitektur)
3. [Panduan Instalasi & Menjalankan](#-panduan-instalasi--menjalankan)
4. [Skema Keamanan & Akses Role](#-skema-keamanan--akses-role)
5. [Skrip Pengujian & Pemeliharaan](#-skrip-pengujian--pemeliharaan)

---

## 🚀 Fitur Utama

### 1. Portal Publik / Reguler (Tanpa Login Otoritas)
- **Dashboard Utama (`PublicDashboardView.tsx`):** Ringkasan proyek berjalan, skor sprint kuartal, log aktivitas staf *real-time*, dan pengumuman *Top Banner*.
- **Worklog Tim (`WorklogView.tsx`):** Pencatatan jam kerja harian, filter kategori, ekspor laporan CSV, dan verifikasi PIN 6-digit.
- **Rencana Bulanan (`MonthlyPlanView.tsx`):** Sasaran kerja bulanan tim dengan pemantauan deadline dan progres.

### 2. Portal Otoritas Keuangan (Akses Finansial)
- **Ringkasan Kas & Arus Kas (`FinanceDashboardView.tsx`):** Pemasukan, pengeluaran, rasio efisiensi, dan grafik neraca.
- **Buku Kas & Transaksi (`TransactionsView.tsx`):** Pencatatan transaksi multi-kategori dengan filter dan ekspor CSV.
- **Kalkulator RAB Proyek (`RabCalculatorView.tsx`):** Penyusunan RAB bertingkat (*Hardware*, *Lisensi*, *Jasa Ahli*) dengan konversi otomatis ke proyek berjalan dan cetak invoice PDF berlogo resmi.
- **Pengaturan Rekening & Pajak (`FinanceSettingsView.tsx`):** Rekening bank resmi, unggah kode QRIS, serta tarif default PPN (11%).

### 3. Portal Otoritas Manajemen & Direksi
- **Manajemen Anggota (`MembersView.tsx`):** Pengelolaan akun staf, divisi, jabatan, generator PIN 6-digit, dan hak akses.
- **Evaluasi & Rapor KPI (`KpiManagementView.tsx`):** Penilaian indikator kinerja, visual progress target vs realisasi, filter divisi, serta lembar rapor resmi (*print-ready*).
- **Informasi & Pengumuman (`AnnouncementsView.tsx`):** Publikasi pengumuman ke *Top Banner*, kategori urgensi (*Penting / Info*), live preview mockup, dan cetak memo resmi.
- **Pengaturan Identitas Perusahaan (`ManagementSettingsView.tsx`):** Kustomisasi nama brand, legalitas PT/CV, tagline, kontak kantor, dokumen profil perusahaan, dan master password CEO.

---

## 📁 Struktur Folder & Arsitektur

```text
Web Manajemen SCI/
├── Sistem/                              # Source code utama aplikasi Next.js
│   ├── .env.example                     # Panduan konfigurasi environment variable
│   ├── .env.local                       # Kredensial lokal (PostgreSQL & Passwords)
│   ├── next.config.ts                   # Konfigurasi Turbopack, kompresi, & Security Headers
│   ├── public/
│   │   ├── uploads/                     # Direktori penyimpanan media (Logo, QRIS, Dokumen PDF)
│   │   └── ...
│   └── src/
│       ├── app/                         # App Router & API Endpoints
│       │   ├── api/                     # REST API terindeks (worklogs, rab, kpi, settings, dll)
│       │   ├── layout.tsx               # Root layout & styling global
│       │   └── page.tsx                 # Entry point & state management utama
│       ├── components/
│       │   ├── layout/                  # Header & Sidebar navigasi
│       │   ├── modals/                  # Modal otorisasi PIN, Invoice PDF generator, Role login
│       │   ├── ui/                      # Komponen atomik (Toast, ConfirmDialog)
│       │   └── views/                   # 12 Tampilan modul aplikasi (Views)
│       ├── config/
│       │   └── tenant.config.ts         # Konfigurasi default data perusahaan (SCI Tech)
│       ├── lib/
│       │   ├── apiClient.ts             # REST Client HTTP wrapper
│       │   ├── db.ts                    # PostgreSQL connection pool & parameterized query
│       │   ├── invoiceGenerator.ts      # Generator cetak faktur komersial PDF
│       │   ├── mockData.ts              # Dataset inisial awal sistem
│       │   ├── pdfGenerator.ts          # Utilitas pencetakan RAB formal PDF
│       │   └── storage.ts               # LocalStorage failover & data state offline
│       ├── scripts/
│       │   └── schema.sql               # Skema lengkap tabel & indeks PostgreSQL
│       └── types/
│           └── index.ts                 # Definisi tipe data TypeScript (Single Source of Truth)
├── PRD.md                               # Product Requirements Document
├── SRS.md                               # Software Requirements Specification
├── Tech Stack.md                        # Panduan arsitektur teknologi
└── LAPORAN_TESTING_DEBUGGING_SISTEM.md  # Laporan hasil audit performa, bandwidth, & keamanan
```

---

## 🛠 Panduan Instalasi & Menjalankan

### Prasyarat
- **Node.js:** Versi 18.18 atau lebih baru (Disarankan Node.js 20 LTS).
- **PostgreSQL (Opsional):** Versi 14+ (Jika tidak ada, sistem otomatis berjalan pada mode *High-Speed Local Storage*).

### Langkah-langkah
1. **Masuk ke folder Sistem:**
   ```bash
   cd Sistem
   ```

2. **Pasang Dependensi:**
   ```bash
   npm install
   ```

3. **Atur Variabel Lingkungan:**
   Salin `.env.example` menjadi `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   *Sesuaikan `DATABASE_URL` jika menggunakan PostgreSQL lokal.*

4. **Jalankan Server Development:**
   ```bash
   npm run dev
   ```
   Buka peramban di [http://localhost:3000](http://localhost:3000).

5. **Kompilasi Versi Produksi (Production Build):**
   ```bash
   npm run build
   npm run start
   ```

---

## 🔒 Skema Keamanan & Akses Role

| Peran (*Role*) | Akses Menu | Kredensial Autentikasi |
| :--- | :--- | :--- |
| **User Reguler / Staf** | Dashboard, Worklog, Monthly Plan | PIN 6-digit personal per staf |
| **Keuangan (Finance Admin)** | Dashboard Kas, Buku Transaksi, RAB Proyek, Invoice, Pengaturan Rekening | Kata Sandi Finansial (Default: `keuangan123`) |
| **Manajemen / CEO Admin** | Manajemen Anggota, Evaluasi KPI, Informasi Siaran, Identitas Perusahaan | Master Password CEO (Default: `admin123`) |

---

## 🧪 Skrip Pengujian & Pemeliharaan

- **Pengecekan Tipe TypeScript:**
  ```bash
  npx tsc --noEmit
  ```
- **Linting Kode:**
  ```bash
  npm run lint
  ```
- **Audit Skema Database:**
  Lihat berkas [**`src/scripts/schema.sql`**](file:///d:/Bisnis/SciTech/Web%20Manajemen%20SCI/Sistem/src/scripts/schema.sql) untuk skema tabel, *foreign keys*, dan indeks multi-tenant.

---
*Dikelola oleh Tim Pengembang PT Sentra Cipta Inovasi (SCI Tech).*
