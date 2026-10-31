export type UserRole = "STAFF" | "MANAGER" | "FINANCE_ADMIN" | "CEO_ADMIN";
export type PortalType = "REGULER" | "KEUANGAN" | "PROYEK" | "MANAJEMEN";

export interface User {
  id: string;
  company_id: string;
  nama_lengkap: string;
  panggilan: string;
  role: UserRole;
  divisi: string;
  jabatan: string;
  pin_code: string; // 6-digit PIN
  avatar?: string;
  is_active: boolean;
  pin_last_updated?: string;
  created_at: string;
}

export interface FinanceSettings {
  id: string;
  company_id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  qr_image_url: string;
  show_cash_to_public: boolean;
  finance_password_hash: string;
  default_ppn_percent?: number;
  invoice_prefix?: string;
  default_payment_terms_days?: number;
  default_invoice_notes?: string;
  minimum_cash_alert?: number;
  updated_at: string;
}

export type WorklogCategory = "Development" | "Design" | "QA & Testing" | "Client Meeting" | "Rutin" | "Support" | "Project";

export interface MonthlyPlan {
  id: string;
  company_id: string;
  user_id: string;
  bulan: number; // 1-12
  tahun: number;
  rencana_pekerjaan: string;
  kategori: WorklogCategory;
  prioritas: "Tinggi" | "Sedang" | "Rendah";
  deadline: string; // YYYY-MM-DD
  target_output: string;
  is_completed: boolean;
  total_worklogs?: number;
  total_jam_tercatat?: number;
  user_nama?: string;
  user_divisi?: string;
  created_at: string;
}

export interface Worklog {
  id: string;
  company_id: string;
  user_id: string;
  plan_id?: string;
  tanggal: string; // YYYY-MM-DD
  jam_durasi: number; // in hours, e.g. 4.5
  pekerjaan: string;
  kategori: WorklogCategory;
  dokumentasi_url?: string;
  status: boolean; // completed or in progress
  pin_verified: boolean;
  plan_title?: string;
  user_nama?: string;
  user_panggilan?: string;
  user_divisi?: string;
  created_at: string;
}

export type TransactionType = "PEMASUKAN" | "PENGELUARAN";
export type TransactionCategory = "SaaS Subscription" | "Infrastruktur" | "Professional Service" | "SDM & Operasional" | "Project" | "Marketing" | "Lainnya";

export interface Transaction {
  id: string;
  company_id: string;
  tipe: TransactionType;
  nama_item: string;
  deskripsi: string;
  tanggal: string;
  kegunaan: TransactionCategory;
  jumlah: number;
  harga_pcs: number;
  total_harga: number;
  metode: string; // e.g., 'Transfer Bank (BCA)', 'Corporate Card', 'QRIS'
  status_verifikasi: "Terverifikasi" | "Menunggu" | "Ditolak";
  created_at: string;
}

export type ProjectStage = "Perancangan" | "Pengadaan Alat" | "Development" | "Testing" | "Selesai";

export interface Project {
  id: string;
  company_id: string;
  rab_id?: string;
  rab_nomor?: string;
  nama_project: string;
  client: string;
  pic_teknisi: string;
  team_members?: string[];
  deadline: string;
  progress_persen: number; // 0 - 100
  tahapan_saat_ini: ProjectStage;
  catatan_teknis: string;
  divisi_tag: string; // e.g. 'Cloud Infra', 'Fintech API', 'IoT Analytics'
  sprint_info?: string;
  created_at: string;
}

export type RabItemType = "Primary" | "Secondary" | "Tertiary";

export interface RabItem {
  id: string;
  rab_id: string;
  tipe_rincian: RabItemType; // Primary (Hardware/Material), Secondary (Lisensi/Logistik), Tertiary (Jasa/Tenaga Ahli)
  nama_item: string;
  spesifikasi_teknis: string;
  jumlah: number;
  satuan: string; // 'Unit', 'Set', 'Lot', 'Bulan/Man', 'Paket Uji'
  harga_pcs: number;
  total_harga: number;
}

export interface RabProject {
  id: string;
  company_id: string;
  nomor_rab: string;
  nama_project: string;
  nama_client: string;
  tanggal: string;
  masa_berlaku: string;
  status: "Draft" | "Approved" | "Converted" | "Sent";
  pic_name: string;
  pic_pin_verified: boolean;
  include_ppn: boolean;
  ppn_percent: number; // e.g. 11
  items?: RabItem[];
  total_items?: number;
  subtotal_biaya?: number;
  linked_project_id?: string;
  linked_project_nama?: string;
  created_at: string;
}

export interface UserKpiStats {
  jam_kerja_bulan_ini: number;
  jumlah_worklog: number;
  rencana_selesai: number;
  total_rencana: number;
}

export interface KpiEvaluation {
  id: string;
  company_id: string;
  user_id: string;
  bulan: number;
  tahun: number;
  indikator_kpi: string;
  target: string;
  realisasi: string;
  skor: number; // 1-100 or 1-5
  skor_kategori: "Exemplary" | "High Performer" | "Average" | "Needs Improvement";
  bobot_persen: number;
  nilai_akhir: number;
  is_published: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  company_id: string;
  judul: string;
  isi_pengumuman: string;
  prioritas: "Penting" | "Info";
  tanggal_terbit: string;
  is_published: boolean;
  created_at: string;
}

export interface ActiveAuthSession {
  portal: PortalType;
  authenticated: boolean;
  userId?: string;
  userName?: string;
  userRole?: UserRole;
  role?: UserRole;
  loginTime: string;
}
