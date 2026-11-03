"use client";

import React, { useState } from "react";
import {
  Plus,
  Download,
  Search,
  Trash2,
  Edit3,
  TrendingUp,
  ArrowDownRight,
  ShieldCheck,
  Calendar,
  Filter,
} from "lucide-react";
import { Transaction, TransactionType, TransactionCategory } from "@/types";
import { StorageService } from "@/lib/storage";
import { TenantConfig } from "@/config/tenant.config";
import { ApiClient } from "@/lib/apiClient";
import { generateFinancialReportPdf } from "@/lib/pdfGenerator";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
import { formatDateIndo } from "@/lib/formatters";

interface TransactionsViewProps {
  config: TenantConfig;
  transactions: Transaction[];
  onRefresh: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ config, transactions, onRefresh }) => {
  const [filterType, setFilterType] = useState<string>("SEMUA");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteTargetTransaction, setDeleteTargetTransaction] = useState<Transaction | null>(null);
  const [toastNotif, setToastNotif] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Export Filter Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"PDF" | "CSV">("PDF");
  const [exportStartDate, setExportStartDate] = useState("2026-01-01");
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [exportFilterType, setExportFilterType] = useState<string>("SEMUA");

  // Form State
  const [formTipe, setFormTipe] = useState<TransactionType>("PEMASUKAN");
  const [formNama, setFormNama] = useState("");
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [formKegunaan, setFormKegunaan] = useState<TransactionCategory>("Project");
  const [formJumlah, setFormJumlah] = useState(1);
  const [formHargaPcs, setFormHargaPcs] = useState(10000000);
  const [formMetode, setFormMetode] = useState("Transfer Bank (BCA)");

  const filtered = transactions.filter((t) => {
    const matchType = filterType === "SEMUA" || t.tipe === filterType;
    const matchSearch =
      t.nama_item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.metode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const handleOpenEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setFormTipe(t.tipe);
    setFormNama(t.nama_item);
    setFormDeskripsi(t.deskripsi);
    setFormTanggal(t.tanggal ? t.tanggal.split("T")[0] : "");
    setFormKegunaan(t.kegunaan);
    setFormJumlah(t.jumlah);
    setFormHargaPcs(t.harga_pcs);
    setFormMetode(t.metode);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.createTransaction({
        company_id: config.id,
        tipe: formTipe,
        nama_item: formNama,
        deskripsi: formDeskripsi,
        tanggal: formTanggal,
        kegunaan: formKegunaan,
        jumlah: formJumlah,
        harga_pcs: formHargaPcs,
        metode: formMetode,
      });
    } catch {
      StorageService.addTransaction({
        company_id: config.id,
        tipe: formTipe,
        nama_item: formNama,
        deskripsi: formDeskripsi,
        tanggal: formTanggal,
        kegunaan: formKegunaan,
        jumlah: formJumlah,
        harga_pcs: formHargaPcs,
        metode: formMetode,
        status_verifikasi: "Terverifikasi",
      });
    }

    setIsAddModalOpen(false);
    setFormNama("");
    setFormDeskripsi("");
    setToastNotif({ type: "success", message: `Transaksi "${formNama}" (${formTipe}) berhasil dicatat.` });
    onRefresh();
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    const payload = {
      tipe: formTipe,
      nama_item: formNama,
      deskripsi: formDeskripsi,
      tanggal: formTanggal,
      kegunaan: formKegunaan,
      jumlah: formJumlah,
      harga_pcs: formHargaPcs,
      metode: formMetode,
    };

    try {
      await ApiClient.updateTransaction({ id: editingTransaction.id, ...payload });
    } catch {
      StorageService.updateTransaction(editingTransaction.id, payload);
    }

    setEditingTransaction(null);
    setFormNama("");
    setFormDeskripsi("");
    setToastNotif({ type: "success", message: `Transaksi "${formNama}" berhasil diperbarui.` });
    onRefresh();
  };

  const handleDeleteClick = (trx: Transaction) => {
    setDeleteTargetTransaction(trx);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetTransaction) return;
    const itemNama = deleteTargetTransaction.nama_item;
    try {
      await ApiClient.deleteTransaction(deleteTargetTransaction.id);
    } catch {
      StorageService.deleteTransaction(deleteTargetTransaction.id);
    }
    setToastNotif({ type: "info", message: `Transaksi "${itemNama}" berhasil dihapus dari buku kas.` });
    setDeleteTargetTransaction(null);
    onRefresh();
  };

  const handleExecuteExport = () => {
    const exportFiltered = transactions.filter((t) => {
      const matchType = exportFilterType === "SEMUA" || t.tipe === exportFilterType;
      const matchDate =
        (!exportStartDate || t.tanggal >= exportStartDate) &&
        (!exportEndDate || t.tanggal <= exportEndDate);
      return matchType && matchDate;
    });

    if (exportFormat === "PDF") {
      generateFinancialReportPdf(
        exportFiltered,
        config,
        `${exportFilterType === "SEMUA" ? "Semua Aliran Kas" : exportFilterType} (${exportStartDate} s/d ${exportEndDate})`
      );
      setToastNotif({ type: "success", message: "Laporan transaksi keuangan berhasil diekspor (PDF)." });
    } else {
      const headers = ["ID", "Tanggal", "Tipe", "Item", "Deskripsi", "Kategori", "Jumlah", "Harga Pcs", "Total", "Metode"];
      const rows = exportFiltered.map((t) => [
        t.id,
        t.tanggal,
        t.tipe,
        `"${t.nama_item.replace(/"/g, '""')}"`,
        `"${t.deskripsi.replace(/"/g, '""')}"`,
        t.kegunaan,
        t.jumlah,
        t.harga_pcs,
        t.total_harga,
        t.metode,
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Transaksi_Keuangan_${exportFilterType}_${exportStartDate}_${exportEndDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToastNotif({ type: "success", message: "Laporan transaksi keuangan berhasil diekspor (CSV)." });
    }

    setIsExportModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Transaksi Keuangan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan pembukuan kas masuk dan pengeluaran operasional perusahaan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              setExportFormat("PDF");
              setIsExportModalOpen(true);
            }}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 py-2 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-rose-600" />
            <span>Ekspor PDF</span>
          </button>

          <button
            onClick={() => {
              setExportFormat("CSV");
              setIsExportModalOpen(true);
            }}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 py-2 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto justify-center flex items-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Transaksi</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Jenis Arus:
          </span>
          <button
            onClick={() => setFilterType("SEMUA")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterType === "SEMUA"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua Transaksi
          </button>
          <button
            onClick={() => setFilterType("PEMASUKAN")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              filterType === "PEMASUKAN"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Pemasukan</span>
          </button>
          <button
            onClick={() => setFilterType("PENGELUARAN")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              filterType === "PENGELUARAN"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Pengeluaran</span>
          </button>
        </div>

        <div className="w-full md:w-72 relative shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Cari item atau nomor referensi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Item & Deskripsi</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Metode Bayar</th>
                <th className="py-3 px-3 text-center">Qty / Vol</th>
                <th className="py-3 px-4 text-right">Total Transaksi</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Belum ada data transaksi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateIndo(t.tanggal)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{t.nama_item}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{t.deskripsi}</p>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {t.kegunaan}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-600">{t.metode}</td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap font-mono text-slate-700">
                      {t.jumlah}x
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span
                        className={`font-mono font-bold text-sm ${
                          t.tipe === "PEMASUKAN" ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {t.tipe === "PEMASUKAN" ? "+" : "-"}Rp {t.total_harga.toLocaleString("id-ID")}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>{t.status_verifikasi}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Transaksi"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(t)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Transaksi"
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

      {/* Export Filter Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Opsi Ekspor Laporan Finansial ({exportFormat})
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pilih rentang tanggal dan filter jenis mutasi kas untuk diekspor secara rapi dan profesional.
            </p>

            <div className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Jenis Arus Kas</label>
                <select
                  value={exportFilterType}
                  onChange={(e) => setExportFilterType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                >
                  <option value="SEMUA">Semua Transaksi (Pemasukan & Pengeluaran)</option>
                  <option value="PEMASUKAN">Hanya Pemasukan (Kas Masuk)</option>
                  <option value="PENGELUARAN">Hanya Pengeluaran (Kas Keluar)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Dari Tanggal</label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteExport}
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File {exportFormat}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-slate-900 text-base mb-1">Catat Mutasi Transaksi Baru</h3>
            <p className="text-xs text-slate-500 mb-4">
              Masukkan rincian transaksi kas masuk atau pengeluaran operasional.
            </p>

            <form onSubmit={handleAddTransaction} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tipe Mutasi</label>
                  <select
                    value={formTipe}
                    onChange={(e) => setFormTipe(e.target.value as TransactionType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-bold"
                  >
                    <option value="PEMASUKAN">🟢 Pemasukan (Kas Masuk)</option>
                    <option value="PENGELUARAN">🔴 Pengeluaran (Kas Keluar)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Item / Transaksi</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Pembayaran Pelanggan Tenant #Mahakarya"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Deskripsi / No Referensi</label>
                <input
                  type="text"
                  placeholder="Misal: INV-2026-0418 • Transfer Bank BCA"
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kategori Kegunaan</label>
                  <select
                    value={formKegunaan}
                    onChange={(e) => setFormKegunaan(e.target.value as TransactionCategory)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  >
                    <option value="SaaS Subscription">SaaS Subscription</option>
                    <option value="Infrastruktur">Infrastruktur</option>
                    <option value="Professional Service">Professional Service</option>
                    <option value="SDM & Operasional">SDM & Operasional</option>
                    <option value="Project">Project</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Metode Pembayaran</label>
                  <input
                    type="text"
                    value={formMetode}
                    onChange={(e) => setFormMetode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jumlah (Qty)</label>
                  <input
                    type="number"
                    min={1}
                    value={formJumlah}
                    onChange={(e) => setFormJumlah(parseInt(e.target.value) || 1)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    step={100000}
                    value={formHargaPcs}
                    onChange={(e) => setFormHargaPcs(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Total Transaksi:</span>
                <span className="font-mono font-bold text-blue-700 text-sm">
                  Rp {(formJumlah * formHargaPcs).toLocaleString("id-ID")}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-slate-900 text-base mb-1">Edit Transaksi Finansial</h3>
            <p className="text-xs text-slate-500 mb-4">
              Perbarui rincian item, nominal, atau metode transaksi.
            </p>

            <form onSubmit={handleUpdateTransaction} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tipe Mutasi</label>
                  <select
                    value={formTipe}
                    onChange={(e) => setFormTipe(e.target.value as TransactionType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-bold"
                  >
                    <option value="PEMASUKAN">🟢 Pemasukan (Kas Masuk)</option>
                    <option value="PENGELUARAN">🔴 Pengeluaran (Kas Keluar)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Item / Transaksi</label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Deskripsi / No Referensi</label>
                <input
                  type="text"
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kategori Kegunaan</label>
                  <select
                    value={formKegunaan}
                    onChange={(e) => setFormKegunaan(e.target.value as TransactionCategory)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  >
                    <option value="SaaS Subscription">SaaS Subscription</option>
                    <option value="Infrastruktur">Infrastruktur</option>
                    <option value="Professional Service">Professional Service</option>
                    <option value="SDM & Operasional">SDM & Operasional</option>
                    <option value="Project">Project</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Metode Pembayaran</label>
                  <input
                    type="text"
                    value={formMetode}
                    onChange={(e) => setFormMetode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jumlah (Qty)</label>
                  <input
                    type="number"
                    min={1}
                    value={formJumlah}
                    onChange={(e) => setFormJumlah(parseInt(e.target.value) || 1)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    step={100000}
                    value={formHargaPcs}
                    onChange={(e) => setFormHargaPcs(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Total Transaksi:</span>
                <span className="font-mono font-bold text-blue-700 text-sm">
                  Rp {(formJumlah * formHargaPcs).toLocaleString("id-ID")}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Transaction Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetTransaction}
        title="Hapus Catatan Transaksi?"
        message={`Apakah Anda yakin ingin menghapus transaksi "${deleteTargetTransaction?.nama_item}" senilai Rp ${deleteTargetTransaction?.total_harga.toLocaleString("id-ID")}? Data ini akan dihapus dari buku kas.`}
        confirmLabel="Ya, Hapus Transaksi"
        cancelLabel="Batal"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetTransaction(null)}
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
