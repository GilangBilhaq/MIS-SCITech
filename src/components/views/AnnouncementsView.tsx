"use client";

import React, { useState, useMemo } from "react";
import {
  Megaphone,
  Plus,
  Calendar,
  Share2,
  Trash2,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  Eye,
  Edit3,
  X,
  AlertTriangle,
  Info,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  Printer,
  FileText,
  Clock,
  Radio,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { Announcement } from "@/types";
import { TenantConfig } from "@/config/tenant.config";
import { StorageService } from "@/lib/storage";
import { ApiClient } from "@/lib/apiClient";
import { Toast } from "@/components/ui/Toast";

interface AnnouncementsViewProps {
  config: TenantConfig;
  announcements: Announcement[];
  onRefresh: () => void;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({ config, announcements, onRefresh }) => {
  // Modal & Preview States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [previewMemo, setPreviewMemo] = useState<Announcement | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Announcement | null>(null);

  // Notifications
  const [toastNotif, setToastNotif] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Search, Filter & View Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrioritas, setSelectedPrioritas] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Form Fields
  const [formJudul, setFormJudul] = useState("");
  const [formIsi, setFormIsi] = useState("");
  const [formPrioritas, setFormPrioritas] = useState<"Penting" | "Info">("Penting");
  const [formIsPublished, setFormIsPublished] = useState(true);

  // Executive Metrics Calculations
  const metrics = useMemo(() => {
    const total = announcements.length;
    const activeBanner = announcements.find((a) => a.is_published);
    const publishedCount = announcements.filter((a) => a.is_published).length;
    const draftCount = total - publishedCount;
    const pentingCount = announcements.filter((a) => a.prioritas === "Penting").length;
    const infoCount = announcements.filter((a) => a.prioritas === "Info").length;

    return {
      total,
      activeBanner,
      publishedCount,
      draftCount,
      pentingCount,
      infoCount,
    };
  }, [announcements]);

  // Filtered List
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      const matchesSearch =
        searchQuery === "" ||
        ann.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ann.isi_pengumuman.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPrioritas =
        selectedPrioritas === "ALL" || ann.prioritas === selectedPrioritas;

      const matchesStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "PUBLISHED" && ann.is_published) ||
        (selectedStatus === "DRAFT" && !ann.is_published);

      return matchesSearch && matchesPrioritas && matchesStatus;
    });
  }, [announcements, searchQuery, selectedPrioritas, selectedStatus]);

  // Handle Form Open (Add or Edit)
  const handleOpenAdd = () => {
    setEditingAnn(null);
    setFormJudul("");
    setFormIsi("");
    setFormPrioritas("Penting");
    setFormIsPublished(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ann: Announcement) => {
    setEditingAnn(ann);
    setFormJudul(ann.judul);
    setFormIsi(ann.isi_pengumuman);
    setFormPrioritas(ann.prioritas);
    setFormIsPublished(ann.is_published);
    setIsModalOpen(true);
  };

  // Submit Add or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formJudul.trim() || !formIsi.trim()) {
      setToastNotif({
        type: "error",
        message: "Judul dan isi pengumuman wajib diisi.",
      });
      return;
    }

    const payload = {
      company_id: config.id,
      judul: formJudul.trim(),
      isi_pengumuman: formIsi.trim(),
      prioritas: formPrioritas,
      is_published: formIsPublished,
    };

    try {
      if (editingAnn) {
        // Update local storage
        StorageService.updateAnnouncement(editingAnn.id, payload);
        // Toggle publish via API if status changed
        if (editingAnn.is_published !== formIsPublished) {
          try {
            await ApiClient.toggleAnnouncementPublish(editingAnn.id, formIsPublished);
          } catch {
            // Fallback handled by storage
          }
        }
      } else {
        try {
          await ApiClient.createAnnouncement(payload);
        } catch {
          StorageService.addAnnouncement({
            ...payload,
            tanggal_terbit: new Date().toISOString(),
          });
        }
      }
    } catch {
      setToastNotif({
        type: "error",
        message: "Terjadi kendala saat menyimpan siaran pengumuman.",
      });
      return;
    }

    setIsModalOpen(false);
    setToastNotif({
      type: "success",
      message: editingAnn
        ? `Siaran pengumuman "${formJudul}" berhasil diperbarui!`
        : formIsPublished
        ? `Pengumuman "${formJudul}" berhasil diterbitkan ke Top Banner Dashboard!`
        : `Pengumuman "${formJudul}" berhasil disimpan sebagai draf internal.`,
    });
    setEditingAnn(null);
    onRefresh();
  };

  // Toggle publish state
  const handleTogglePublish = async (ann: Announcement) => {
    const nextState = !ann.is_published;
    try {
      await ApiClient.toggleAnnouncementPublish(ann.id, nextState);
    } catch {
      StorageService.updateAnnouncement(ann.id, { is_published: nextState });
    }

    setToastNotif({
      type: nextState ? "success" : "info",
      message: nextState
        ? `Pengumuman "${ann.judul}" sekarang aktif ditayangkan pada Top Banner!`
        : `Pengumuman "${ann.judul}" ditarik dari Top Banner (status draf).`,
    });
    onRefresh();
  };

  // Confirm delete action
  const confirmDelete = async () => {
    if (!deleteCandidate) return;

    try {
      await ApiClient.deleteAnnouncement(deleteCandidate.id);
    } catch {
      StorageService.deleteAnnouncement(deleteCandidate.id);
    }

    setToastNotif({
      type: "success",
      message: `Catatan pengumuman "${deleteCandidate.judul}" berhasil dihapus.`,
    });
    setDeleteCandidate(null);
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Halaman */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Informasi & Pengumuman</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pusat Siaran Komunikasi Internal, Arahan Eksekutif, & Top Banner Dashboard Utama
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 py-2 px-4 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengumuman Baru</span>
        </button>
      </div>

      {/* 2. Executive Broadcast Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Siaran Aktif Saat Ini */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1 max-w-[75%]">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              Siaran Top Banner
            </span>
            <div className="text-sm font-bold text-slate-900 truncate">
              {metrics.activeBanner ? metrics.activeBanner.judul : "Tidak Ada Siaran"}
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {metrics.activeBanner
                ? `Prioritas: ${metrics.activeBanner.prioritas}`
                : "Semua pengumuman berstatus draf"}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Pengumuman Urgen / Penting */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              Arahan Penting
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600 tracking-tight font-mono">
                {metrics.pentingCount}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">siaran</span>
            </div>
            <p className="text-[10px] text-slate-500">
              {metrics.infoCount} siaran berkategori info umum
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Status Publikasi */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              Status Publikasi
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 tracking-tight font-mono">
                {metrics.publishedCount}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">aktif rilis</span>
            </div>
            <p className="text-[10px] text-slate-500">
              {metrics.draftCount} tersimpan dalam draf
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total Arsip Siaran */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Arsip Siaran
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {metrics.total}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">total memo</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Tercatat pada database korporat
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Toolbar Pencarian & Filter */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Cari pengumuman berdasarkan judul, agenda, atau arahan memo..."
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
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "cards" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kartu Siaran</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel Ringkas</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Filter Prioritas */}
          <select
            value={selectedPrioritas}
            onChange={(e) => setSelectedPrioritas(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Prioritas</option>
            <option value="Penting">🚨 Penting / Urgen</option>
            <option value="Info">ℹ Informasi Umum</option>
          </select>

          {/* Filter Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Status Rilis</option>
            <option value="PUBLISHED">Aktif Rilis di Banner</option>
            <option value="DRAFT">Draf Privat Internal</option>
          </select>

          {/* Reset button if filtered */}
          {(searchQuery || selectedPrioritas !== "ALL" || selectedStatus !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedPrioritas("ALL");
                setSelectedStatus("ALL");
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
            >
              Reset Filter
            </button>
          )}

          <div className="ml-auto text-[11px] text-slate-400 font-medium">
            Menampilkan <strong className="text-slate-700">{filteredAnnouncements.length}</strong> dari {announcements.length} siaran
          </div>
        </div>
      </div>

      {/* 4. Main View: Cards OR Table Mode */}
      {viewMode === "cards" ? (
        <div className="space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Megaphone className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Tidak ada siaran pengumuman ditemukan</h4>
              <p className="text-xs text-slate-400 mt-1">
                Cobalah atur ulang kriteria pencarian atau buat pengumuman baru.
              </p>
            </div>
          ) : (
            filteredAnnouncements.map((ann) => {
              const isPenting = ann.prioritas === "Penting";
              const formattedDate = new Date(ann.tanggal_terbit).toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              });

              return (
                <div
                  key={ann.id}
                  className={`bg-white rounded-2xl border p-5.5 shadow-xs transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative overflow-hidden group hover:shadow-md ${
                    ann.is_published
                      ? "border-blue-300 ring-2 ring-blue-100/70"
                      : "border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  {/* Left Accent Bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      ann.is_published
                        ? isPenting
                          ? "bg-rose-500"
                          : "bg-blue-600"
                        : "bg-slate-300"
                    }`}
                  />

                  {/* Body Info */}
                  <div className="flex items-start gap-4 pl-1 flex-1">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                        ann.is_published
                          ? isPenting
                            ? "bg-rose-600 text-white shadow-rose-500/20"
                            : "bg-blue-600 text-white shadow-blue-500/20"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Megaphone className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Priority Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                            isPenting
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {isPenting ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Penting</span>
                            </>
                          ) : (
                            <>
                              <Info className="w-3 h-3 text-blue-600" />
                              <span>Informasi</span>
                            </>
                          )}
                        </span>

                        {/* Tanggal */}
                        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formattedDate}
                        </span>

                        {/* Status Publikasi */}
                        {ann.is_published ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Tayang di Top Banner
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                            Draf Privat
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-base leading-snug">{ann.judul}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 max-w-3xl">
                        {ann.isi_pengumuman}
                      </p>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 w-full lg:w-auto justify-end">
                    <button
                      onClick={() => setPreviewMemo(ann)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                      title="Lihat Pratinjau Memo Resmi"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenEdit(ann)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                      title="Edit Pengumuman"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleTogglePublish(ann)}
                      className={`py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        ann.is_published
                          ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                      }`}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{ann.is_published ? "Tayang Aktif" : "Publikasikan"}</span>
                    </button>

                    <button
                      onClick={() => setDeleteCandidate(ann)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Hapus Pengumuman"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Mode Tabel Ringkas */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                  <th className="py-3.5 px-4">Prioritas</th>
                  <th className="py-3.5 px-4">Judul & Ringkasan</th>
                  <th className="py-3.5 px-4">Tanggal Rilis</th>
                  <th className="py-3.5 px-4 text-center">Status Tayang</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAnnouncements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Tidak ada siaran pengumuman sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredAnnouncements.map((ann) => (
                    <tr key={ann.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ann.prioritas === "Penting"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {ann.prioritas}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-md">
                        <p className="font-bold text-slate-900 leading-snug">{ann.judul}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{ann.isi_pengumuman}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                        {new Date(ann.tanggal_terbit).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePublish(ann)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            ann.is_published
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {ann.is_published ? "Aktif di Banner" : "Draf Privat"}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPreviewMemo(ann)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Pratinjau Memo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(ann)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteCandidate(ann)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Modal Buat / Edit Pengumuman (Dengan Live Mockup Banner Preview) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-5 sm:p-6 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-start justify-between mb-4 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingAnn ? "Edit Siaran Pengumuman" : "Buat Siaran Pengumuman Baru"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publikasikan informasi resmi, arahan manajemen, atau peringatan operasional.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingAnn(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Judul Pengumuman</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: All-Hands Meeting Q3 2026 & Evaluasi Milestone..."
                  value={formJudul}
                  onChange={(e) => setFormJudul(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Prioritas Siaran</label>
                  <select
                    value={formPrioritas}
                    onChange={(e) => setFormPrioritas(e.target.value as "Penting" | "Info")}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Penting">🚨 Penting (Pemberitahuan Wajib)</option>
                    <option value="Info">ℹ Info (Informasi Umum)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Status Publikasi Awal</label>
                  <select
                    value={formIsPublished ? "TRUE" : "FALSE"}
                    onChange={(e) => setFormIsPublished(e.target.value === "TRUE")}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="TRUE">Tayangkan ke Top Banner</option>
                    <option value="FALSE">Simpan sebagai Draf Privat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Isi Lengkap Pengumuman</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tuliskan arahan, instruksi teknis, agenda rapat, atau pengumuman resmi di sini..."
                  value={formIsi}
                  onChange={(e) => setFormIsi(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed"
                />
              </div>

              {/* Live Preview Banner Mockup */}
              <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Simulasi Tampilan Top Banner (Live Preview)
                </span>
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                    formPrioritas === "Penting"
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : "bg-blue-50 border-blue-200 text-blue-900"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${
                        formPrioritas === "Penting" ? "bg-rose-600 text-white" : "bg-blue-600 text-white"
                      }`}
                    >
                      {formPrioritas}
                    </span>
                    <strong className="truncate font-bold">
                      {formJudul || "Judul Pengumuman Preview"}
                    </strong>
                    <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                      — {formIsi || "Isi pengumuman singkat akan terlihat di sini..."}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold underline shrink-0 cursor-pointer">
                    Baca Detail
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingAnn(null);
                  }}
                  className="py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 cursor-pointer active:scale-98 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{editingAnn ? "Simpan Perubahan" : "Simpan & Terbitkan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Pratinjau Memo Resmi (Official Memo View) */}
      {previewMemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header Memo */}
            <div className="bg-slate-900 text-white p-6 relative">
              <button
                onClick={() => setPreviewMemo(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base tracking-tight">
                    Official Corporate Memo
                  </h3>
                  <p className="text-xs text-slate-400">
                    {config.name || config.legalName} • Departemen Komunikasi Perusahaan
                  </p>
                </div>
              </div>
            </div>

            {/* Konten Memo */}
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nomor Rilis
                  </span>
                  <p className="font-mono font-bold text-slate-900">{previewMemo.id}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tanggal Efektif
                  </span>
                  <p className="font-bold text-slate-900">
                    {new Date(previewMemo.tanggal_terbit).toLocaleDateString("id-ID", {
                      dateStyle: "long",
                    })}
                  </p>
                </div>
              </div>

              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase mb-2 ${
                    previewMemo.prioritas === "Penting"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  Prioritas: {previewMemo.prioritas}
                </span>
                <h4 className="text-base font-black text-slate-900 leading-snug">
                  {previewMemo.judul}
                </h4>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 leading-relaxed text-slate-800 text-xs whitespace-pre-line">
                {previewMemo.isi_pengumuman}
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900 flex items-center justify-between">
                <span>Status Siaran:</span>
                <strong className="font-semibold">
                  {previewMemo.is_published
                    ? "✓ Aktif Tayang di Top Banner Dashboard Publik"
                    : "🔒 Draf Privat Internal"}
                </strong>
              </div>
            </div>

            {/* Footer Memo */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 py-2 px-3 text-slate-600 hover:text-slate-900 font-semibold text-xs rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Salinan Memo</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewMemo(null)}
                className="py-2 px-5 bg-slate-900 hover:bg-black text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Tutup Memo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Dialog Konfirmasi Hapus Custom */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-6 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 text-base mb-1">Hapus Siaran Pengumuman?</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Pengumuman <strong>&quot;{deleteCandidate.judul}&quot;</strong> akan dihapus permanen dari sistem dan banner dashboard utama.
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="py-2.5 px-4 text-slate-600 hover:text-slate-900 font-semibold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="py-2.5 px-5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-500/20 cursor-pointer transition-all"
              >
                Ya, Hapus Siaran
              </button>
            </div>
          </div>
        </div>
      )}

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
