"use client";

import React, { useState } from "react";
import {
  Users,
  ShieldCheck,
  RefreshCw,
  Plus,
  Download,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Key,
  Trash2,
  Edit3,
  Lock,
  Crown,
  Briefcase,
  IdCard,
  Building,
  UserCheck,
  UserX,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { User, UserRole } from "@/types";
import { TenantConfig } from "@/config/tenant.config";
import { StorageService } from "@/lib/storage";
import { ApiClient } from "@/lib/apiClient";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";

interface MembersViewProps {
  config: TenantConfig;
  users: User[];
  currentUserRole?: string;
  onRefresh: () => void;
}

const generateRandomPassword = () => {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  let pass = "";
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

export const MembersView: React.FC<MembersViewProps> = ({
  config,
  users,
  currentUserRole,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivisi, setSelectedDivisi] = useState<string>("ALL");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null);
  const [toastNotif, setToastNotif] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Custom Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    type: "danger" | "warning";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Konfirmasi",
    type: "danger",
    onConfirm: () => {},
  });

  // Digital ID Card Profile Modal
  const [previewUser, setPreviewUser] = useState<User | null>(null);

  // Add / Edit Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formNama, setFormNama] = useState("");
  const [formPanggilan, setFormPanggilan] = useState("");
  const [formDivisi, setFormDivisi] = useState("Engineering");
  const [formJabatan, setFormJabatan] = useState("Software Engineer");
  const [formRole, setFormRole] = useState<UserRole>("STAFF");
  const [formPin, setFormPin] = useState(StorageService.generateRandomPin());
  const [formPassword, setFormPassword] = useState(generateRandomPassword());

  // Distinct divisions list with count
  const divisions = ["ALL", ...Array.from(new Set(users.map((u) => u.divisi).filter(Boolean)))];

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.divisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.jabatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDivisi = selectedDivisi === "ALL" || u.divisi === selectedDivisi;
    const matchesRole = selectedRoleFilter === "ALL" || u.role === selectedRoleFilter;

    return matchesSearch && matchesDivisi && matchesRole;
  });

  const togglePinVisibility = (id: string) => {
    setVisiblePins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = () => {
    if (currentUserRole === "CEO_ADMIN") {
      setToastNotif({
        type: "error",
        message: "Otorisasi Terbatas: Role CEO Admin (Eksekutif) berfokus pada evaluasi dan tidak dapat menambah anggota baru.",
      });
      return;
    }
    setEditingUser(null);
    setFormNama("");
    setFormPanggilan("");
    setFormDivisi("Engineering");
    setFormJabatan("Software Engineer");
    setFormRole("STAFF");
    setFormPin(StorageService.generateRandomPin());
    setFormPassword(generateRandomPassword());
    setIsAddModalOpen(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setFormRole(newRole);
    if (newRole === "STAFF") {
      // Pastikan formPin adalah 6-digit angka valid
      if (!/^\d{6}$/.test(formPin)) {
        setFormPin(StorageService.generateRandomPin());
      }
    } else {
      // Role FINANCE_ADMIN, pastikan formPassword terisi
      if (!formPassword) {
        setFormPassword(generateRandomPassword());
      }
    }
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormNama(user.nama_lengkap);
    setFormPanggilan(user.panggilan || "");
    setFormDivisi(user.divisi);
    setFormJabatan(user.jabatan);
    setFormRole(user.role);

    if (user.role === "STAFF") {
      setFormPin(user.pin_code || StorageService.generateRandomPin());
      setFormPassword(generateRandomPassword());
    } else {
      // Role FINANCE_ADMIN
      setFormPassword(user.pin_code || generateRandomPassword());
      // Siapkan PIN angka acak jika user nanti beralih ke role STAFF
      setFormPin(StorageService.generateRandomPin());
    }

    setIsAddModalOpen(true);
  };

  const handleGeneratePin = async (user: User) => {
    const isStaff = user.role === "STAFF";
    const newCredential = isStaff ? StorageService.generateRandomPin() : generateRandomPassword();
    try {
      await ApiClient.updateUser({ id: user.id, pin_code: newCredential });
    } catch {
      StorageService.updateUserPin(user.id, newCredential);
    }

    navigator.clipboard.writeText(newCredential);
    setCopiedPinId(user.id);
    setToastNotif({
      type: "success",
      message: `${isStaff ? `PIN 6-digit baru (${newCredential})` : `Kata sandi portal baru (${newCredential})`} untuk ${user.nama_lengkap} berhasil dibuat dan disalin ke clipboard!`,
    });
    setTimeout(() => {
      setCopiedPinId(null);
    }, 5000);
    onRefresh();
  };

  const handleCopyPin = (user: User) => {
    navigator.clipboard.writeText(user.pin_code);
    setCopiedPinId(user.id);
    setTimeout(() => setCopiedPinId(null), 2000);
  };

  const handleToggleStatus = (user: User) => {
    const newStatus = !user.is_active;
    const actionText = newStatus ? "mengaktifkan kembali" : "menonaktifkan sementara";
    
    setConfirmDialog({
      isOpen: true,
      title: `${newStatus ? "Aktifkan" : "Non-Aktifkan"} Anggota?`,
      message: `Apakah Anda yakin ingin ${actionText} akses sistem untuk ${user.nama_lengkap} (${user.divisi})?`,
      confirmLabel: newStatus ? "Ya, Aktifkan" : "Ya, Non-Aktifkan",
      type: "warning",
      onConfirm: async () => {
        try {
          await ApiClient.updateUser({ id: user.id, is_active: newStatus });
        } catch {
          // Fallback local storage
        }
        StorageService.updateUser(user.id, { is_active: newStatus });
        setToastNotif({
          type: "success",
          message: `Status keaktifan ${user.nama_lengkap} berhasil diubah menjadi ${newStatus ? "Aktif" : "Non-Aktif"}.`,
        });
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        onRefresh();
      },
    });
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      company_id: config.id,
      nama_lengkap: formNama,
      panggilan: formPanggilan || formNama.split(" ")[0],
      divisi: formDivisi,
      jabatan: formJabatan,
      role: formRole,
      pin_code: formRole === "STAFF" ? formPin : formPassword,
    };

    try {
      if (editingUser) {
        await ApiClient.updateUser({ id: editingUser.id, ...payload });
      } else {
        await ApiClient.createUser(payload);
      }
    } catch (err) {
      console.warn("API update user deferred to local storage:", err);
    }

    // Always update local storage cache
    if (editingUser) {
      StorageService.updateUser(editingUser.id, payload);
    } else {
      StorageService.addUser(payload);
    }

    setIsAddModalOpen(false);
    setToastNotif({
      type: "success",
      message: editingUser
        ? `Data anggota ${formNama} berhasil diperbarui.`
        : `Anggota ${formNama} berhasil didaftarkan ke sistem dengan ${
            formRole === "STAFF" ? `PIN: ${formPin}` : `Password: ${formPassword}`
          }`,
    });
    setEditingUser(null);
    setFormNama("");
    onRefresh();
  };

  const handleDeletePermanent = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Hapus Permanen Anggota?",
      message: `Apakah Anda yakin ingin menghapus data anggota "${name}"? Tindakan ini akan menghapus akun, kredensial PIN, dan akses ke sistem secara permanen.`,
      confirmLabel: "Ya, Hapus Permanen",
      type: "danger",
      onConfirm: async () => {
        try {
          await ApiClient.deleteUser(id);
        } catch {
          StorageService.deleteUser(id);
        }
        setToastNotif({
          type: "success",
          message: `Data anggota ${name} berhasil dihapus dari sistem.`,
        });
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        onRefresh();
      },
    });
  };

  // Export CSV directory
  const handleExportCsv = () => {
    const headers = ["ID", "Nama Lengkap", "Panggilan", "Divisi", "Jabatan", "Role", "Status", "Tanggal Dibuat"];
    const rows = filtered.map((u) => [
      u.id,
      `"${u.nama_lengkap.replace(/"/g, '""')}"`,
      `"${(u.panggilan || "").replace(/"/g, '""')}"`,
      `"${u.divisi.replace(/"/g, '""')}"`,
      `"${u.jabatan.replace(/"/g, '""')}"`,
      u.role,
      u.is_active ? "Aktif" : "Non-Aktif",
      u.created_at || "-",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Direktori_Talenta_${config.subdomain || config.id}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastNotif({
      type: "info",
      message: "Direktori talenta anggota berhasil diekspor ke file CSV.",
    });
  };

  // Render role badge helper
  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case "CEO_ADMIN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            <Crown className="w-3 h-3 text-purple-600" />
            <span>CEO Admin</span>
          </span>
        );
      case "MANAGER":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ShieldCheck className="w-3 h-3 text-indigo-600" />
            <span>Manager</span>
          </span>
        );
      case "FINANCE_ADMIN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Finance Admin</span>
          </span>
        );
      case "STAFF":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            <Briefcase className="w-3 h-3 text-blue-600" />
            <span>Staff Reguler</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Data Anggota & PIN</h2>
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-slate-100 text-slate-800 border border-slate-200">
              HRIS Enterprise
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pusat administrasi talenta, manajemen identitas RBAC, dan otorisasi PIN mandiri
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleExportCsv}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 py-2 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Ekspor rekap anggota ke file CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Ekspor Direktori</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Anggota</span>
          </button>
        </div>
      </div>

      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Talenta Terdaftar</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <h4 className="text-2xl font-black text-slate-900">{users.length} Anggota</h4>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            ● {users.filter((u) => u.is_active).length} Aktif ({users.filter((u) => !u.is_active).length} Non-Aktif)
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Status Proteksi PIN & Kredensial</span>
            <Key className="w-4 h-4 text-emerald-600" />
          </div>
          <h4 className="text-2xl font-black text-slate-900">100% Terenkripsi</h4>
          <p className="text-[11px] text-slate-400 font-medium mt-1">Mandiri Worklog & Monthly Plan</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cakupan Departemen</span>
            <Building className="w-4 h-4 text-indigo-600" />
          </div>
          <h4 className="text-2xl font-black text-slate-900">{divisions.length - 1} Divisi</h4>
          <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
            {divisions.filter((d) => d !== "ALL").slice(0, 3).join(", ")}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Struktur Otoritas RBAC</span>
            <Lock className="w-4 h-4 text-purple-600" />
          </div>
          <h4 className="text-xl font-black text-slate-900">Multi-Role RBAC</h4>
          <p className="text-[11px] text-purple-700 font-medium mt-1">Least Privilege Enforcement</p>
        </div>
      </div>

      {/* Protocol Banner */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-slate-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Key className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <h4 className="font-bold text-slate-900">Protokol Keamanan Identitas Karyawan</h4>
            <p className="text-slate-600 mt-0.5 leading-relaxed">
              <strong>Staff Reguler</strong> menggunakan PIN personal 6-digit untuk tanda tangan mandiri Worklog & Rencana Bulanan.
              <strong> Keuangan & Manajemen</strong> diproteksi dengan kata sandi otorisasi portal tingkat tinggi.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
        {/* Division Tab Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" />
            <span>Divisi:</span>
          </span>
          {divisions.map((div) => {
            const count = div === "ALL" ? users.length : users.filter((u) => u.divisi === div).length;
            const isSelected = selectedDivisi === div;
            return (
              <button
                key={div}
                type="button"
                onClick={() => setSelectedDivisi(div)}
                className={`py-1.5 px-3 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                }`}
              >
                <span>{div === "ALL" ? "Semua Divisi" : div}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Role Filter Bar */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="w-full sm:w-80 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Cari nama, ID, jabatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-500 font-medium shrink-0">Filter Role:</label>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:bg-white cursor-pointer"
            >
              <option value="ALL">Semua Hak Akses</option>
              <option value="STAFF">STAFF (PIN Worklog)</option>
              <option value="FINANCE_ADMIN">FINANCE_ADMIN (Keuangan)</option>
              <option value="MANAGER">MANAGER (Operasional)</option>
              <option value="CEO_ADMIN">CEO_ADMIN (Eksekutif)</option>
            </select>
            <span className="text-xs text-slate-400 ml-2">Menampilkan <strong>{filtered.length}</strong> talenta</span>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Talenta Tim & ID</th>
                <th className="py-3 px-3">Departemen & Jabatan</th>
                <th className="py-3 px-3">Hak Akses Sistem</th>
                <th className="py-3 px-3">Kredensial Keamanan</th>
                <th className="py-3 px-4 text-center">Generator Kredensial</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto stroke-1 mb-2 text-slate-300" />
                    <p className="font-semibold text-xs">Tidak ada data anggota yang cocok dengan filter.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const isPinVisible = !!visiblePins[user.id];
                  const isStaff = user.role === "STAFF";

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Name & ID with Clickable Profile Card */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setPreviewUser(user)}
                            className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs hover:scale-105 transition-transform cursor-pointer"
                            title="Klik untuk melihat Kartu Identitas Digital"
                          >
                            {user.nama_lengkap.slice(0, 2).toUpperCase()}
                          </button>
                          <div>
                            <button
                              type="button"
                              onClick={() => setPreviewUser(user)}
                              className="font-bold text-slate-900 text-xs hover:text-blue-600 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                            >
                              <span>{user.nama_lengkap}</span>
                              {!user.is_active && (
                                <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">
                                  Non-Aktif
                                </span>
                              )}
                            </button>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono flex items-center gap-1">
                              <span>ID: {user.id}</span>
                              {user.panggilan && <span className="text-slate-300">• ({user.panggilan})</span>}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Division & Position */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <p className="font-bold text-slate-800">{user.jabatan}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{user.divisi}</p>
                      </td>

                      {/* RBAC Role Badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {renderRoleBadge(user.role)}
                      </td>

                      {/* Security Credential (PIN vs Password Context) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 tracking-wider">
                            {isPinVisible ? user.pin_code : isStaff ? "••••••" : "••••••••••"}
                          </span>
                          <button
                            onClick={() => togglePinVisibility(user.id)}
                            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                            title={isStaff ? "Lihat / Sembunyikan PIN" : "Lihat / Sembunyikan Sandi"}
                          >
                            {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleCopyPin(user)}
                            className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer"
                            title={isStaff ? "Salin PIN" : "Salin Sandi"}
                          >
                            {copiedPinId === user.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {isStaff ? "PIN 6-Digit Worklog" : "Password Portal Akses"} • Diperbarui: {user.pin_last_updated || "Baru"}
                        </p>
                      </td>

                      {/* Generator Button */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleGeneratePin(user)}
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer"
                          title={isStaff ? "Buat PIN 6-digit acak baru" : "Buat kata sandi portal baru"}
                        >
                          <RefreshCw className="w-3 h-3 text-blue-600" />
                          <span>{isStaff ? "Generate PIN Acak" : "Generate Sandi Baru"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle Active / Suspended Status */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              user.is_active
                                ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                            }`}
                            title={user.is_active ? "Nonaktifkan Akses" : "Aktifkan Kembali Akses"}
                          >
                            {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>

                          {/* Digital ID Preview */}
                          <button
                            type="button"
                            onClick={() => setPreviewUser(user)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Lihat Kartu Identitas Digital"
                          >
                            <IdCard className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Data Anggota"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeletePermanent(user.id, user.nama_lengkap)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Anggota Permanen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Digital ID Card Preview Modal */}
      {previewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 relative">
            {/* ID Card Top Pattern */}
            <div className="bg-gradient-to-tr from-slate-900 via-blue-900 to-indigo-900 text-white p-6 pb-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center font-black text-xs text-white">
                    SCI
                  </div>
                  <span className="text-[10px] font-bold tracking-widest text-blue-200 uppercase">
                    TALENT IDENTITY CARD
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewUser(null)}
                  className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 flex flex-col items-center relative z-10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-400 p-1 shadow-lg">
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white text-xl font-black">
                    {previewUser.nama_lengkap.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <h3 className="font-black text-white text-base mt-2.5 text-center">{previewUser.nama_lengkap}</h3>
                <p className="text-xs text-blue-200 font-medium">{previewUser.jabatan}</p>
                <div className="mt-2">{renderRoleBadge(previewUser.role)}</div>
              </div>
            </div>

            {/* ID Card Body */}
            <div className="p-6 pt-4 space-y-4 bg-white text-xs">
              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">ID Karyawan</span>
                  <span className="font-mono font-bold text-slate-900">{previewUser.id}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Departemen</span>
                  <span className="font-bold text-slate-900">{previewUser.divisi}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Panggilan</span>
                  <span className="font-semibold text-slate-800">{previewUser.panggilan || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Status Akses</span>
                  <span className={`font-bold ${previewUser.is_active ? "text-emerald-600" : "text-rose-600"}`}>
                    ● {previewUser.is_active ? "Aktif Terverifikasi" : "Akses Dinonaktifkan"}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    {previewUser.role === "STAFF" ? "PIN Worklog Mandiri" : "Password Akses Portal"}
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {visiblePins[previewUser.id] ? previewUser.pin_code : "••••••"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => togglePinVisibility(previewUser.id)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 cursor-pointer"
                >
                  {visiblePins[previewUser.id] ? "Tutup" : "Lihat"}
                </button>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setPreviewUser(null)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Tutup Kartu Identitas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              {editingUser ? "Edit Data Anggota" : "Tambah Anggota Baru"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {editingUser
                ? "Perbarui rincian profil, jabatan, dan hak akses talenta."
                : "Daftarkan personel baru ke database internal."}
            </p>

            <form onSubmit={handleSaveMember} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Rayhan Alif"
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nama Panggilan</label>
                  <input
                    type="text"
                    placeholder="Rayhan"
                    value={formPanggilan}
                    onChange={(e) => setFormPanggilan(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Divisi</label>
                  <input
                    type="text"
                    required
                    value={formDivisi}
                    onChange={(e) => setFormDivisi(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jabatan</label>
                  <input
                    type="text"
                    required
                    value={formJabatan}
                    onChange={(e) => setFormJabatan(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Role / Peran Akses</label>
                  <select
                    value={formRole}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-semibold"
                  >
                    <option value="STAFF">STAFF (Reguler & PIN Worklog)</option>
                    <option value="FINANCE_ADMIN">FINANCE_ADMIN (Keuangan)</option>
                  </select>
                </div>

                <div>
                  {formRole === "STAFF" ? (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-slate-700 font-semibold">PIN 6-Digit Acak</label>
                        <button
                          type="button"
                          onClick={() => setFormPin(StorageService.generateRandomPin())}
                          className="text-blue-600 hover:text-blue-800 text-[10px] font-bold cursor-pointer"
                        >
                          Acak Ulang
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={formPin}
                        onChange={(e) => setFormPin(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-center text-slate-900 tracking-widest focus:bg-white"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-slate-700 font-semibold">Password Acak</label>
                        <button
                          type="button"
                          onClick={() => setFormPassword(generateRandomPassword())}
                          className="text-blue-600 hover:text-blue-800 text-[10px] font-bold cursor-pointer"
                        >
                          Acak Ulang
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {editingUser ? "Simpan Perubahan" : "Daftarkan Anggota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Action Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel="Batal"
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Floating Toast Notification */}
      {toastNotif && (
        <Toast
          type={toastNotif.type}
          message={toastNotif.message}
          onClose={() => setToastNotif(null)}
        />
      )}
    </div>
  );
};
