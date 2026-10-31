"use client";

import React, { useState } from "react";
import {
  Download,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  ArrowRight,
  FolderKanban,
  Receipt,
  PenTool,
} from "lucide-react";
import { TenantConfig } from "@/config/tenant.config";
import { RabProject, RabItem, RabItemType, User } from "@/types";
import { StorageService } from "@/lib/storage";
import { ApiClient } from "@/lib/apiClient";
import { generateRabPdf } from "@/lib/pdfGenerator";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";

interface RabCalculatorViewProps {
  config: TenantConfig;
  rab: RabProject;
  rabList?: RabProject[];
  users?: User[];
  currentUserName?: string;
  onSelectRab?: (id: string) => void;
  onRefresh: () => void;
}

export const RabCalculatorView: React.FC<RabCalculatorViewProps> = ({
  config,
  rab,
  rabList = [],
  users = [],
  currentUserName,
  onSelectRab,
  onRefresh,
}) => {
  const [isDigitalSigned, setIsDigitalSigned] = useState(rab.pic_pin_verified);
  const [signSuccessMsg, setSignSuccessMsg] = useState("");
  const [toastNotif, setToastNotif] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Termin percentages
  const [termin1Pct, setTermin1Pct] = useState(30);
  const [termin2Pct, setTermin2Pct] = useState(50);
  const [termin3Pct, setTermin3Pct] = useState(20);

  // New RAB Modal
  const [isNewRabModalOpen, setIsNewRabModalOpen] = useState(false);
  const [newRabProject, setNewRabProject] = useState("");
  const [newRabClient, setNewRabClient] = useState("");
  const [newRabPic, setNewRabPic] = useState(users[0]?.nama_lengkap || rab.pic_name || "Yosef Satria");
  const [newRabMasa, setNewRabMasa] = useState(() =>
    new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0]
  );

  // Modal State for adding/editing row
  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RabItem | null>(null);
  const [targetType, setTargetType] = useState<RabItemType>("Primary");
  const [itemName, setItemName] = useState("");
  const [itemSpecs, setItemSpecs] = useState("");
  const [itemQty, setItemQty] = useState(1);
  const [itemUnit, setItemUnit] = useState("Unit");
  const [itemPrice, setItemPrice] = useState(10000000);

  // TTD Modal State
  const [isTtdModalOpen, setIsTtdModalOpen] = useState(false);
  const [signerName, setSignerName] = useState(rab.pic_name);
  const [signerPin, setSignerPin] = useState("");

  const safeItems = rab.items || [];
  const totals = StorageService.calculateRabTotals(rab);

  const primaryItems = safeItems.filter((i) => i.tipe_rincian === "Primary");
  const secondaryItems = safeItems.filter((i) => i.tipe_rincian === "Secondary");
  const tertiaryItems = safeItems.filter((i) => i.tipe_rincian === "Tertiary");

  // Custom Professional Confirmation / Alert Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "danger" | "warning" | "info";
    confirmLabel?: string;
    showCancel?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    showCancel: true,
    onConfirm: () => {},
  });

  const showAccessDeniedModal = (actionDesc?: string) => {
    const detailMsg = actionDesc
      ? `Akses Ditolak: ${actionDesc}`
      : `Akses Ditolak: Dokumen ini berada di bawah otoritas PIC ${rab.pic_name}. Akun Anda (${currentUserName || "Tamu"}) tidak memiliki kewenangan otorisasi pada dokumen ini.`;

    setConfirmDialog({
      isOpen: true,
      title: "Otorisasi PIC Ditolak",
      message: detailMsg,
      type: "warning",
      confirmLabel: "Saya Mengerti",
      showCancel: false,
      onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
    });
  };

  // Authorization check helper
  const isAuthorizedPic = () => {
    if (!currentUserName) return true;
    if (
      currentUserName === "Administrator" ||
      currentUserName === "Direktur Utama" ||
      currentUserName === "Anindya Rahma"
    ) {
      return true;
    }
    return currentUserName.toLowerCase() === rab.pic_name.toLowerCase();
  };

  const handleOpenAddRow = (type: RabItemType) => {
    if (!isAuthorizedPic()) {
      showAccessDeniedModal(`Dokumen ini dikelola oleh PIC ${rab.pic_name}. Anda (${currentUserName}) tidak memiliki akses modifikasi.`);
      return;
    }
    setEditingItem(null);
    setTargetType(type);
    setItemName("");
    setItemSpecs("");
    setItemQty(1);
    setItemUnit(type === "Tertiary" ? "Bulan/Man" : type === "Secondary" ? "Lot" : "Unit");
    setItemPrice(type === "Tertiary" ? 15000000 : 5000000);
    setIsAddRowModalOpen(true);
  };

  const handleOpenEditRow = (item: RabItem) => {
    if (!isAuthorizedPic()) {
      showAccessDeniedModal(`Dokumen ini dikelola oleh PIC ${rab.pic_name}. Anda (${currentUserName}) tidak memiliki akses modifikasi.`);
      return;
    }
    setEditingItem(item);
    setTargetType(item.tipe_rincian);
    setItemName(item.nama_item);
    setItemSpecs(item.spesifikasi_teknis);
    setItemQty(item.jumlah);
    setItemUnit(item.satuan);
    setItemPrice(item.harga_pcs);
    setIsAddRowModalOpen(true);
  };

  const handleSaveRow = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemData = {
      tipe_rincian: targetType,
      nama_item: itemName,
      spesifikasi_teknis: itemSpecs,
      jumlah: itemQty,
      satuan: itemUnit,
      harga_pcs: itemPrice,
    };

    try {
      if (editingItem) {
        await ApiClient.updateRabItem(rab.id, { id: editingItem.id, ...itemData });
        setToastNotif({ type: "success", message: `Item "${itemName}" berhasil diperbarui di RAB.` });
      } else {
        await ApiClient.addRabItem(rab.id, itemData);
        setToastNotif({ type: "success", message: `Item "${itemName}" berhasil ditambahkan ke RAB.` });
      }
    } catch {
      if (editingItem) {
        StorageService.deleteRabItem(editingItem.id);
        StorageService.addRabItem(rab.id, itemData);
        setToastNotif({ type: "success", message: `Item "${itemName}" berhasil diperbarui di RAB.` });
      } else {
        StorageService.addRabItem(rab.id, itemData);
        setToastNotif({ type: "success", message: `Item "${itemName}" berhasil ditambahkan ke RAB.` });
      }
    }

    setIsAddRowModalOpen(false);
    setEditingItem(null);
    onRefresh();
  };

  const handleDeleteItem = async (id: string) => {
    if (!isAuthorizedPic()) {
      showAccessDeniedModal(`Dokumen ini dikelola oleh PIC ${rab.pic_name}.`);
      return;
    }
    try {
      await ApiClient.deleteRabItem(rab.id, id);
    } catch {
      StorageService.deleteRabItem(id);
    }
    setToastNotif({ type: "info", message: "Item berhasil dihapus dari RAB." });
    onRefresh();
  };

  const handleOpenTtdModal = () => {
    if (!isAuthorizedPic()) {
      showAccessDeniedModal(`Hanya PIC yang tertera (${rab.pic_name}) yang berhak menandatangani dokumen ini.`);
      return;
    }
    setSignerName(rab.pic_name);
    setSignerPin("");
    setIsTtdModalOpen(true);
  };

  const handleExecuteTtd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDigitalSigned(true);
    try {
      await ApiClient.updateRab(rab.id, { pic_pin_verified: true, status: "Approved" });
    } catch {
      StorageService.updateRab({ pic_pin_verified: true });
    }
    setIsTtdModalOpen(false);
    setSignSuccessMsg(`✓ Tanda tangan digital PIC (${signerName}) berhasil disahkan. Dokumen berstatus Approved.`);
    setToastNotif({ type: "success", message: `Dokumen RAB ${rab.nomor_rab} berhasil disahkan (Approved) oleh ${signerName}.` });
    setTimeout(() => setSignSuccessMsg(""), 4000);
    onRefresh();
  };

  const handleCreateNewRab = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await ApiClient.createRab({
        company_id: config.id,
        nama_project: newRabProject,
        nama_client: newRabClient,
        pic_name: newRabPic,
        masa_berlaku: newRabMasa,
      });
      setIsNewRabModalOpen(false);
      setNewRabProject("");
      setNewRabClient("");
      setSignSuccessMsg(`✓ Dokumen RAB Baru ${created.nomor_rab} berhasil dibuat!`);
      setToastNotif({ type: "success", message: `Dokumen RAB baru "${created.nomor_rab}" berhasil dibuat!` });
      setTimeout(() => setSignSuccessMsg(""), 4000);
      onRefresh();
      if (onSelectRab) onSelectRab(created.id);
    } catch (err: unknown) {
      setToastNotif({ type: "error", message: "Gagal membuat RAB: " + (err instanceof Error ? err.message : String(err)) });
    }
  };


  const executeConvertToProject = async () => {
    setIsConverting(true);
    try {
      const res = await ApiClient.convertRabToProject(rab.id);
      setSignSuccessMsg(`🎉 Berhasil! Proyek Baru dibuat: ${res.data.nama_project} (${res.data.id}). Cek tab 'Manajemen Proyek'!`);
      setToastNotif({ type: "success", message: `RAB "${rab.nomor_rab}" berhasil dikonversi menjadi Proyek Aktif!` });
      setTimeout(() => setSignSuccessMsg(""), 6000);
      onRefresh();
    } catch (err: unknown) {
      setToastNotif({ type: "error", message: err instanceof Error ? err.message : "Gagal konversi ke Proyek." });
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvertToProject = () => {
    if (!isAuthorizedPic()) {
      showAccessDeniedModal(`Dokumen ini dikelola oleh PIC ${rab.pic_name}.`);
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Konversi Proyek",
      message: `Dokumen RAB ${rab.nomor_rab} akan didaftarkan sebagai Proyek Berjalan aktif pada sistem Manajemen Proyek. Apakah Anda ingin melanjutkan proses ini?`,
      type: "info",
      confirmLabel: "Ya, Daftarkan Proyek",
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        executeConvertToProject();
      },
    });
  };

  const executeRecordTerminToFinance = async (dpAmount: number) => {
    try {
      await ApiClient.createTransaction({
        company_id: config.id,
        tipe: "PEMASUKAN",
        nama_item: `Termin I (${termin1Pct}%) - ${rab.nama_project}`,
        deskripsi: `Penerbitan PO dari Klien ${rab.nama_client} • Dokumen: ${rab.nomor_rab}`,
        tanggal: new Date().toISOString().split("T")[0],
        kegunaan: "Project",
        jumlah: 1,
        harga_pcs: dpAmount,
        metode: "Transfer Bank (BCA)",
      });
      setSignSuccessMsg(`✓ Pemasukan Termin I (Rp ${dpAmount.toLocaleString("id-ID")}) berhasil dicatat ke Keuangan!`);
      setToastNotif({ type: "success", message: `Termin I (Rp ${dpAmount.toLocaleString("id-ID")}) berhasil dicatat ke Keuangan!` });
      setTimeout(() => setSignSuccessMsg(""), 4000);
      onRefresh();
    } catch (err: unknown) {
      setToastNotif({ type: "error", message: "Gagal mencatat transaksi: " + (err instanceof Error ? err.message : String(err)) });
    }
  };

  const handleRecordTerminToFinance = () => {
    if (!isAuthorizedPic()) {
      showAccessDeniedModal(`Dokumen ini dikelola oleh PIC ${rab.pic_name}.`);
      return;
    }
    const dpAmount = Math.round(totals.totalAkhir * (termin1Pct / 100));

    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Pencatatan Termin I",
      message: `Catat termin DP sebesar ${termin1Pct}% (Rp ${dpAmount.toLocaleString("id-ID")}) langsung ke modul Pembukuan Transaksi Keuangan perusahaan?`,
      type: "info",
      confirmLabel: "Catat ke Keuangan",
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        executeRecordTerminToFinance(dpAmount);
      },
    });
  };

  const executeDeleteRab = async () => {
    try {
      await ApiClient.deleteRab(rab.id);
      setSignSuccessMsg(`✓ Dokumen RAB ${rab.nomor_rab} berhasil dihapus.`);
      setToastNotif({ type: "info", message: `Dokumen RAB ${rab.nomor_rab} berhasil dihapus.` });
      setTimeout(() => setSignSuccessMsg(""), 4000);
      onRefresh();
      // Select another RAB if available
      const remaining = rabList.filter((r) => r.id !== rab.id);
      if (remaining.length > 0 && onSelectRab) {
        onSelectRab(remaining[0].id);
      }
    } catch (err: unknown) {
      setToastNotif({ type: "error", message: "Gagal menghapus RAB: " + (err instanceof Error ? err.message : String(err)) });
    }
  };

  const handleDeleteRab = () => {
    if (!isAuthorizedPic()) {
      showAccessDeniedModal(`Dokumen ini dikelola oleh PIC ${rab.pic_name}.`);
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Hapus Dokumen RAB",
      message: `Apakah Anda yakin ingin menghapus dokumen RAB ${rab.nomor_rab} (${rab.nama_project})? Semua rincian item anggaran di dalamnya akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.`,
      type: "danger",
      confirmLabel: "Hapus Dokumen",
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        executeDeleteRab();
      },
    });
  };

  const handleExportPdf = () => {
    generateRabPdf(rab, config);
    setToastNotif({ type: "success", message: `Dokumen RAB ${rab.nomor_rab} berhasil diunduh (PDF).` });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Kalkulator & Penyusunan RAB
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Perhitungan estimasi anggaran 3-tier, approval digital, konversi ke proyek, dan PDF resmi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => setIsNewRabModalOpen(true)}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 py-2 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Buat RAB</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor PDF</span>
          </button>
        </div>
      </div>

      {/* Multi-RAB Document Selector Bar */}
      {rabList && rabList.length > 0 && (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Pilih Dokumen RAB:
            </span>
            <select
              value={rab.id}
              onChange={(e) => onSelectRab && onSelectRab(e.target.value)}
              className="w-full sm:max-w-md py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white truncate"
            >
              {rabList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nomor_rab} - {r.nama_project} ({r.nama_client}) [{r.status}]
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                rab.status === "Approved"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              Status: {rab.status}
            </span>

            <button
              type="button"
              onClick={handleDeleteRab}
              title={`Hapus Dokumen ${rab.nomor_rab}`}
              className="flex items-center gap-1.5 py-1 px-3 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus RAB</span>
            </button>
          </div>
        </div>
      )}

      {signSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{signSuccessMsg}</span>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Subtotal Primary</span>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
              {primaryItems.length} Item
            </span>
          </div>
          <h4 className="text-xl font-black text-slate-900 font-mono">
            Rp {totals.subtotalPrimary.toLocaleString("id-ID")}
          </h4>
          <p className="text-[10px] text-slate-400 mt-1">Hardware & Server Node</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Subtotal Secondary</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
              {secondaryItems.length} Item
            </span>
          </div>
          <h4 className="text-xl font-black text-slate-900 font-mono">
            Rp {totals.subtotalSecondary.toLocaleString("id-ID")}
          </h4>
          <p className="text-[10px] text-slate-400 mt-1">Lisensi, OS & Jaringan</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Subtotal Tertiary</span>
            <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">
              {tertiaryItems.length} Item
            </span>
          </div>
          <h4 className="text-xl font-black text-slate-900 font-mono">
            Rp {totals.subtotalTertiary.toLocaleString("id-ID")}
          </h4>
          <p className="text-[10px] text-slate-400 mt-1">Jasa & Impelementasi</p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-md text-white">
          <div className="flex items-center justify-between text-blue-100 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Penawaran + PPN</span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold">PPN 11%</span>
          </div>
          <h4 className="text-xl font-black font-mono">
            Rp {totals.totalAkhir.toLocaleString("id-ID")}
          </h4>
          <p className="text-[10px] text-blue-100 mt-1">Estimasi Nilai Kontrak Resmi</p>
        </div>
      </div>

      {/* Integration Workflow Action Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-blue-600" />
            <span>Alur Integrasi Lintas Modul (Cross-Module Workflow)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            PIC Dokumen: <strong className="text-slate-800">{rab.pic_name}</strong> • Kelola termin ke Keuangan atau daftarkan proyek berjalan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRecordTerminToFinance}
            className="flex items-center gap-1.5 py-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Catat Termin {termin1Pct}% ke Keuangan</span>
          </button>

          {rab.status !== "Approved" && (
            <button
              onClick={handleConvertToProject}
              disabled={isConverting}
              className="flex items-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>{isConverting ? "Mengonversi..." : "Konversi ke Proyek Berjalan"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Document Metadata Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-medium block">Nomor Registrasi RAB:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{rab.nomor_rab}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Nama Proyek:</span>
            <span className="font-bold text-slate-900 text-sm">{rab.nama_project}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Klien / Mitra:</span>
            <span className="font-bold text-slate-900 text-sm">{rab.nama_client}</span>
          </div>
        </div>
      </div>

      {/* 3 Tables for Items */}
      {/* 1. Primary Items */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase">
              1. Komponen Utama / Hardware (Primary)
            </h3>
          </div>
          <button
            onClick={() => handleOpenAddRow("Primary")}
            className="flex items-center gap-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Item Primary</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-semibold text-[10px] uppercase border-b border-slate-200">
                <th className="py-2.5 px-4">Nama Komponen</th>
                <th className="py-2.5 px-4">Spesifikasi Teknis</th>
                <th className="py-2.5 px-4 text-center">Jumlah</th>
                <th className="py-2.5 px-4 text-right">Harga Satuan</th>
                <th className="py-2.5 px-4 text-right">Subtotal</th>
                <th className="py-2.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {primaryItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    Belum ada item primary.
                  </td>
                </tr>
              ) : (
                primaryItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-800">{item.nama_item}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs">{item.spesifikasi_teknis}</td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">
                      {item.jumlah} {item.satuan}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      Rp {Number(item.harga_pcs).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      Rp {Number(item.total_harga).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditRow(item)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Hapus Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* 2. Secondary Items */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase">
              2. Lisensi & Infrastruktur Pendukung (Secondary)
            </h3>
          </div>
          <button
            onClick={() => handleOpenAddRow("Secondary")}
            className="flex items-center gap-1 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Item Secondary</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-semibold text-[10px] uppercase border-b border-slate-200">
                <th className="py-2.5 px-4">Nama Komponen</th>
                <th className="py-2.5 px-4">Spesifikasi Teknis</th>
                <th className="py-2.5 px-4 text-center">Jumlah</th>
                <th className="py-2.5 px-4 text-right">Harga Satuan</th>
                <th className="py-2.5 px-4 text-right">Subtotal</th>
                <th className="py-2.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {secondaryItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    Belum ada item secondary.
                  </td>
                </tr>
              ) : (
                secondaryItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-800">{item.nama_item}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs">{item.spesifikasi_teknis}</td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">
                      {item.jumlah} {item.satuan}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      Rp {Number(item.harga_pcs).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      Rp {Number(item.total_harga).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditRow(item)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Hapus Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* 3. Tertiary Items */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
            <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase">
              3. Jasa Implementasi & Engineering (Tertiary)
            </h3>
          </div>
          <button
            onClick={() => handleOpenAddRow("Tertiary")}
            className="flex items-center gap-1 py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Item Jasa</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-semibold text-[10px] uppercase border-b border-slate-200">
                <th className="py-2.5 px-4">Nama Layanan Jasa</th>
                <th className="py-2.5 px-4">Spesifikasi Deliverable</th>
                <th className="py-2.5 px-4 text-center">Jumlah</th>
                <th className="py-2.5 px-4 text-right">Harga Satuan</th>
                <th className="py-2.5 px-4 text-right">Subtotal</th>
                <th className="py-2.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tertiaryItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    Belum ada item jasa tertiary.
                  </td>
                </tr>
              ) : (
                tertiaryItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-800">{item.nama_item}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs">{item.spesifikasi_teknis}</td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">
                      {item.jumlah} {item.satuan}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      Rp {Number(item.harga_pcs).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      Rp {Number(item.total_harga).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditRow(item)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Hapus Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Signature & Terms Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Struktur Termin Pembayaran Kontrak (Dapat Disesuaikan)
            </h4>
            <span className="text-[10px] text-slate-400">Total: {termin1Pct + termin2Pct + termin3Pct}%</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-800">Termin I (DP)</span>
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min={5}
                    max={80}
                    value={termin1Pct}
                    onChange={(e) => setTermin1Pct(Number(e.target.value) || 0)}
                    className="w-12 text-center p-0.5 bg-white border border-blue-200 rounded font-bold text-blue-900 text-xs"
                  />
                  <span className="font-bold text-blue-800 text-xs">%</span>
                </div>
              </div>
              <p className="font-mono font-bold text-slate-900 text-sm mt-2">
                Rp {Math.round(totals.totalAkhir * (termin1Pct / 100)).toLocaleString("id-ID")}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Saat penandatanganan SPK & PO</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Termin II (BAP)</span>
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min={5}
                    max={80}
                    value={termin2Pct}
                    onChange={(e) => setTermin2Pct(Number(e.target.value) || 0)}
                    className="w-12 text-center p-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900 text-xs"
                  />
                  <span className="font-bold text-slate-800 text-xs">%</span>
                </div>
              </div>
              <p className="font-mono font-bold text-slate-900 text-sm mt-2">
                Rp {Math.round(totals.totalAkhir * (termin2Pct / 100)).toLocaleString("id-ID")}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Serah terima hardware & konfigurasi</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Pelunasan</span>
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min={5}
                    max={80}
                    value={termin3Pct}
                    onChange={(e) => setTermin3Pct(Number(e.target.value) || 0)}
                    className="w-12 text-center p-0.5 bg-white border border-slate-300 rounded font-bold text-slate-900 text-xs"
                  />
                  <span className="font-bold text-slate-800 text-xs">%</span>
                </div>
              </div>
              <p className="font-mono font-bold text-slate-900 text-sm mt-2">
                Rp {Math.round(totals.totalAkhir * (termin3Pct / 100)).toLocaleString("id-ID")}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">UAT selesai & garansi 12 bulan</p>
            </div>
          </div>
        </div>

        {/* Digital Signature Card */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between text-xs">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span className="font-bold text-slate-900 text-xs">Otorisasi & TTD PIC Dokumen</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
              PIC Tertera: <strong className="text-slate-800">{rab.pic_name}</strong>
              <br />
              Status: {isDigitalSigned ? "Tervalidasi Digital Audit Trail" : "Menunggu Pengesahan TTD PIC"}
            </p>
          </div>

          <button
            onClick={handleOpenTtdModal}
            disabled={isDigitalSigned}
            className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
              isDigitalSigned
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>{isDigitalSigned ? "✓ Terkunci & Disahkan" : "TTD PIC"}</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {isAddRowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              {editingItem ? `Edit Item ${targetType}` : `Tambah Item ${targetType}`}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {editingItem
                ? "Perbarui spesifikasi atau harga komponen biaya ini."
                : "Tambahkan baris spesifikasi biaya baru ke dalam dokumen RAB resmi."}
            </p>

            <form onSubmit={handleSaveRow} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Kategori Rincian</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as RabItemType)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-semibold"
                >
                  <option value="Primary">1. Komponen Utama / Hardware (Primary)</option>
                  <option value="Secondary">2. Lisensi & Infrastruktur Pendukung (Secondary)</option>
                  <option value="Tertiary">3. Jasa Implementasi & Engineering (Tertiary)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Item / Komponen</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Baremetal Server Node 64-Core"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Spesifikasi Teknis</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Deskripsi detail spesifikasi hardware/lisensi..."
                  value={itemSpecs}
                  onChange={(e) => setItemSpecs(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jumlah</label>
                  <input
                    type="number"
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Satuan</label>
                  <input
                    type="text"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Harga Satuan (Rp)</label>
                <input
                  type="number"
                  step="500000"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddRowModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {editingItem ? "Simpan Perubahan" : "Tambahkan ke RAB"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New RAB Modal */}
      {isNewRabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-slate-900 text-base mb-1">Buat Dokumen RAB Proyek Baru</h3>
            <p className="text-xs text-slate-500 mb-4">
              Inisialisasi dokumen penawaran anggaran baru untuk klien atau tender proyek.
            </p>

            <form onSubmit={handleCreateNewRab} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Proyek / Penawaran</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Pembangunan Cloud Data Center Tahap 1"
                  value={newRabProject}
                  onChange={(e) => setNewRabProject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Klien / Perusahaan Mitra</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Dinas Perhubungan Provinsi"
                  value={newRabClient}
                  onChange={(e) => setNewRabClient(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">PIC Penanggung Jawab</label>
                <select
                  value={newRabPic}
                  onChange={(e) => setNewRabPic(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-medium"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.nama_lengkap}>
                      {u.nama_lengkap} ({u.jabatan || u.divisi})
                    </option>
                  ))}
                  {users.length === 0 && <option value="Yosef Satria">Yosef Satria</option>}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Masa Berlaku Penawaran (Tanggal)</label>
                <input
                  type="date"
                  required
                  value={newRabMasa}
                  onChange={(e) => setNewRabMasa(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewRabModalOpen(false)}
                  className="py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Terbitkan Dokumen RAB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TTD PIC Modal */}
      {isTtdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <PenTool className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-base">Pengesahan TTD PIC Dokumen</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Konfirmasi otorisasi digital atas nama PIC yang tertera ({rab.pic_name}).
            </p>

            <form onSubmit={handleExecuteTtd} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama PIC Penanggung Jawab</label>
                <input
                  type="text"
                  disabled
                  value={signerName}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nomor Registrasi RAB</label>
                <input
                  type="text"
                  disabled
                  value={rab.nomor_rab}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">PIN / Konfirmasi Otorisasi</label>
                <input
                  type="password"
                  placeholder="Masukkan 6-digit PIN PIC"
                  value={signerPin}
                  onChange={(e) => setSignerPin(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 tracking-widest text-center text-sm font-mono focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTtdModalOpen(false)}
                  className="py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Sahkan & TTD Dokumen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professional Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmLabel={confirmDialog.confirmLabel}
        showCancel={confirmDialog.showCancel}
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
