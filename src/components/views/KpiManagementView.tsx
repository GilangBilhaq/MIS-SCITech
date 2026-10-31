"use client";

import React, { useState, useMemo } from "react";
import {
  Award,
  Plus,
  CheckCircle2,
  Trash2,
  Edit3,
  Eye,
  Check,
  TrendingUp,
  Clock,
  Calendar,
  Search,
  Filter,
  Download,
  Trophy,
  Target,
  BarChart3,
  UserCheck,
  Star,
  Sparkles,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  Printer,
  X,
  FileSpreadsheet,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { KpiEvaluation, User } from "@/types";
import { TenantConfig } from "@/config/tenant.config";
import { StorageService } from "@/lib/storage";
import { ApiClient } from "@/lib/apiClient";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";

interface KpiManagementViewProps {
  config: TenantConfig;
  kpis: KpiEvaluation[];
  users: User[];
  onRefresh: () => void;
}

export const KpiManagementView: React.FC<KpiManagementViewProps> = ({ config, kpis, users, onRefresh }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KpiEvaluation | null>(null);
  const [previewKpi, setPreviewKpi] = useState<KpiEvaluation | null>(null);
  const [deleteTargetKpi, setDeleteTargetKpi] = useState<KpiEvaluation | null>(null);
  const [toastNotif, setToastNotif] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivisi, setSelectedDivisi] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<number | "ALL">("ALL");
  const [selectedKategori, setSelectedKategori] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Form Fields
  const [formUserId, setFormUserId] = useState(users[0]?.id || "");
  const [formBulan, setFormBulan] = useState(new Date().getMonth() + 1);
  const [formTahun, setFormTahun] = useState(new Date().getFullYear());
  const [formIndikator, setFormIndikator] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formRealisasi, setFormRealisasi] = useState("");
  const [formSkor, setFormSkor] = useState(90);
  const [formBobot, setFormBobot] = useState(30);

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

  // Distinct Divisi & Years for Filters
  const uniqueDivisi = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.divisi) set.add(u.divisi);
    });
    return Array.from(set);
  }, [users]);

  const uniqueYears = useMemo(() => {
    const set = new Set<number>();
    kpis.forEach((k) => set.add(k.tahun));
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [kpis]);

  // Executive Analytics Calculations
  const stats = useMemo(() => {
    const total = kpis.length;
    if (total === 0) {
      return {
        avgScore: 0,
        publishedCount: 0,
        draftCount: 0,
        exemplaryCount: 0,
        highPerformerCount: 0,
        averageCount: 0,
        needsImprovementCount: 0,
        topScore: 0,
      };
    }

    const sumScore = kpis.reduce((acc, k) => acc + (k.skor || 0), 0);
    const avgScore = Math.round((sumScore / total) * 10) / 10;
    const publishedCount = kpis.filter((k) => k.is_published).length;
    const draftCount = total - publishedCount;
    const exemplaryCount = kpis.filter((k) => k.skor_kategori === "Exemplary").length;
    const highPerformerCount = kpis.filter((k) => k.skor_kategori === "High Performer").length;
    const averageCount = kpis.filter((k) => k.skor_kategori === "Average").length;
    const needsImprovementCount = kpis.filter((k) => k.skor_kategori === "Needs Improvement").length;
    const topScore = Math.max(...kpis.map((k) => k.skor || 0));

    return {
      avgScore,
      publishedCount,
      draftCount,
      exemplaryCount,
      highPerformerCount,
      averageCount,
      needsImprovementCount,
      topScore,
    };
  }, [kpis]);

  // Filtered KPI list
  const filteredKpis = useMemo(() => {
    return kpis.filter((k) => {
      const user = getUser(k.user_id);
      const matchesSearch =
        searchQuery === "" ||
        user?.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user?.panggilan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user?.divisi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.indikator_kpi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.realisasi.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDivisi = selectedDivisi === "ALL" || user?.divisi === selectedDivisi;
      const matchesYear = selectedYear === "ALL" || k.tahun === selectedYear;
      const matchesKategori = selectedKategori === "ALL" || k.skor_kategori === selectedKategori;
      const matchesStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "PUBLISHED" && k.is_published) ||
        (selectedStatus === "DRAFT" && !k.is_published);

      return matchesSearch && matchesDivisi && matchesYear && matchesKategori && matchesStatus;
    });
  }, [kpis, searchQuery, selectedDivisi, selectedYear, selectedKategori, selectedStatus, users]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredKpis.length === 0) {
      setToastNotif({
        type: "error",
        message: "Tidak ada data KPI yang dapat diekspor pada filter ini.",
      });
      return;
    }

    const headers = [
      "ID",
      "Nama Staf",
      "Divisi",
      "Bulan",
      "Tahun",
      "Indikator KPI",
      "Target",
      "Realisasi",
      "Skor",
      "Bobot (%)",
      "Nilai Akhir",
      "Kategori",
      "Status Publik",
    ];

    const rows = filteredKpis.map((k) => {
      const u = getUser(k.user_id);
      const monthName = months.find((m) => m.num === k.bulan)?.name || `Bulan ${k.bulan}`;
      return [
        `"${k.id}"`,
        `"${u?.nama_lengkap || k.user_id}"`,
        `"${u?.divisi || '-'}"`,
        `"${monthName}"`,
        k.tahun,
        `"${k.indikator_kpi.replace(/"/g, '""')}"`,
        `"${k.target.replace(/"/g, '""')}"`,
        `"${k.realisasi.replace(/"/g, '""')}"`,
        k.skor,
        k.bobot_persen,
        k.nilai_akhir,
        `"${k.skor_kategori}"`,
        `"${k.is_published ? "Publik" : "Draf Privat"}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_KPI_Anggota_SCITech_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastNotif({
      type: "info",
      message: "Laporan evaluasi KPI berhasil diekspor ke file CSV.",
    });
  };

  const handleOpenAdd = () => {
    setEditingKpi(null);
    setFormUserId(users[0]?.id || "");
    setFormBulan(new Date().getMonth() + 1);
    setFormTahun(new Date().getFullYear());
    setFormIndikator("");
    setFormTarget("");
    setFormRealisasi("");
    setFormSkor(90);
    setFormBobot(30);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (kpi: KpiEvaluation) => {
    setEditingKpi(kpi);
    setFormUserId(kpi.user_id);
    setFormBulan(kpi.bulan);
    setFormTahun(kpi.tahun);
    setFormIndikator(kpi.indikator_kpi);
    setFormTarget(kpi.target);
    setFormRealisasi(kpi.realisasi);
    setFormSkor(kpi.skor);
    setFormBobot(kpi.bobot_persen);
    setIsAddModalOpen(true);
  };

  const handleSaveKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    const kategori: "Exemplary" | "High Performer" | "Average" | "Needs Improvement" =
      formSkor >= 95 ? "Exemplary" : formSkor >= 85 ? "High Performer" : formSkor >= 70 ? "Average" : "Needs Improvement";

    const payload = {
      company_id: config.id,
      user_id: formUserId,
      bulan: formBulan,
      tahun: formTahun,
      indikator_kpi: formIndikator,
      target: formTarget,
      realisasi: formRealisasi,
      skor: formSkor,
      skor_kategori: kategori,
      bobot_persen: formBobot,
      nilai_akhir: Math.round((formSkor * formBobot) / 100),
      is_published: editingKpi ? editingKpi.is_published : true,
    };

    try {
      if (editingKpi) {
        await ApiClient.updateKpi({ id: editingKpi.id, ...payload });
      } else {
        await ApiClient.createKpi(payload);
      }
    } catch {
      try {
        if (editingKpi) {
          StorageService.updateKpi(editingKpi.id, payload);
        } else {
          StorageService.addKpi(payload as Omit<KpiEvaluation, "id" | "created_at">);
        }
      } catch {
        setToastNotif({
          type: "error",
          message: "Gagal menyimpan evaluasi KPI ke basis data.",
        });
        return;
      }
    }

    setIsAddModalOpen(false);
    setToastNotif({
      type: "success",
      message: editingKpi
        ? `Evaluasi KPI untuk "${formIndikator}" berhasil diperbarui!`
        : `Evaluasi KPI untuk "${formIndikator}" berhasil disimpan dan dipublikasikan ke Dashboard!`,
    });
    setEditingKpi(null);
    onRefresh();
  };

  const handleTogglePublish = async (kpi: KpiEvaluation) => {
    const nextState = !kpi.is_published;
    try {
      await ApiClient.toggleKpiPublish(kpi.id, nextState);
    } catch {
      StorageService.updateKpi(kpi.id, { is_published: nextState });
    }

    setToastNotif({
      type: nextState ? "success" : "info",
      message: nextState
        ? `Rapor KPI "${kpi.indikator_kpi}" berhasil dirilis ke Dashboard Publik!`
        : `Rapor KPI "${kpi.indikator_kpi}" ditarik dari publik (mode privat).`,
    });
    onRefresh();
  };

  const handleDeleteKpiClick = (kpi: KpiEvaluation) => {
    setDeleteTargetKpi(kpi);
  };

  const handleConfirmDeleteKpi = async () => {
    if (!deleteTargetKpi) return;
    try {
      await ApiClient.deleteKpi(deleteTargetKpi.id);
    } catch {
      StorageService.deleteKpi(deleteTargetKpi.id);
    }
    setToastNotif({
      type: "success",
      message: `Evaluasi KPI "${deleteTargetKpi.indikator_kpi}" berhasil dihapus.`,
    });
    setDeleteTargetKpi(null);
    onRefresh();
  };

  // Helper badge for tier/kategori
  const renderKategoriBadge = (kategori: string, skor: number) => {
    switch (kategori) {
      case "Exemplary":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Trophy className="w-3 h-3 text-amber-500" />
            <span>Exemplary</span>
          </span>
        );
      case "High Performer":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Star className="w-3 h-3 text-emerald-500" />
            <span>High Performer</span>
          </span>
        );
      case "Average":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-500" />
            <span>On Track</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-500" />
            <span>Needs Improvement</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Executive Page Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Evaluasi & Rapor KPI Anggota</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enterprise Talent Performance Management, Matrix Pencapaian Objektif, & Transparansi Kinerja Staf
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 py-2 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
            title="Ekspor CSV Hasil Evaluasi KPI"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 py-2 px-4 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Evaluasi KPI</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Stat Cards (Key KPI Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Rata-rata Skor */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              Rata-Rata Tim
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {stats.avgScore}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">/ 100</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Skor tertinggi tercatat: <strong className="text-emerald-600 font-mono">{stats.topScore}</strong>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Tingkat Predikat Unggul */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Staf Berprestasi
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {stats.exemplaryCount + stats.highPerformerCount}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">rapor</span>
            </div>
            <p className="text-[10px] text-amber-700 font-medium">
              {stats.exemplaryCount} Exemplary • {stats.highPerformerCount} High Performer
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Star className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Evaluasi Perlu Perbaikan */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              On Track & Review
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {stats.averageCount}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">on track</span>
            </div>
            <p className="text-[10px] text-rose-600 font-medium">
              {stats.needsImprovementCount} perlu perbaikan (skor &lt; 70)
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Status Rilis & Transparansi Publik */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              Transparansi Publik
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 tracking-tight font-mono">
                {stats.publishedCount}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">/ {kpis.length} Rilis</span>
            </div>
            <p className="text-[10px] text-slate-500">
              {stats.draftCount} catatan tersimpan draf privat
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Check className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Advanced Filtering & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Cari nama anggota, divisi, indikator kinerja, target, atau realisasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end md:self-auto">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "grid" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kartu Rapor</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Divisi Filter */}
          <select
            value={selectedDivisi}
            onChange={(e) => setSelectedDivisi(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Divisi</option>
            {uniqueDivisi.map((div) => (
              <option key={div} value={div}>
                {div}
              </option>
            ))}
          </select>

          {/* Tahun Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Tahun</option>
            {uniqueYears.map((y) => (
              <option key={y} value={y}>
                Tahun {y}
              </option>
            ))}
          </select>

          {/* Kategori Tier Filter */}
          <select
            value={selectedKategori}
            onChange={(e) => setSelectedKategori(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Predikat</option>
            <option value="Exemplary">Exemplary (95-100)</option>
            <option value="High Performer">High Performer (85-94)</option>
            <option value="Average">Average / On Track (70-84)</option>
            <option value="Needs Improvement">Needs Improvement (&lt; 70)</option>
          </select>

          {/* Status Publik Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Status Rilis</option>
            <option value="PUBLISHED">Publik Terbit</option>
            <option value="DRAFT">Draf Privat</option>
          </select>

          {/* Reset button if filtered */}
          {(searchQuery || selectedDivisi !== "ALL" || selectedYear !== "ALL" || selectedKategori !== "ALL" || selectedStatus !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedDivisi("ALL");
                setSelectedYear("ALL");
                setSelectedKategori("ALL");
                setSelectedStatus("ALL");
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
            >
              Reset Filter
            </button>
          )}

          <div className="ml-auto text-[11px] text-slate-400 font-medium">
            Menampilkan <strong className="text-slate-700">{filteredKpis.length}</strong> dari {kpis.length} catatan
          </div>
        </div>
      </div>

      {/* 4. Main View: Table OR Grid Mode */}
      {viewMode === "table" ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                  <th className="py-3.5 px-4">Staf Dinilai</th>
                  <th className="py-3.5 px-4">Periode</th>
                  <th className="py-3.5 px-4">Indikator Kinerja & Output</th>
                  <th className="py-3.5 px-4 text-center">Realisasi vs Target</th>
                  <th className="py-3.5 px-4 text-center">Bobot</th>
                  <th className="py-3.5 px-4 text-center">Skor & Predikat</th>
                  <th className="py-3.5 px-4 text-center">Status Publik</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredKpis.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center">
                      <div className="max-w-xs mx-auto space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                          <Target className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-slate-800 text-sm">Tidak ada evaluasi KPI ditemukan</p>
                        <p className="text-xs text-slate-400">
                          Cobalah sesuaikan kata kunci pencarian atau ubah kriteria filter di atas.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredKpis.map((k) => {
                    const user = getUser(k.user_id);
                    const isTop = k.skor >= 95;
                    const monthName = months.find((m) => m.num === k.bulan)?.name || `Bulan ${k.bulan}`;

                    return (
                      <tr key={k.id} className="hover:bg-slate-50/70 transition-colors group">
                        {/* Staf Dinilai */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 ${
                                  isTop ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-blue-100 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {user?.panggilan?.[0] || user?.nama_lengkap?.[0] || "U"}
                              </div>
                              {isTop && (
                                <div
                                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 text-amber-900 rounded-full flex items-center justify-center shadow-xs"
                                  title="Top Score Performer"
                                >
                                  <Star className="w-2 h-2" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                {user?.nama_lengkap || k.user_id}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {user?.divisi || "Divisi Operasional"} • {user?.jabatan || "Staf"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Periode */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <span className="font-medium text-slate-700">{monthName}</span>
                          <span className="block font-mono text-[10px] text-slate-400">{k.tahun}</span>
                        </td>

                        {/* Indikator & Target Output */}
                        <td className="py-3.5 px-4 max-w-sm">
                          <p className="font-bold text-slate-900 leading-snug text-xs">{k.indikator_kpi}</p>
                          <div className="mt-1 flex flex-col gap-0.5 text-[11px]">
                            <span className="text-slate-500">
                              Target: <span className="text-slate-700 font-medium">{k.target}</span>
                            </span>
                            <span className="text-slate-500">
                              Realisasi: <strong className="text-emerald-700">{k.realisasi}</strong>
                            </span>
                          </div>
                        </td>

                        {/* Visual Progress / Realisasi vs Target */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="w-28 mx-auto space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-slate-400">Pencapaian</span>
                              <span className="font-bold text-slate-800">{k.skor}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  k.skor >= 95
                                    ? "bg-amber-500"
                                    : k.skor >= 85
                                    ? "bg-emerald-500"
                                    : k.skor >= 70
                                    ? "bg-blue-500"
                                    : "bg-rose-500"
                                }`}
                                style={{ width: `${Math.min(100, k.skor)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Bobot */}
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-600">
                          {k.bobot_persen}%
                        </td>

                        {/* Skor & Predikat */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="space-y-1">
                            <span className="font-mono font-black text-sm text-slate-900">
                              {k.skor}
                            </span>
                            <div>{renderKategoriBadge(k.skor_kategori, k.skor)}</div>
                          </div>
                        </td>

                        {/* Status Publik Toggle */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleTogglePublish(k)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                              k.is_published
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                            }`}
                            title={k.is_published ? "Klik untuk tarik ke privat" : "Klik untuk publikasikan ke Dashboard"}
                          >
                            {k.is_published ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Publik Terbit</span>
                              </>
                            ) : (
                              <span>Draf Privat</span>
                            )}
                          </button>
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setPreviewKpi(k)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Lihat Pratinjau Rapor Resmi"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(k)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Evaluasi KPI"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteKpiClick(k)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Rapor KPI"
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
      ) : (
        /* Mode Grid / Kartu Rapor Staf */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKpis.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 p-8">
              <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">Tidak ada kartu rapor sesuai filter</p>
            </div>
          ) : (
            filteredKpis.map((k) => {
              const user = getUser(k.user_id);
              const isTop = k.skor >= 95;
              const monthName = months.find((m) => m.num === k.bulan)?.name || `Bulan ${k.bulan}`;

              return (
                <div
                  key={k.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isTop ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {user?.panggilan?.[0] || user?.nama_lengkap?.[0] || "U"}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs leading-snug">{user?.nama_lengkap}</h4>
                          <p className="text-[10px] text-slate-400">
                            {user?.divisi} • {monthName} {k.tahun}
                          </p>
                        </div>
                      </div>
                      {renderKategoriBadge(k.skor_kategori, k.skor)}
                    </div>

                    {/* Indikator */}
                    <div className="space-y-2 mb-4">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Indikator Kinerja
                        </span>
                        <p className="font-bold text-slate-800 text-xs leading-snug line-clamp-2">
                          {k.indikator_kpi}
                        </p>
                      </div>

                      <div className="p-2.5 bg-slate-50/80 rounded-xl space-y-1.5 text-[11px] border border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Target:</span>
                          <span className="font-medium text-slate-800 text-right">{k.target}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Realisasi:</span>
                          <span className="font-bold text-emerald-700 text-right">{k.realisasi}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Bobot */}
                    <div className="space-y-1 mb-4">
                      <div className="flex justify-between items-center text-[10px] font-semibold">
                        <span className="text-slate-500">Pencapaian (Bobot {k.bobot_persen}%)</span>
                        <span className="font-mono font-bold text-slate-900">{k.skor} / 100</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            k.skor >= 95
                              ? "bg-amber-500"
                              : k.skor >= 85
                              ? "bg-emerald-500"
                              : k.skor >= 70
                              ? "bg-blue-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(100, k.skor)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer / Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleTogglePublish(k)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                        k.is_published
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {k.is_published ? "Publik" : "Draf Privat"}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewKpi(k)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Lihat Pratinjau Rapor"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(k)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit KPI"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteKpiClick(k)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus KPI"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 5. Modal Pratinjau Lembar Rapor Resmi (Print & Review) */}
      {previewKpi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header Dokumen Rapor */}
            <div className="bg-slate-900 text-white p-6 relative">
              <button
                onClick={() => setPreviewKpi(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base tracking-tight">
                    Lembar Evaluasi Kinerja (KPI Report)
                  </h3>
                  <p className="text-xs text-slate-400">
                    {config.name || config.legalName} • Divisi Performance & Human Capital
                  </p>
                </div>
              </div>
            </div>

            {/* Isi Dokumen Rapor */}
            <div className="p-6 space-y-5 text-xs text-slate-700">
              {/* Profil Anggota Dinilai */}
              {(() => {
                const u = getUser(previewKpi.user_id);
                const monthName = months.find((m) => m.num === previewKpi.bulan)?.name || `Bulan ${previewKpi.bulan}`;
                return (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Nama Staf / Talenta
                      </span>
                      <p className="font-bold text-slate-900 text-sm">{u?.nama_lengkap || previewKpi.user_id}</p>
                      <p className="text-slate-500 text-[11px]">{u?.divisi || "Divisi Operasional"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Periode Penilaian
                      </span>
                      <p className="font-bold text-slate-900 text-sm">
                        {monthName} {previewKpi.tahun}
                      </p>
                      <p className="text-slate-500 text-[11px]">ID Dokumen: {previewKpi.id}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Matriks Indikator & Target */}
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Indikator Sasaran Kinerja Utama
                  </span>
                  <p className="font-bold text-slate-900 text-sm bg-blue-50/50 p-3 rounded-xl border border-blue-100 leading-snug">
                    {previewKpi.indikator_kpi}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Sasaran Target</span>
                    <p className="font-bold text-slate-800">{previewKpi.target}</p>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-semibold text-emerald-600 block mb-0.5">Realisasi Output</span>
                    <p className="font-bold text-emerald-800">{previewKpi.realisasi}</p>
                  </div>
                </div>
              </div>

              {/* Rekapitulasi Skor & Predikat */}
              <div className="p-4 bg-linear-to-r from-slate-900 to-indigo-950 text-white rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">
                    Predikat & Kategori Kinerja
                  </span>
                  <div className="mt-1">{renderKategoriBadge(previewKpi.skor_kategori, previewKpi.skor)}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">
                    Skor Evaluasi (Bobot {previewKpi.bobot_persen}%)
                  </span>
                  <span className="text-3xl font-black font-mono text-white tracking-tight">
                    {previewKpi.skor}
                    <span className="text-sm font-normal text-indigo-300">/100</span>
                  </span>
                </div>
              </div>

              {/* Status Rilis Banner */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
                <span className="text-slate-500">Status Transparansi Sistem:</span>
                <span className="font-bold text-slate-800">
                  {previewKpi.is_published
                    ? "✓ Ditayangkan Resmi di Dashboard Utama Publik"
                    : "🔒 Mode Draf Privat (Akses Internal Terbatas)"}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 py-2 px-3 text-slate-600 hover:text-slate-900 font-semibold text-xs rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar Rapor</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewKpi(null)}
                className="py-2 px-5 bg-slate-900 hover:bg-black text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add/Edit KPI Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between mb-4 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingKpi ? "Edit Penilaian KPI Anggota" : "Tambah Penilaian KPI Anggota"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingKpi
                    ? "Perbarui sasaran, pencapaian realisasi, atau bobot evaluasi kinerja."
                    : "Rilis rapor hasil kinerja yang akan otomatis tampil pada Leaderboard Dashboard Publik."}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingKpi(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKpi} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Pilih Anggota Tim</label>
                <select
                  value={formUserId}
                  onChange={(e) => setFormUserId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nama_lengkap} ({u.divisi})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bulan Evaluasi</label>
                  <select
                    value={formBulan}
                    onChange={(e) => setFormBulan(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Indikator Kinerja Utama (Key Indicator)</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Cloud Infrastructure Uptime & Zero Downtime Migration"
                  value={formIndikator}
                  onChange={(e) => setFormIndikator(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Sasaran Target</label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: 99.9% Uptime SLA"
                    value={formTarget}
                    onChange={(e) => setFormTarget(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Pencapaian Realisasi</label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: 99.98% Uptime tercapai"
                    value={formRealisasi}
                    onChange={(e) => setFormRealisasi(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Skor Evaluasi (0 - 100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formSkor}
                    onChange={(e) => setFormSkor(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bobot Persentase (%)</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={formBobot}
                    onChange={(e) => setFormBobot(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* Predikat Preview di Form */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">Kategori Otomatis:</span>
                <div>
                  {renderKategoriBadge(
                    formSkor >= 95 ? "Exemplary" : formSkor >= 85 ? "High Performer" : formSkor >= 70 ? "Average" : "Needs Improvement",
                    formSkor
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingKpi(null);
                  }}
                  className="py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 cursor-pointer active:scale-98 transition-all"
                >
                  {editingKpi ? "Simpan Perubahan" : "Simpan & Rilis ke Publik"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete KPI Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetKpi}
        title="Hapus Rapor Evaluasi KPI?"
        message={`Apakah Anda yakin ingin menghapus evaluasi kinerja "${deleteTargetKpi?.indikator_kpi}" untuk staf ${
          getUser(deleteTargetKpi?.user_id || "")?.nama_lengkap || "staf ini"
        }? Tindakan ini akan menghapus nilai KPI dari sistem secara permanen.`}
        confirmLabel="Ya, Hapus KPI"
        cancelLabel="Batal"
        type="danger"
        onConfirm={handleConfirmDeleteKpi}
        onCancel={() => setDeleteTargetKpi(null)}
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
