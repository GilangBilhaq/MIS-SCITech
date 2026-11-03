import {
  User,
  Worklog,
  MonthlyPlan,
  Transaction,
  Project,
  RabProject,
  RabItem,
  KpiEvaluation,
  Announcement,
  FinanceSettings,
} from "@/types";
import { defaultTenantConfig, TenantConfig } from "@/config/tenant.config";
import {
  initialUsers,
  initialFinanceSettings,
  initialAnnouncements,
  initialProjects,
  initialKpis,
  initialWorklogs,
  initialMonthlyPlans,
  initialTransactions,
  initialRab,
} from "./mockData";

const STORAGE_KEYS = {
  TENANT: "sci_tech_tenant_config",
  USERS: "sci_tech_users",
  FINANCE_SETTINGS: "sci_tech_finance_settings",
  ANNOUNCEMENTS: "sci_tech_announcements",
  PROJECTS: "sci_tech_projects",
  KPIS: "sci_tech_kpis",
  WORKLOGS: "sci_tech_worklogs",
  MONTHLY_PLANS: "sci_tech_monthly_plans",
  TRANSACTIONS: "sci_tech_transactions",
  RAB: "sci_tech_rab",
  AUTH: "sci_tech_auth_session",
};

export class StorageService {
  private static isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  // Generic Get & Set with fallback
  private static getItem<T>(key: string, defaultValue: T): T {
    if (!this.isBrowser()) return defaultValue;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Storage error:", e);
    }
  }

  // --- Tenant Config (White-Label) ---
  public static getTenantConfig(): TenantConfig {
    return this.getItem<TenantConfig>(STORAGE_KEYS.TENANT, defaultTenantConfig);
  }

  public static updateTenantConfig(updates: Partial<TenantConfig>): TenantConfig {
    const current = this.getTenantConfig();
    const updated = { ...current, ...updates };
    this.setItem(STORAGE_KEYS.TENANT, updated);
    return updated;
  }

  // --- Users & PIN Management ---
  public static getUsers(): User[] {
    const raw = this.getItem<User[]>(STORAGE_KEYS.USERS, initialUsers);
    // Pastikan tidak ada duplikasi ID yang lolos ke state
    return Array.from(new Map(raw.map((u) => [u.id, u])).values());
  }

  public static getUserById(id: string): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  public static verifyPin(userId: string, pin: string): { success: boolean; message: string; user?: User } {
    if (!pin || pin.length !== 6) {
      return { success: false, message: "PIN harus terdiri dari 6 digit angka." };
    }
    const user = this.getUserById(userId);
    if (!user) {
      return { success: false, message: "Anggota tim tidak ditemukan." };
    }
    if (user.pin_code !== pin) {
      return { success: false, message: "PIN keamanan salah. Verifikasi gagal." };
    }
    return { success: true, message: "Verifikasi PIN berhasil.", user };
  }

  public static verifyAnyMemberPin(pin: string): { success: boolean; message: string; user?: User } {
    if (!pin || pin.length !== 6) {
      return { success: false, message: "PIN harus 6 digit angka." };
    }
    const user = this.getUsers().find((u) => u.pin_code === pin && u.is_active);
    if (!user) {
      return { success: false, message: "PIN tidak cocok dengan anggota aktif manapun." };
    }
    return { success: true, message: "Otoritas PIN diverifikasi.", user };
  }

  public static generateRandomPin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  public static updateUserPin(userId: string, newPin?: string): { user: User; newPin: string } {
    const users = this.getUsers();
    const pin = newPin || this.generateRandomPin();
    const now = new Date().toISOString().split("T")[0];

    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        pin_code: pin,
        pin_last_updated: now,
      };
      this.setItem(STORAGE_KEYS.USERS, users);
      return { user: users[idx], newPin: pin };
    }
    const fallbackUser: User = {
      id: userId,
      company_id: "sci-tech-01",
      nama_lengkap: "Anggota",
      panggilan: "Anggota",
      role: "STAFF",
      divisi: "Engineering",
      jabatan: "Staff",
      pin_code: pin,
      is_active: true,
      pin_last_updated: now,
      created_at: new Date().toISOString(),
    };
    users.push(fallbackUser);
    this.setItem(STORAGE_KEYS.USERS, users);
    return { user: fallbackUser, newPin: pin };
  }

  public static setUsers(users: User[]): void {
    const uniqueUsers = Array.from(new Map(users.map((u) => [u.id, u])).values());
    this.setItem(STORAGE_KEYS.USERS, uniqueUsers);
  }

  public static addUser(data: Omit<User, "id" | "created_at" | "is_active">): User {
    const users = this.getUsers();
    // Cari index numerik tertinggi agar tidak terjadi tabrakan ID
    const maxNum = users.reduce((max, u) => {
      const match = u.id && u.id.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 0;
      return Math.max(max, num);
    }, 0);
    let counter = maxNum + 1;
    let newId = `USR-${String(counter).padStart(3, "0")}`;
    while (users.some((u) => u.id === newId)) {
      counter++;
      newId = `USR-${String(counter).padStart(3, "0")}`;
    }
    const newUser: User = {
      ...data,
      id: newId,
      is_active: true,
      created_at: new Date().toISOString(),
      pin_last_updated: new Date().toISOString().split("T")[0],
    };
    users.push(newUser);
    this.setItem(STORAGE_KEYS.USERS, users);
    return newUser;
  }

  public static updateUser(id: string, updates: Partial<User>): User {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      this.setItem(STORAGE_KEYS.USERS, users);
      return users[idx];
    }
    // If user was created on server or missing in local cache, gracefully upsert
    const fallbackUser: User = {
      id,
      company_id: "sci-tech-01",
      nama_lengkap: updates.nama_lengkap || "Anggota",
      panggilan: updates.panggilan || "Anggota",
      role: updates.role || "STAFF",
      divisi: updates.divisi || "Engineering",
      jabatan: updates.jabatan || "Staff",
      pin_code: updates.pin_code || "123456",
      is_active: updates.is_active ?? true,
      created_at: new Date().toISOString(),
      ...updates,
    };
    users.push(fallbackUser);
    this.setItem(STORAGE_KEYS.USERS, users);
    return fallbackUser;
  }

  public static deleteUser(id: string): void {
    const users = this.getUsers().filter((u) => u.id !== id);
    this.setItem(STORAGE_KEYS.USERS, users);
  }

  // --- Worklogs ---
  public static getWorklogs(): Worklog[] {
    return this.getItem<Worklog[]>(STORAGE_KEYS.WORKLOGS, initialWorklogs);
  }

  public static setWorklogs(worklogs: Worklog[]): void {
    this.setItem(STORAGE_KEYS.WORKLOGS, worklogs);
  }

  public static addWorklog(data: Omit<Worklog, "id" | "created_at" | "pin_verified">): Worklog {
    const list = this.getWorklogs();
    const newWorklog: Worklog = {
      ...data,
      id: `WL-${Date.now().toString().slice(-4)}`,
      pin_verified: true,
      created_at: new Date().toISOString(),
    };
    list.unshift(newWorklog);
    this.setItem(STORAGE_KEYS.WORKLOGS, list);
    return newWorklog;
  }

  public static updateWorklog(id: string, updates: Partial<Worklog>): Worklog {
    const list = this.getWorklogs();
    const idx = list.findIndex((w) => w.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      this.setItem(STORAGE_KEYS.WORKLOGS, list);
      return list[idx];
    }
    throw new Error("Worklog not found");
  }

  public static deleteWorklog(id: string): void {
    const list = this.getWorklogs().filter((w) => w.id !== id);
    this.setItem(STORAGE_KEYS.WORKLOGS, list);
  }

  // --- Monthly Plans ---
  public static getMonthlyPlans(): MonthlyPlan[] {
    return this.getItem<MonthlyPlan[]>(STORAGE_KEYS.MONTHLY_PLANS, initialMonthlyPlans);
  }

  public static setMonthlyPlans(plans: MonthlyPlan[]): void {
    this.setItem(STORAGE_KEYS.MONTHLY_PLANS, plans);
  }

  public static addMonthlyPlan(data: Omit<MonthlyPlan, "id" | "created_at">): MonthlyPlan {
    const list = this.getMonthlyPlans();
    const newPlan: MonthlyPlan = {
      ...data,
      id: `PLN-${Date.now().toString().slice(-4)}`,
      created_at: new Date().toISOString(),
    };
    list.unshift(newPlan);
    this.setItem(STORAGE_KEYS.MONTHLY_PLANS, list);
    return newPlan;
  }

  public static updateMonthlyPlan(id: string, updates: Partial<MonthlyPlan>): MonthlyPlan {
    const list = this.getMonthlyPlans();
    const idx = list.findIndex((p) => p.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      this.setItem(STORAGE_KEYS.MONTHLY_PLANS, list);
      return list[idx];
    }
    throw new Error("Plan not found");
  }

  public static deleteMonthlyPlan(id: string): void {
    const list = this.getMonthlyPlans().filter((p) => p.id !== id);
    this.setItem(STORAGE_KEYS.MONTHLY_PLANS, list);
  }

  // --- Finance & Transactions ---
  public static getFinanceSettings(): FinanceSettings {
    return this.getItem<FinanceSettings>(STORAGE_KEYS.FINANCE_SETTINGS, initialFinanceSettings);
  }

  public static updateFinanceSettings(updates: Partial<FinanceSettings>): FinanceSettings {
    const current = this.getFinanceSettings();
    const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
    this.setItem(STORAGE_KEYS.FINANCE_SETTINGS, updated);
    return updated;
  }

  public static getTransactions(): Transaction[] {
    return this.getItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, initialTransactions);
  }

  public static setTransactions(transactions: Transaction[]): void {
    this.setItem(STORAGE_KEYS.TRANSACTIONS, transactions);
  }

  public static addTransaction(data: Omit<Transaction, "id" | "created_at" | "total_harga">): Transaction {
    const list = this.getTransactions();
    const total_harga = data.jumlah * data.harga_pcs;
    const newTrx: Transaction = {
      ...data,
      id: `TRX-${Date.now().toString().slice(-4)}`,
      total_harga,
      created_at: new Date().toISOString(),
    };
    list.unshift(newTrx);
    this.setItem(STORAGE_KEYS.TRANSACTIONS, list);
    return newTrx;
  }

  public static deleteTransaction(id: string): void {
    const list = this.getTransactions().filter((t) => t.id !== id);
    this.setItem(STORAGE_KEYS.TRANSACTIONS, list);
  }

  public static updateTransaction(id: string, updates: Partial<Transaction>): Transaction {
    const list = this.getTransactions();
    const idx = list.findIndex((t) => t.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      if (updates.jumlah !== undefined || updates.harga_pcs !== undefined) {
        list[idx].total_harga = list[idx].jumlah * list[idx].harga_pcs;
      }
      this.setItem(STORAGE_KEYS.TRANSACTIONS, list);
      return list[idx];
    }
    throw new Error("Transaction not found");
  }

  public static getFinanceMetrics() {
    const trxs = this.getTransactions();
    let totalPemasukan = 0;
    let totalPengeluaran = 0;

    trxs.forEach((t) => {
      if (t.tipe === "PEMASUKAN") {
        totalPemasukan += t.total_harga;
      } else {
        totalPengeluaran += t.total_harga;
      }
    });

    // Murni dari kalkulasi transaksi real-time
    const saldoKas = totalPemasukan - totalPengeluaran;
    const rasioEfisiensi = totalPemasukan > 0 ? ((totalPemasukan - totalPengeluaran) / totalPemasukan) * 100 : 0;

    return {
      saldoKas,
      totalPemasukan,
      totalPengeluaran,
      arusKasBersih: totalPemasukan - totalPengeluaran,
      rasioEfisiensi: Math.max(0, Math.min(100, rasioEfisiensi)),
    };
  }

  // --- Projects ---
  public static getProjects(): Project[] {
    return this.getItem<Project[]>(STORAGE_KEYS.PROJECTS, initialProjects);
  }

  public static setProjects(projects: Project[]): void {
    this.setItem(STORAGE_KEYS.PROJECTS, projects);
  }

  public static addProject(data: Omit<Project, "id" | "created_at">): Project {
    const list = this.getProjects();
    const newProj: Project = {
      ...data,
      id: `PRJ-${Date.now().toString().slice(-4)}`,
      created_at: new Date().toISOString(),
    };
    list.unshift(newProj);
    this.setItem(STORAGE_KEYS.PROJECTS, list);
    return newProj;
  }

  public static updateProject(id: string, updates: Partial<Project>): Project {
    const list = this.getProjects();
    const idx = list.findIndex((p) => p.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      this.setItem(STORAGE_KEYS.PROJECTS, list);
      return list[idx];
    }
    throw new Error("Project not found");
  }

  public static deleteProject(id: string): void {
    const list = this.getProjects().filter((p) => p.id !== id);
    this.setItem(STORAGE_KEYS.PROJECTS, list);
  }

  // --- RAB Calculator ---
  public static getRab(): RabProject {
    return this.getItem<RabProject>(STORAGE_KEYS.RAB, initialRab);
  }

  public static updateRab(updates: Partial<RabProject>): RabProject {
    const current = this.getRab();
    const updated = { ...current, ...updates };
    this.setItem(STORAGE_KEYS.RAB, updated);
    return updated;
  }

  public static addRabItem(rabId: string, item: Omit<RabItem, "id" | "rab_id" | "total_harga">): RabProject {
    const rab = this.getRab();
    const total_harga = item.jumlah * item.harga_pcs;
    const newItem: RabItem = {
      ...item,
      id: `ITEM-${Date.now().toString().slice(-4)}`,
      rab_id: rabId,
      total_harga,
    };
    if (!rab.items) rab.items = [];
    rab.items.push(newItem);
    this.setItem(STORAGE_KEYS.RAB, rab);
    return rab;
  }

  public static deleteRabItem(itemId: string): RabProject {
    const rab = this.getRab();
    rab.items = (rab.items || []).filter((i) => i.id !== itemId);
    this.setItem(STORAGE_KEYS.RAB, rab);
    return rab;
  }

  public static calculateRabTotals(rab: RabProject) {
    let subtotalPrimary = 0;
    let subtotalSecondary = 0;
    let subtotalTertiary = 0;

    (rab.items || []).forEach((item) => {
      const total = item.jumlah * item.harga_pcs;
      if (item.tipe_rincian === "Primary") subtotalPrimary += total;
      else if (item.tipe_rincian === "Secondary") subtotalSecondary += total;
      else if (item.tipe_rincian === "Tertiary") subtotalTertiary += total;
    });

    const subtotalSebelumPpn = subtotalPrimary + subtotalSecondary + subtotalTertiary;
    const nilaiPpn = rab.include_ppn ? (subtotalSebelumPpn * (rab.ppn_percent || 11)) / 100 : 0;
    const totalAkhir = subtotalSebelumPpn + nilaiPpn;

    return {
      subtotalPrimary,
      subtotalSecondary,
      subtotalTertiary,
      subtotalSebelumPpn,
      nilaiPpn,
      totalAkhir,
    };
  }

  // --- KPI ---
  public static getKpis(): KpiEvaluation[] {
    return this.getItem<KpiEvaluation[]>(STORAGE_KEYS.KPIS, initialKpis);
  }

  public static setKpis(kpis: KpiEvaluation[]): void {
    this.setItem(STORAGE_KEYS.KPIS, kpis);
  }

  public static addKpi(data: Omit<KpiEvaluation, "id" | "created_at">): KpiEvaluation {
    const list = this.getKpis();
    const newKpi: KpiEvaluation = {
      ...data,
      id: `KPI-${Date.now().toString().slice(-4)}`,
      created_at: new Date().toISOString(),
    };
    list.unshift(newKpi);
    this.setItem(STORAGE_KEYS.KPIS, list);
    return newKpi;
  }

  public static updateKpi(id: string, updates: Partial<KpiEvaluation>): KpiEvaluation {
    const list = this.getKpis();
    const idx = list.findIndex((k) => k.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      this.setItem(STORAGE_KEYS.KPIS, list);
      return list[idx];
    }
    throw new Error("KPI not found");
  }

  public static deleteKpi(id: string): void {
    const list = this.getKpis().filter((k) => k.id !== id);
    this.setItem(STORAGE_KEYS.KPIS, list);
  }

  // --- Announcements ---
  public static getAnnouncements(): Announcement[] {
    return this.getItem<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, initialAnnouncements);
  }

  public static setAnnouncements(announcements: Announcement[]): void {
    this.setItem(STORAGE_KEYS.ANNOUNCEMENTS, announcements);
  }

  public static addAnnouncement(data: Omit<Announcement, "id" | "created_at">): Announcement {
    const list = this.getAnnouncements();
    const newAnn: Announcement = {
      ...data,
      id: `ANN-${Date.now().toString().slice(-4)}`,
      created_at: new Date().toISOString(),
    };
    list.unshift(newAnn);
    this.setItem(STORAGE_KEYS.ANNOUNCEMENTS, list);
    return newAnn;
  }

  public static updateAnnouncement(id: string, updates: Partial<Announcement>): Announcement {
    const list = this.getAnnouncements();
    const idx = list.findIndex((a) => a.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      this.setItem(STORAGE_KEYS.ANNOUNCEMENTS, list);
      return list[idx];
    }
    throw new Error("Announcement not found");
  }

  public static deleteAnnouncement(id: string): void {
    const list = this.getAnnouncements().filter((a) => a.id !== id);
    this.setItem(STORAGE_KEYS.ANNOUNCEMENTS, list);
  }

  // --- Reset All Operational Data ---
  public static resetAllData(): void {
    if (!this.isBrowser()) return;
    this.setItem(STORAGE_KEYS.WORKLOGS, []);
    this.setItem(STORAGE_KEYS.MONTHLY_PLANS, []);
    this.setItem(STORAGE_KEYS.KPIS, []);
    this.setItem(STORAGE_KEYS.PROJECTS, []);
    this.setItem(STORAGE_KEYS.TRANSACTIONS, []);
    this.setItem(STORAGE_KEYS.ANNOUNCEMENTS, []);
    this.setItem(STORAGE_KEYS.USERS, [
      {
        id: "USR-001",
        company_id: "sci-tech-01",
        nama_lengkap: "Farhan Pratama",
        panggilan: "Farhan",
        role: "CEO_ADMIN",
        divisi: "Executive Management",
        jabatan: "CEO & Managing Director",
        pin_code: "556677",
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "USR-002",
        company_id: "sci-tech-01",
        nama_lengkap: "Admin Keuangan",
        panggilan: "Finance",
        role: "FINANCE_ADMIN",
        divisi: "Finance & Accounting",
        jabatan: "Finance Lead",
        pin_code: "123456",
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ]);
  }
}
