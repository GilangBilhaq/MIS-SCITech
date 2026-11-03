"use client";

import React, { useState } from "react";
import {
  Clock,
  ShieldCheck,
  Plus,
  Download,
  Search,
  Trash2,
  Calendar,
  Layers,
  Edit3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  PieChart,
} from "lucide-react";
import { Worklog, User, WorklogCategory, MonthlyPlan } from "@/types";
import { TenantConfig } from "@/config/tenant.config";
import { StorageService } from "@/lib/storage";
import { ApiClient } from "@/lib/apiClient";
import { PinVerificationModal } from "@/components/modals/PinVerificationModal";
import { Toast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateIndo } from "@/lib/formatters";

interface WorklogViewProps {
  config: TenantConfig;
  worklogs: Worklog[];
  users: User[];
  plans?: MonthlyPlan[];
  onRefresh: () => void;
}

export const WorklogView: React.FC<WorklogViewProps> = ({
  config,
  worklogs,
  users,
  plans = [],
  onRefresh,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "7DAYS" | "MONTH">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // New Worklog Modal State
  const [editingWorklog, setEditingWorklog] = useState<Worklog | null>(null);
  const [deletingWorklog, setDeletingWorklog] = useState<Worklog | null>(null);
  const [successNotif, setSuccessNotif] = useState("");
  const [errorNotif, setErrorNotif] = useState("");
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  // New Worklog Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetUserForPin, setTargetUserForPin] = useState<User | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: "ADD" | "EDIT" | "DELETE";
    worklogId?: string;
    payload?: Partial<Worklog>;
    pin?: string;
  } | null>(null);

  // Form fields
  const [formUserId, setFormUserId] = useState(users[0]?.id || "");
  const [formPlanId, setFormPlanId] = useState<string>("NONE");
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [formJam, setFormJam] = useState("4.0");
  const [formKategori, setFormKategori] = useState<WorklogCategory>("Development");
  const [formPekerjaan, setFormPekerjaan] = useState("");

  const categories = ["Semua", "Development", "Design", "QA & Testing", "Client Meeting", "Rutin", "Support", "Project"];

  // Helper date filtering
  const todayStr = new Date().toISOString().split("T")[0];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().split("T")[0];
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Filtered list
  const filteredWorklogs = worklogs.filter((w) => {
    const matchUser = selectedUserId === "ALL" || w.user_id === selectedUserId;
    const matchCategory = selectedCategory === "Semua" || w.kategori === selectedCategory;
    const matchSearch =
      w.pekerjaan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      users.find((u) => u.id === w.user_id)?.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.plan_title && w.plan_title.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchDate = true;
    if (dateFilter === "TODAY") {
      matchDate = w.tanggal === todayStr;
    } else if (dateFilter === "7DAYS") {
      matchDate = w.tanggal >= sevenDaysAgo && w.tanggal <= todayStr;
    } else if (dateFilter === "MONTH") {
      matchDate = w.tanggal.startsWith(currentMonthStr);
    }

    return matchUser && matchCategory && matchSearch && matchDate;
  });

  // Reactive Metrics from filtered list
  const totalJamTerfilter = filteredWorklogs.reduce((acc, curr) => acc + Number(curr.jam_durasi), 0);
  const totalJamKeseluruhan = worklogs.reduce((acc, curr) => acc + Number(curr.jam_durasi), 0);
  const uniqueDatesCount = new Set(filteredWorklogs.map((w) => w.tanggal)).size || 1;
  const avgJamPerHari = (totalJamTerfilter / uniqueDatesCount).toFixed(1);

  // Pagination Slice
  const totalPages = Math.ceil(filteredWorklogs.length / itemsPerPage) || 1;
  const paginatedWorklogs = filteredWorklogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Category Distribution Calculation
  const categoryHoursMap: Record<string, number> = {};
  filteredWorklogs.forEach((w) => {
    categoryHoursMap[w.kategori] = (categoryHoursMap[w.kategori] || 0) + Number(w.jam_durasi);
  });

  const getUser = (id: string) => users.find((u) => u.id === id);

  // User-specific plans for dropdown
  const userPlans = plans.filter((p) => p.user_id === formUserId && !p.is_completed);

  const handleOpenAddForm = () => {
    setEditingWorklog(null);
    setFormUserId(users[0]?.id || "");
    setFormPlanId("NONE");
    setFormTanggal(new Date().toISOString().split("T")[0]);
    setFormJam("4.0");
    setFormKategori("Development");
    setFormPekerjaan("");
    setIsAddModalOpen(true);
  };

  const handleOpenEditForm = (w: Worklog) => {
    setEditingWorklog(w);
    setFormUserId(w.user_id);
    setFormPlanId(w.plan_id || "NONE");
    setFormTanggal(w.tanggal ? w.tanggal.split("T")[0] : "");
    setFormJam(String(w.jam_durasi));
    setFormKategori(w.kategori);
    setFormPekerjaan(w.pekerjaan);
    setIsAddModalOpen(true);
  };

  const handlePromptAddPin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = getUser(formUserId);
    if (!user) return;

    setTargetUserForPin(user);
    setPendingAction({
      type: editingWorklog ? "EDIT" : "ADD",
      worklogId: editingWorklog?.id,
      payload: {
        id: editingWorklog?.id,
        user_id: formUserId,
        company_id: config.id,
        plan_id: formPlanId !== "NONE" ? formPlanId : undefined,
        tanggal: formTanggal,
        jam_durasi: parseFloat(formJam) || 4,
        kategori: formKategori,
        pekerjaan: formPekerjaan,
        status: true,
      },
    });
  };

  const handlePromptDeletePin = (worklog: Worklog) => {
    setDeletingWorklog(worklog);
  };

  const handleConfirmDelete = () => {
    if (!deletingWorklog) return;
    const user = getUser(deletingWorklog.user_id);
    if (!user) return;

    const wl = deletingWorklog;
    setDeletingWorklog(null);
    setTargetUserForPin(user);
    setPendingAction({
      type: "DELETE",
      worklogId: wl.id,
    });
  };

  const handleExecutePendingAction = async (verifiedPin?: string) => {
    if (!pendingAction || !targetUserForPin) return;
    const pinToUse = verifiedPin || targetUserForPin.pin_code;

    setIsLoadingAction(true);
    try {
      if (pendingAction.type === "ADD" && pendingAction.payload) {
        await ApiClient.createWorklog({
          ...pendingAction.payload,
          pin: pinToUse,
        });
        setIsAddModalOpen(false);
        setFormPekerjaan("");
        setSuccessNotif("Catatan kerja berhasil ditambahkan.");
      } else if (pendingAction.type === "EDIT" && pendingAction.payload) {
        await ApiClient.updateWorklog({
          ...pendingAction.payload,
          id: pendingAction.worklogId,
          pin: pinToUse,
        });
        setIsAddModalOpen(false);
        setEditingWorklog(null);
        setFormPekerjaan("");
        setSuccessNotif("Catatan kerja berhasil diperbarui.");
      } else if (pendingAction.type === "DELETE" && pendingAction.worklogId) {
        await ApiClient.deleteWorklog(pendingAction.worklogId, targetUserForPin.id, pinToUse);
        setSuccessNotif("Catatan kerja berhasil dihapus.");
      }
    } catch (err: unknown) {
      // Fallback local storage
      try {
        if (pendingAction.type === "ADD" && pendingAction.payload) {
          StorageService.addWorklog(pendingAction.payload as Omit<Worklog, "id" | "created_at" | "pin_verified">);
          setIsAddModalOpen(false);
          setFormPekerjaan("");
          setSuccessNotif("Catatan kerja tersimpan di penyimpanan lokal.");
        } else if (pendingAction.type === "EDIT" && pendingAction.payload && pendingAction.worklogId) {
          StorageService.updateWorklog(pendingAction.worklogId, pendingAction.payload);
          setIsAddModalOpen(false);
          setEditingWorklog(null);
          setFormPekerjaan("");
          setSuccessNotif("Catatan kerja diperbarui di penyimpanan lokal.");
        } else if (pendingAction.type === "DELETE" && pendingAction.worklogId) {
          StorageService.deleteWorklog(pendingAction.worklogId);
          setSuccessNotif("Catatan kerja dihapus dari penyimpanan lokal.");
        }
      } catch (storageErr: unknown) {
        const errMsg = storageErr instanceof Error ? storageErr.message : "Gagal memproses aksi catatan kerja.";
        setErrorNotif(errMsg);
      }
    } finally {
      setIsLoadingAction(false);
    }

    setPendingAction(null);
    setTargetUserForPin(null);
    setTimeout(() => {
      setSuccessNotif("");
      setErrorNotif("");
    }, 4000);
    onRefresh();
  };

  const handleExportCsv = () => {
    const titleRow = `"LAPORAN WORKLOG HARIAN TIM - ${config.name}"`;
    const dateRow = `"Tanggal Ekspor: ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}"`;
    const blankRow = `""`;
    const headers = ["No", "ID", "Nama Anggota", "Divisi", "Tanggal", "Durasi (Jam)", "Kategori", "Rencana Terkait", "Deskripsi Pekerjaan"];
    const rows = filteredWorklogs.map((w, idx) => {
      const u = getUser(w.user_id);
      return [
        idx + 1,
        w.id,
        `"${u?.nama_lengkap || w.user_id}"`,
        `"${u?.divisi || '-'}"`,
        w.tanggal,
        w.jam_durasi,
        `"${w.kategori}"`,
        `"${(w.plan_title || '-').replace(/"/g, '""')}"`,
        `"${w.pekerjaan.replace(/"/g, '""')}"`,
      ];
    });

    const userLabel = selectedUserId !== "ALL" ? (getUser(selectedUserId)?.panggilan || "Staff").replace(/\s+/g, "_") : "Semua_Tim";
    const dateLabel = dateFilter !== "ALL" ? `_${dateFilter}` : "";
    const csvContent = "\uFEFF" + [titleRow, dateRow, blankRow, headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Worklog_${config.name.replace(/\s+/g, "_")}_${userLabel}${dateLabel}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Worklog Harian Tim</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Buku log mandiri dengan verifikasi PIN 6-digit & keterhubungan langsung ke Rencana Bulanan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={handleExportCsv}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 py-2 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={handleOpenAddForm}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Catatan Kerja</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip - Reactive to filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Jam Kerja Terfilter</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-slate-900">{totalJamTerfilter} Jam</span>
              <span className="text-[11px] text-slate-400 font-medium">/ {totalJamKeseluruhan} Jam Total</span>
            </div>
            <p className="text-[10px] text-blue-600 font-semibold mt-0.5">
              {dateFilter === "ALL" ? "Semua Rentang Waktu" : dateFilter === "TODAY" ? "Hari Ini" : dateFilter === "7DAYS" ? "7 Hari Terakhir" : "Bulan Ini"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Log Terverifikasi PIN</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-emerald-600">{filteredWorklogs.length} Log</span>
              <span className="text-[11px] text-slate-400 font-medium">({uniqueDatesCount} Hari Aktif)</span>
            </div>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              Rata-rata ~{avgJamPerHari} Jam/Hari Aktif
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Staf Kontributor</p>
            <p className="text-xl font-black text-purple-600 mt-1">
              {selectedUserId !== "ALL"
                ? getUser(selectedUserId)?.nama_lengkap || "1 Anggota"
                : `${users.filter((u) => u.is_active).length} Anggota Aktif`}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {selectedCategory !== "Semua" ? `Kategori: ${selectedCategory}` : "Semua Kategori Pekerjaan"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Member Dropdown Filter */}
            <div className="w-full sm:w-56">
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
              >
                <option value="ALL">Semua Anggota Tim ({users.length})</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nama_lengkap} ({u.divisi})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Date Filters */}
            <div className="flex flex-wrap items-center bg-slate-100/80 p-1 rounded-xl gap-1 w-full sm:w-auto">
              {(
                [
                  { id: "ALL", label: "Semua Waktu" },
                  { id: "TODAY", label: "Hari Ini" },
                  { id: "7DAYS", label: "7 Hari" },
                  { id: "MONTH", label: "Bulan Ini" },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setDateFilter(d.id);
                    setCurrentPage(1);
                  }}
                  className={`flex-1 sm:flex-initial text-center py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateFilter === d.id
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="w-full md:w-64 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Cari aktivitas atau staf..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
            />
          </div>
        </div>

        {/* Category Pills & Distribution Bar */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Kategori:</span>
            {categories.slice(0, 6).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1);
                }}
                className={`py-1 px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {totalJamTerfilter > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 py-1 px-2.5 rounded-lg border border-slate-100 self-start sm:self-auto">
              <PieChart className="w-3.5 h-3.5 text-blue-500" />
              <span>
                Dev: <strong>{categoryHoursMap["Development"] || 0}h</strong> | Design:{" "}
                <strong>{categoryHoursMap["Design"] || 0}h</strong> | QA:{" "}
                <strong>{categoryHoursMap["QA & Testing"] || 0}h</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Worklogs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                <th className="py-3.5 px-4">Staf / Anggota</th>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Durasi</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Deskripsi Aktivitas & Rencana Terkait</th>
                <th className="py-3.5 px-4 text-center">Status PIN</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedWorklogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Belum ada log harian yang sesuai filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedWorklogs.map((w) => {
                  const user = getUser(w.user_id);
                  return (
                    <tr key={w.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                            {user?.panggilan?.[0] || user?.nama_lengkap?.[0] || "U"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{user?.nama_lengkap || w.user_id}</p>
                            <p className="text-[10px] text-slate-400">{user?.jabatan || user?.divisi || "Staff"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateIndo(w.tanggal)}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-bold whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{w.jam_durasi} Jam</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {w.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-md">
                        <p className="leading-relaxed">{w.pekerjaan}</p>
                        {w.plan_title && (
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                            <span>🎯 Target: {w.plan_title}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Valid</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditForm(w)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Catatan (Perlu PIN Anggota)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePromptDeletePin(w)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Catatan (Perlu PIN Anggota)"
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

        {/* Pagination Bar */}
        <div className="p-3.5 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-medium text-[11px]">
            Menampilkan{" "}
            <span className="font-bold text-slate-800">
              {filteredWorklogs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredWorklogs.length)}
            </span>{" "}
            dari <span className="font-bold text-slate-800">{filteredWorklogs.length}</span> Catatan Kerja
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            <span className="px-2 font-bold text-slate-700 text-xs">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Worklog Form Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-slate-900 text-base mb-1">Tambah Worklog Mandiri</h3>
            <p className="text-xs text-slate-500 mb-4">
              Isi catatan aktivitas harian. Data akan langsung terhubung ke database dan target bulanan.
            </p>

            <form onSubmit={handlePromptAddPin} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Pilih Anggota Tim</label>
                <select
                  value={formUserId}
                  onChange={(e) => setFormUserId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nama_lengkap} ({u.jabatan})
                    </option>
                  ))}
                </select>
              </div>

              {/* Linked Monthly Plan */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tautkan ke Target Rencana Bulanan (Opsional)
                </label>
                <select
                  value={formPlanId}
                  onChange={(e) => setFormPlanId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                >
                  <option value="NONE">-- Tanpa Tautan Rencana (Aktivitas Rutin/Bebas) --</option>
                  {userPlans.map((p) => {
                    const loggedHours = p.total_jam_tercatat || 0;
                    return (
                      <option key={p.id} value={p.id}>
                        🎯 {p.rencana_pekerjaan} ({p.prioritas}) - Tercatat {loggedHours} Jam
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tanggal</label>
                  <input
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-700 font-semibold">Durasi Kerja (Jam)</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFormJam("2.0")}
                        className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold cursor-pointer"
                      >
                        2h
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormJam("4.0")}
                        className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold cursor-pointer"
                      >
                        4h
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormJam("8.0")}
                        className="px-1.5 py-0.5 text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-bold cursor-pointer"
                      >
                        8h (Full)
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="16"
                    value={formJam}
                    onChange={(e) => setFormJam(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Kategori Pekerjaan</label>
                <select
                  value={formKategori}
                  onChange={(e) => setFormKategori(e.target.value as WorklogCategory)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                >
                  {categories.filter((c) => c !== "Semua").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Ringkasan Pekerjaan</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Deskripsikan fitur, tiket bug, atau progres yang dikerjakan..."
                  value={formPekerjaan}
                  onChange={(e) => setFormPekerjaan(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <span>Lanjut ke Verifikasi PIN</span>
                  <span>🔒</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deletingWorklog}
        title="Hapus Catatan Kerja?"
        message={`Apakah Anda yakin ingin menghapus catatan aktivitas "${deletingWorklog?.pekerjaan}"? Tindakan ini memerlukan verifikasi PIN anggota pemilik catatan.`}
        confirmLabel="Lanjut Verifikasi PIN"
        cancelLabel="Batal"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingWorklog(null)}
      />

      {/* Floating Toast Notification */}
      {successNotif && (
        <Toast
          type="success"
          message={successNotif}
          onClose={() => setSuccessNotif("")}
        />
      )}
      {errorNotif && (
        <Toast
          type="error"
          message={errorNotif}
          onClose={() => setErrorNotif("")}
        />
      )}

      {/* PIN Verification Modal */}
      {targetUserForPin && (
        <PinVerificationModal
          isOpen={!!targetUserForPin}
          onClose={() => {
            setTargetUserForPin(null);
            setPendingAction(null);
          }}
          userId={targetUserForPin.id}
          userName={targetUserForPin.nama_lengkap}
          actionTitle={
            pendingAction?.type === "DELETE" ? "Hapus Catatan Worklog" : "Penyimpanan Worklog Mandiri"
          }
          onVerified={handleExecutePendingAction}
        />
      )}
    </div>
  );
};
