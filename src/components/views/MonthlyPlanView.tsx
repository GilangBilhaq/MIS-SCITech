"use client";

import React, { useState } from "react";
import {
  Calendar,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Check,
  Layers,
  ChevronDown,
  Download,
  LayoutGrid,
  List,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { MonthlyPlan, User, WorklogCategory } from "@/types";
import { TenantConfig } from "@/config/tenant.config";
import { StorageService } from "@/lib/storage";
import { ApiClient } from "@/lib/apiClient";
import { PinVerificationModal } from "@/components/modals/PinVerificationModal";
import { Toast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface MonthlyPlanViewProps {
  config: TenantConfig;
  plans: MonthlyPlan[];
  users: User[];
  onRefresh: () => void;
}

export const MonthlyPlanView: React.FC<MonthlyPlanViewProps> = ({ config, plans, users, onRefresh }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("Semua");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED" | "OVERDUE">("ALL");
  const [viewMode, setViewMode] = useState<"CARD" | "TABLE">("CARD");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MonthlyPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<MonthlyPlan | null>(null);
  const [toastNotif, setToastNotif] = useState("");
  const [errorNotif, setErrorNotif] = useState("");
  const [targetUserForPin, setTargetUserForPin] = useState<User | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: "ADD" | "EDIT" | "DELETE" | "TOGGLE";
    planId?: string;
    payload?: Partial<MonthlyPlan>;
  } | null>(null);

  // Form State
  const [formUserId, setFormUserId] = useState(users[0]?.id || "");
  const [formBulan, setFormBulan] = useState(new Date().getMonth() + 1);
  const [formTahun, setFormTahun] = useState(new Date().getFullYear());
  const [formRencana, setFormRencana] = useState("");
  const [formKategori, setFormKategori] = useState<WorklogCategory>("Development");
  const [formPrioritas, setFormPrioritas] = useState<"Tinggi" | "Sedang" | "Rendah">("Tinggi");
  const [formDeadline, setFormDeadline] = useState(() => new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().split("T")[0]);
  const [formTargetOutput, setFormTargetOutput] = useState("");

  const getUser = (id: string) => users.find((u) => u.id === id);

  const months = [
    { num: 1, name: "Januari" },
    { num: 2, name: "Februari" },
    { num: 3, name: "Maret" },
    { num: 4, name: "April" },
    { num: 5, name: "Mei" },
    { num: 6, name: "Juni" },
    { num: 7, name: "Juli" },
    { num: 8, name: "Agustus" },
    { num: 9, name: "September" },
    { num: 10, name: "Oktober" },
    { num: 11, name: "November" },
    { num: 12, name: "Desember" },
  ];

  const isOverdue = (deadlineStr: string, isCompleted: boolean) => {
    if (isCompleted) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(deadlineStr);
    due.setHours(0, 0, 0, 0);
    return due.getTime() < now.getTime();
  };

  const getDaysLeft = (deadlineStr: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(deadlineStr);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
  };

  const filteredPlans = plans.filter((p) => {
    const matchUser = selectedUserId === "ALL" || p.user_id === selectedUserId;
    const matchPriority = selectedPriority === "Semua" || p.prioritas === selectedPriority;
    const matchMonth = selectedMonth === "ALL" || p.bulan === Number(selectedMonth);
    const matchYear = selectedYear === "ALL" || p.tahun === Number(selectedYear);
    const matchSearch =
      p.rencana_pekerjaan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.target_output.toLowerCase().includes(searchQuery.toLowerCase());

    const planOverdue = isOverdue(p.deadline, p.is_completed);
    let matchStatus = true;
    if (statusFilter === "ACTIVE") {
      matchStatus = !p.is_completed && !planOverdue;
    } else if (statusFilter === "COMPLETED") {
      matchStatus = p.is_completed;
    } else if (statusFilter === "OVERDUE") {
      matchStatus = planOverdue;
    }

    return matchUser && matchPriority && matchMonth && matchYear && matchSearch && matchStatus;
  });

  const totalPlansCount = plans.length;
  const completedCount = plans.filter((p) => p.is_completed).length;
  const overdueCount = plans.filter((p) => isOverdue(p.deadline, p.is_completed)).length;
  const activeCount = plans.filter((p) => !p.is_completed && !isOverdue(p.deadline, p.is_completed)).length;
  const totalFilteredHours = filteredPlans.reduce((acc, curr) => acc + (curr.total_jam_tercatat || 0), 0);

  const handleExportCsv = () => {
    const titleRow = `"LAPORAN RENCANA KERJA BULANAN (MONTHLY PLAN) - ${config.name}"`;
    const dateRow = `"Tanggal Ekspor: ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}"`;
    const blankRow = `""`;
    const headers = [
      "No",
      "ID",
      "Nama Staf",
      "Divisi",
      "Periode Bulan/Tahun",
      "Rencana Pekerjaan",
      "Kategori",
      "Prioritas",
      "Deadline",
      "Status Target",
      "Jam Tercatat (Worklog)",
      "Jumlah Log",
      "Target Output Terukur",
    ];
    const rows = filteredPlans.map((p, idx) => {
      const u = getUser(p.user_id);
      const overdue = isOverdue(p.deadline, p.is_completed);
      const statusText = p.is_completed ? "SELESAI" : overdue ? "TERLEWAT DEADLINE" : "AKTIF (BERJALAN)";
      return [
        idx + 1,
        p.id,
        `"${u?.nama_lengkap || p.user_id}"`,
        `"${u?.divisi || '-'}"`,
        `"${p.bulan}/${p.tahun}"`,
        `"${p.rencana_pekerjaan.replace(/"/g, '""')}"`,
        `"${p.kategori}"`,
        `"${p.prioritas}"`,
        p.deadline,
        `"${statusText}"`,
        p.total_jam_tercatat || 0,
        p.total_worklogs || 0,
        `"${p.target_output.replace(/"/g, '""')}"`,
      ];
    });

    const userLabel = selectedUserId !== "ALL" ? (getUser(selectedUserId)?.panggilan || "Staff").replace(/\s+/g, "_") : "Semua_Tim";
    const monthLabel = selectedMonth !== "ALL" ? `_Bulan_${selectedMonth}` : "";
    const csvContent = "\uFEFF" + [titleRow, dateRow, blankRow, headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `MonthlyPlan_${config.name.replace(/\s+/g, "_")}_${userLabel}${monthLabel}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePromptAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const user = getUser(formUserId);
    if (!user) return;

    setTargetUserForPin(user);
    setPendingAction({
      type: "ADD",
      payload: {
        company_id: config.id,
        user_id: formUserId,
        bulan: Number(formBulan),
        tahun: Number(formTahun),
        rencana_pekerjaan: formRencana,
        kategori: formKategori,
        prioritas: formPrioritas,
        deadline: formDeadline,
        target_output: formTargetOutput,
        is_completed: false,
      },
    });
  };

  const handleOpenEdit = (plan: MonthlyPlan) => {
    setEditingPlan(plan);
    setFormUserId(plan.user_id);
    setFormBulan(plan.bulan);
    setFormTahun(plan.tahun);
    setFormRencana(plan.rencana_pekerjaan);
    setFormKategori(plan.kategori);
    setFormPrioritas(plan.prioritas);
    setFormDeadline(plan.deadline);
    setFormTargetOutput(plan.target_output);
  };

  const handlePromptEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    const user = getUser(formUserId);
    if (!user) return;

    setTargetUserForPin(user);
    setPendingAction({
      type: "EDIT",
      planId: editingPlan.id,
      payload: {
        company_id: config.id,
        user_id: formUserId,
        bulan: Number(formBulan),
        tahun: Number(formTahun),
        rencana_pekerjaan: formRencana,
        kategori: formKategori,
        prioritas: formPrioritas,
        deadline: formDeadline,
        target_output: formTargetOutput,
      },
    });
  };

  const handlePromptDelete = (plan: MonthlyPlan) => {
    setDeletingPlan(plan);
  };

  const handleConfirmDelete = () => {
    if (!deletingPlan) return;
    const user = getUser(deletingPlan.user_id);
    if (!user) return;

    const p = deletingPlan;
    setDeletingPlan(null);
    setTargetUserForPin(user);
    setPendingAction({
      type: "DELETE",
      planId: p.id,
    });
  };

  const handlePromptToggle = (plan: MonthlyPlan) => {
    const user = getUser(plan.user_id);
    if (!user) return;

    setTargetUserForPin(user);
    setPendingAction({
      type: "TOGGLE",
      planId: plan.id,
      payload: { is_completed: !plan.is_completed },
    });
  };

  const handleExecutePending = async (verifiedPin?: string) => {
    if (!pendingAction || !targetUserForPin) return;
    const pinToUse = verifiedPin || targetUserForPin.pin_code;

    try {
      if (pendingAction.type === "ADD" && pendingAction.payload) {
        await ApiClient.createMonthlyPlan({
          ...pendingAction.payload,
          pin: pinToUse,
        });
        setIsAddModalOpen(false);
        setFormRencana("");
        setFormTargetOutput("");
        setToastNotif("Rencana bulanan berhasil ditambahkan.");
      } else if (pendingAction.type === "EDIT" && pendingAction.planId && pendingAction.payload) {
        await ApiClient.updateMonthlyPlan({
          id: pendingAction.planId,
          user_id: targetUserForPin.id,
          pin: pinToUse,
          ...pendingAction.payload,
        });
        setEditingPlan(null);
        setFormRencana("");
        setFormTargetOutput("");
        setToastNotif("Rencana bulanan berhasil diperbarui.");
      } else if (pendingAction.type === "DELETE" && pendingAction.planId) {
        await ApiClient.deleteMonthlyPlan(pendingAction.planId, targetUserForPin.id, pinToUse);
        setToastNotif("Rencana bulanan berhasil dihapus.");
      } else if (pendingAction.type === "TOGGLE" && pendingAction.planId && pendingAction.payload) {
        await ApiClient.toggleMonthlyPlan(
          pendingAction.planId,
          targetUserForPin.id,
          pinToUse,
          !!pendingAction.payload.is_completed
        );
        setToastNotif(
          pendingAction.payload.is_completed
            ? "Sasaran kerja ditandai SELESAI!"
            : "Sasaran kerja dikembalikan ke aktif."
        );
      }
    } catch (err: unknown) {
      // Fallback local storage
      try {
        if (pendingAction.type === "ADD" && pendingAction.payload) {
          StorageService.addMonthlyPlan(pendingAction.payload as Omit<MonthlyPlan, "id" | "created_at">);
          setIsAddModalOpen(false);
          setFormRencana("");
          setFormTargetOutput("");
          setToastNotif("Rencana bulanan tersimpan di penyimpanan lokal.");
        } else if (pendingAction.type === "EDIT" && pendingAction.planId && pendingAction.payload) {
          StorageService.updateMonthlyPlan(pendingAction.planId, pendingAction.payload);
          setEditingPlan(null);
          setFormRencana("");
          setFormTargetOutput("");
          setToastNotif("Rencana bulanan diperbarui di penyimpanan lokal.");
        } else if (pendingAction.type === "DELETE" && pendingAction.planId) {
          StorageService.deleteMonthlyPlan(pendingAction.planId);
          setToastNotif("Rencana bulanan dihapus dari penyimpanan lokal.");
        } else if (pendingAction.type === "TOGGLE" && pendingAction.planId && pendingAction.payload) {
          StorageService.updateMonthlyPlan(pendingAction.planId, pendingAction.payload);
          setToastNotif(
            pendingAction.payload.is_completed
              ? "Sasaran kerja ditandai SELESAI!"
              : "Sasaran kerja dikembalikan ke aktif."
          );
        }
      } catch (storageErr: unknown) {
        const msg = storageErr instanceof Error ? storageErr.message : "Gagal memproses aksi rencana bulanan.";
        setErrorNotif(msg);
      }
    }

    setPendingAction(null);
    setTargetUserForPin(null);
    setTimeout(() => {
      setToastNotif("");
      setErrorNotif("");
    }, 4000);
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Rencana Bulanan (Monthly Plan)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Target sasaran kerja berkala per staf dengan pelacakan agregasi jam kerja riil
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
            onClick={() => {
              setFormUserId(users[0]?.id || "");
              setIsAddModalOpen(true);
            }}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Rencana Bulanan</span>
          </button>
        </div>
      </div>

      {/* Overview Cards - Reactive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Target Terfilter</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-slate-900">{filteredPlans.length} Rencana</span>
              <span className="text-[11px] text-slate-400 font-medium">/ {totalPlansCount} Total</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Berjalan Aktif</p>
            <p className="text-xl font-black text-amber-600 mt-1">{activeCount} Sasaran</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Sedang dikerjakan tim</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Selesai Tercapai</p>
            <p className="text-xl font-black text-emerald-600 mt-1">{completedCount} Sasaran</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              {totalPlansCount > 0 ? Math.round((completedCount / totalPlansCount) * 100) : 0}% Tingkat Keberhasilan
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Jam Kerja Terserap</p>
            <p className="text-xl font-black text-purple-600 mt-1">{totalFilteredHours} Jam</p>
            <p className="text-[10px] text-purple-600 font-semibold mt-0.5">Dari Worklog Terverifikasi</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Status Segmented Tabs */}
            <div className="flex flex-wrap items-center bg-slate-100/80 p-1 rounded-xl gap-1 w-full sm:w-auto">
              {(
                [
                  { id: "ALL", label: "Semua", count: filteredPlans.length },
                  { id: "ACTIVE", label: "Aktif", count: activeCount },
                  { id: "COMPLETED", label: "Selesai", count: completedCount },
                  { id: "OVERDUE", label: "Terlambat", count: overdueCount },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex-1 sm:flex-initial justify-center py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === tab.id
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.id === "OVERDUE" && overdueCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            {/* Month & Year Selectors */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
              >
                <option value="ALL">Semua Bulan</option>
                {months.map((m) => (
                  <option key={m.num} value={m.num}>
                    {m.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
              >
                <option value="ALL">Semua Tahun</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {/* View Mode Toggle: Card vs Table */}
            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl gap-1">
              <button
                onClick={() => setViewMode("CARD")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "CARD" ? "bg-white text-blue-600 shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Tampilan Kartu (Grid)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("TABLE")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "TABLE" ? "bg-white text-blue-600 shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Tampilan Tabel (Data Table)"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="w-full sm:w-64 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Cari rencana atau output..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Member and Priority Sub-filters */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Member Dropdown */}
            <div className="w-full sm:w-56">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
              >
                <option value="ALL">Semua Anggota Tim ({users.length})</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nama_lengkap} ({u.divisi})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Prioritas:</span>
              {["Semua", "Tinggi", "Sedang", "Rendah"].map((prio) => (
                <button
                  key={prio}
                  onClick={() => setSelectedPriority(prio)}
                  className={`py-1 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedPriority === prio
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                  }`}
                >
                  {prio}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            Menampilkan <strong className="text-slate-700">{filteredPlans.length}</strong> target sasaran
          </div>
        </div>
      </div>

      {/* Plans Presentation: Cards or Table */}
      {viewMode === "CARD" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlans.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
              Belum ada sasaran rencana bulanan untuk filter ini. Klik &quot;Buat Rencana Bulanan Baru&quot;.
            </div>
          ) : (
            filteredPlans.map((plan) => {
              const user = getUser(plan.user_id);
              const overdue = isOverdue(plan.deadline, plan.is_completed);
              const daysLeft = getDaysLeft(plan.deadline);

              const prioColor =
                plan.prioritas === "Tinggi"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : plan.prioritas === "Sedang"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-50 text-slate-700 border-slate-200";

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                    plan.is_completed
                      ? "border-emerald-200 bg-emerald-50/20"
                      : overdue
                      ? "border-rose-200 bg-rose-50/10"
                      : "border-slate-200/80"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${prioColor}`}>
                          {plan.prioritas}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {plan.kategori}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-500">
                          {months.find((m) => m.num === plan.bulan)?.name || `Bulan ${plan.bulan}`} {plan.tahun}
                        </span>

                        {/* Health Badge */}
                        {plan.is_completed ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            🟢 Selesai
                          </span>
                        ) : overdue ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                            🔴 Terlambat ({Math.abs(daysLeft)}h)
                          </span>
                        ) : daysLeft <= 3 ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            🟡 Deadline Dekat ({daysLeft}h)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            🔵 Berjalan ({daysLeft}h lagi)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePromptToggle(plan)}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                            plan.is_completed
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : "border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={plan.is_completed ? "Tandai Belum Selesai (Perlu PIN)" : "Tandai Selesai (Perlu PIN)"}
                        >
                          <Check className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(plan)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                          title="Edit Rencana (Perlu PIN)"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handlePromptDelete(plan)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Hapus Rencana (Perlu PIN)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3
                      className={`font-bold text-sm text-slate-900 leading-snug ${
                        plan.is_completed ? "line-through text-slate-400" : ""
                      }`}
                    >
                      {plan.rencana_pekerjaan}
                    </h3>

                    <div className="mt-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1.5">
                      <p className="text-[11px] text-slate-500 font-medium">
                        Target Output: <strong className="text-slate-800">{plan.target_output}</strong>
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-200/60">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Deadline: {plan.deadline}</span>
                        </div>
                        <span className="font-semibold text-slate-700">
                          {plan.total_jam_tercatat || 0} Jam Log Terkumpul
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[9px]">
                        {user?.panggilan?.[0] || user?.nama_lengkap?.[0] || "U"}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-800 truncate max-w-[130px]">
                          {user?.nama_lengkap || plan.user_id}
                        </p>
                        <p className="text-[9px] text-slate-400">{user?.divisi || "Staff"}</p>
                      </div>
                    </div>

                    {/* Relational Aggregation Badge */}
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span>
                        {plan.total_jam_tercatat !== undefined ? `${plan.total_jam_tercatat} Jam` : "0 Jam"} (
                        {plan.total_worklogs || 0} Log)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Data Table View */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                  <th className="py-3.5 px-4">Staf / Periode</th>
                  <th className="py-3.5 px-4">Rencana Pekerjaan</th>
                  <th className="py-3.5 px-4">Kategori & Prioritas</th>
                  <th className="py-3.5 px-4">Deadline & Status</th>
                  <th className="py-3.5 px-4 text-center">Realisasi Jam</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Belum ada sasaran rencana bulanan untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => {
                    const user = getUser(plan.user_id);
                    const overdue = isOverdue(plan.deadline, plan.is_completed);
                    const daysLeft = getDaysLeft(plan.deadline);

                    return (
                      <tr key={plan.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                              {user?.panggilan?.[0] || user?.nama_lengkap?.[0] || "U"}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{user?.nama_lengkap || plan.user_id}</p>
                              <p className="text-[10px] text-slate-400">
                                {months.find((m) => m.num === plan.bulan)?.name} {plan.tahun}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-sm">
                          <p
                            className={`font-semibold text-slate-800 ${
                              plan.is_completed ? "line-through text-slate-400" : ""
                            }`}
                          >
                            {plan.rencana_pekerjaan}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                            Target: <span className="text-slate-700 font-medium">{plan.target_output}</span>
                          </p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {plan.kategori}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                plan.prioritas === "Tinggi"
                                  ? "bg-rose-50 text-rose-700"
                                  : plan.prioritas === "Sedang"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {plan.prioritas}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-mono text-[11px] text-slate-700">{plan.deadline}</p>
                          {plan.is_completed ? (
                            <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              🟢 Selesai
                            </span>
                          ) : overdue ? (
                            <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded animate-pulse">
                              🔴 Terlewat {Math.abs(daysLeft)}h
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] font-medium text-slate-500">
                              {daysLeft} hari lagi
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-mono text-[11px] font-bold">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span>{plan.total_jam_tercatat || 0} Jam</span>
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">{plan.total_worklogs || 0} Log</p>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handlePromptToggle(plan)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                plan.is_completed
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={plan.is_completed ? "Tandai Belum Selesai (Perlu PIN)" : "Tandai Selesai (Perlu PIN)"}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(plan)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Rencana (Perlu PIN)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePromptDelete(plan)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Rencana (Perlu PIN)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* Add Plan Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-slate-900 text-base mb-1">Buat Sasaran Rencana Bulanan Baru</h3>
            <p className="text-xs text-slate-500 mb-4">
              Rencana akan divalidasi oleh PIN 6-digit staf dan otomatis terhubung ke Worklog harian.
            </p>

            <form onSubmit={handlePromptAdd} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bulan Periode</label>
                  <select
                    value={formBulan}
                    onChange={(e) => setFormBulan(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  >
                    {months.map((m) => (
                      <option key={m.num} value={m.num}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tahun</label>
                  <input
                    type="number"
                    value={formTahun}
                    onChange={(e) => setFormTahun(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Rencana Pekerjaan</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Misal: Implementasi modul pembayaran QRIS dan webhook API..."
                  value={formRencana}
                  onChange={(e) => setFormRencana(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kategori</label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value as WorklogCategory)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  >
                    <option value="Development">Development</option>
                    <option value="Design">Design</option>
                    <option value="QA & Testing">QA & Testing</option>
                    <option value="Project">Project</option>
                    <option value="Rutin">Rutin</option>
                    <option value="Support">Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Prioritas</label>
                  <select
                    value={formPrioritas}
                    onChange={(e) => setFormPrioritas(e.target.value as "Tinggi" | "Sedang" | "Rendah")}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  >
                    <option value="Tinggi">Tinggi</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Deadline</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Output Terukur</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Endpoint teruji di Postman & lulus QA 100%"
                  value={formTargetOutput}
                  onChange={(e) => setFormTargetOutput(e.target.value)}
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

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-slate-900 text-base mb-1">Edit Target Rencana Bulanan</h3>
            <p className="text-xs text-slate-500 mb-4">
              Perubahan rencana kerja memerlukan otorisasi PIN 6-digit pemilik rencana.
            </p>

            <form onSubmit={handlePromptEdit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Anggota Tim</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bulan Periode</label>
                  <select
                    value={formBulan}
                    onChange={(e) => setFormBulan(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  >
                    {months.map((m) => (
                      <option key={m.num} value={m.num}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tahun</label>
                  <input
                    type="number"
                    value={formTahun}
                    onChange={(e) => setFormTahun(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Rencana Pekerjaan</label>
                <textarea
                  rows={2}
                  required
                  value={formRencana}
                  onChange={(e) => setFormRencana(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kategori</label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value as WorklogCategory)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  >
                    <option value="Development">Development</option>
                    <option value="Design">Design</option>
                    <option value="QA & Testing">QA & Testing</option>
                    <option value="Project">Project</option>
                    <option value="Rutin">Rutin</option>
                    <option value="Support">Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Prioritas</label>
                  <select
                    value={formPrioritas}
                    onChange={(e) => setFormPrioritas(e.target.value as "Tinggi" | "Sedang" | "Rendah")}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  >
                    <option value="Tinggi">Tinggi</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Deadline</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Output Terukur</label>
                <input
                  type="text"
                  required
                  value={formTargetOutput}
                  onChange={(e) => setFormTargetOutput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <span>Verifikasi PIN</span>
                  <span>🔒</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deletingPlan}
        title="Hapus Sasaran Rencana Bulanan?"
        message={`Apakah Anda yakin ingin menghapus target sasaran "${deletingPlan?.rencana_pekerjaan}"? Tindakan ini memerlukan verifikasi PIN anggota pemilik sasaran.`}
        confirmLabel="Lanjut Verifikasi PIN"
        cancelLabel="Batal"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingPlan(null)}
      />

      {/* Floating Toast Notification */}
      {toastNotif && (
        <Toast
          type="success"
          message={toastNotif}
          onClose={() => setToastNotif("")}
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
            pendingAction?.type === "DELETE"
              ? "Hapus Target Rencana Bulanan"
              : pendingAction?.type === "EDIT"
              ? "Edit Target Rencana Bulanan"
              : pendingAction?.type === "TOGGLE"
              ? "Perbarui Status Penyelesaian Rencana"
              : "Pembuatan Target Rencana Bulanan"
          }
          onVerified={handleExecutePending}
        />
      )}
    </div>
  );
};
