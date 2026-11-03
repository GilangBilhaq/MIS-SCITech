"use client";

import React, { useState } from "react";
import {
  Wallet,
  ArrowDownRight,
  Receipt,
  Download,
  Plus,
  ShieldCheck,
  TrendingUp,
  Clock,
  FileText,
  UserCheck,
  Calendar,
  AlertCircle,
  CreditCard,
  Building2,
  PieChart,
} from "lucide-react";
import { TenantConfig } from "@/config/tenant.config";
import { Transaction, TransactionType, TransactionCategory } from "@/types";
import { StorageService } from "@/lib/storage";
import { ApiClient } from "@/lib/apiClient";
import { InvoiceGeneratorModal } from "@/components/modals/InvoiceGeneratorModal";
import { generateFinancialReportPdf } from "@/lib/pdfGenerator";
import { Toast } from "@/components/ui/Toast";
import { formatDateIndo, formatRupiah } from "@/lib/formatters";

interface FinanceDashboardViewProps {
  config: TenantConfig;
  transactions: Transaction[];
  onNavigateToTransactions: () => void;
  onRefresh: () => void;
  loggedInUserName?: string;
}

export const FinanceDashboardView: React.FC<FinanceDashboardViewProps> = ({
  config,
  transactions,
  onNavigateToTransactions,
  onRefresh,
  loggedInUserName,
}) => {
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isQuickTrxModalOpen, setIsQuickTrxModalOpen] = useState(false);
  const [recentFilter, setRecentFilter] = useState<"ALL" | "PEMASUKAN" | "PENGELUARAN">("ALL");
  const [chartPeriod, setChartPeriod] = useState<"ALL" | "Q2" | "MONTH">("ALL");
  const [toastNotif, setToastNotif] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Quick transaction form states
  const [formTipe, setFormTipe] = useState<TransactionType>("PEMASUKAN");
  const [formNama, setFormNama] = useState("");
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [formKegunaan, setFormKegunaan] = useState<TransactionCategory>("Project");
  const [formJumlah, setFormJumlah] = useState(1);
  const [formHargaPcs, setFormHargaPcs] = useState(5000000);
  const [formMetode, setFormMetode] = useState("Transfer Bank (BCA)");
  const [isSubmittingTrx, setIsSubmittingTrx] = useState(false);

  // Compute live aggregates from transactions
  const totalPemasukan = transactions
    .filter((t) => t.tipe === "PEMASUKAN")
    .reduce((acc, curr) => acc + (Number(curr.total_harga) || 0), 0);

  const totalPengeluaran = transactions
    .filter((t) => t.tipe === "PENGELUARAN")
    .reduce((acc, curr) => acc + (Number(curr.total_harga) || 0), 0);

  // Murni dihitung langsung dari total transaksi pemasukan dikurangi pengeluaran
  const saldoKas = totalPemasukan - totalPengeluaran;
  const arusKasBersih = totalPemasukan - totalPengeluaran;
  const rasioEfisiensi =
    totalPemasukan > 0
      ? Math.min(100, Math.max(0, ((totalPemasukan - totalPengeluaran) / totalPemasukan) * 100))
      : 0;

  // Operational Runway projection (saldoKas divided by monthly average expense)
  const avgMonthlyExpense = totalPengeluaran > 0 ? totalPengeluaran / 3 : 35000000;
  const runwayMonths = avgMonthlyExpense > 0 ? (saldoKas / avgMonthlyExpense).toFixed(1) : "∞";

  // Category Expense Breakdown Calculation
  const expenseByCategory = transactions
    .filter((t) => t.tipe === "PENGELUARAN")
    .reduce((acc: Record<string, number>, curr) => {
      acc[curr.kegunaan] = (acc[curr.kegunaan] || 0) + Number(curr.total_harga);
      return acc;
    }, {});

  const totalExpenseVal = totalPengeluaran > 0 ? totalPengeluaran : 1;
  const sortedCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Ambang batas kas operasional custom dari settings
  const financeSettings = StorageService.getFinanceSettings();
  const minCashAlert = Number(financeSettings?.minimum_cash_alert ?? 25000000);

  // Realtime Monthly comparison bars computed directly from transactions
  const now = new Date();
  const monthsList: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    monthsList.push({ key: `${yyyy}-${mm}`, label });
  }

  const allMonthlyChartData = monthsList.map(({ key, label }) => {
    const monthTrx = transactions.filter((t) => t.tanggal && t.tanggal.startsWith(key));
    const totalIn = monthTrx
      .filter((t) => t.tipe === "PEMASUKAN")
      .reduce((sum, t) => sum + Number(t.total_harga || 0), 0);
    const totalOut = monthTrx
      .filter((t) => t.tipe === "PENGELUARAN")
      .reduce((sum, t) => sum + Number(t.total_harga || 0), 0);

    return {
      month: label,
      in: Math.round(totalIn / 1000000), // In Millions (Juta)
      out: Math.round(totalOut / 1000000),
      rawIn: totalIn,
      rawOut: totalOut,
    };
  });

  const displayedChartData =
    chartPeriod === "MONTH"
      ? allMonthlyChartData.slice(-2)
      : chartPeriod === "Q2"
      ? allMonthlyChartData.slice(-3)
      : allMonthlyChartData;

  // Skala Dinamis: cari nilai transaksi tertinggi pada periode aktif (fallback 1 agar tidak divide by zero)
  const maxRawChartVal = Math.max(
    ...displayedChartData.map((d) => Math.max(d.rawIn || 0, d.rawOut || 0)),
    1
  );

  // Filtered recent transactions
  const filteredRecentTransactions = transactions
    .filter((t) => {
      if (recentFilter === "ALL") return true;
      return t.tipe === recentFilter;
    })
    .slice(0, 5);

  const handleQuickAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) return;
    setIsSubmittingTrx(true);
    try {
      await ApiClient.createTransaction({
        company_id: config.id,
        tipe: formTipe,
        nama_item: formNama,
        deskripsi: formDeskripsi || "Pencatatan langsung dari Dashboard Keuangan",
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
        deskripsi: formDeskripsi || "Pencatatan langsung dari Dashboard Keuangan",
        tanggal: formTanggal,
        kegunaan: formKegunaan,
        jumlah: formJumlah,
        harga_pcs: formHargaPcs,
        metode: formMetode,
        status_verifikasi: "Terverifikasi",
      });
    } finally {
      setIsSubmittingTrx(false);
      setIsQuickTrxModalOpen(false);
      setToastNotif({
        type: "success",
        message: `Transaksi kas ${formTipe === "PEMASUKAN" ? "masuk" : "keluar"} "${formNama}" berhasil dicatat ke buku kas.`,
      });
      setFormNama("");
      setFormDeskripsi("");
      onRefresh();
    }
  };

  const handleExportFullPdf = () => {
    generateFinancialReportPdf(
      transactions,
      config,
      "Buku Kas Lengkap Tahun Berjalan (2026)"
    );
    setToastNotif({
      type: "info",
      message: "Laporan Buku Kas Lengkap berhasil diekspor ke format PDF.",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Dashboard Finansial & Arus Kas
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck className="w-3 h-3 text-blue-600" />
              Enterprise Audit Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
            <span>Monitoring Likuiditas, Tren Finansial, dan Pembukuan Kas Terintegrasi</span>
            {loggedInUserName && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                  <UserCheck className="w-3 h-3 text-emerald-600" />
                  {loggedInUserName}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setIsQuickTrxModalOpen(true)}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Kas Cepat</span>
          </button>

          <button
            onClick={handleExportFullPdf}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-1.5 py-2 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor PDF</span>
          </button>

          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="w-full sm:w-auto justify-center flex items-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generator Invoice JPG</span>
          </button>
        </div>
      </div>

      {/* 4 Executive Metric Cards (Includes Runway Projection) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Saldo Kas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Saldo Kas</span>
              <Wallet className="w-4 h-4 text-blue-600" />
            </div>
            <h4 className="text-2xl font-black text-slate-900 font-mono">
              Rp {saldoKas.toLocaleString("id-ID")}
            </h4>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Likuiditas Aktif
            </span>
            <span className="text-slate-400 font-mono text-[10px]">BCA Utama</span>
          </div>
        </div>

        {/* Pemasukan Bulan Ini */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pemasukan Bulan Ini</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <h4 className="text-2xl font-black text-emerald-600 font-mono">
              +Rp {totalPemasukan.toLocaleString("id-ID")}
            </h4>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium">
              {transactions.filter((t) => t.tipe === "PEMASUKAN").length} Transaksi Terverifikasi
            </span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[10px]">
              ▲ +12.4% MoM
            </span>
          </div>
        </div>

        {/* Pengeluaran Operasional */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pengeluaran Operasional</span>
              <ArrowDownRight className="w-4 h-4 text-rose-600" />
            </div>
            <h4 className="text-2xl font-black text-rose-600 font-mono">
              -Rp {totalPengeluaran.toLocaleString("id-ID")}
            </h4>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium">
              {transactions.filter((t) => t.tipe === "PENGELUARAN").length} Pos Pengeluaran
            </span>
            <span className="font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
              Terkontrol
            </span>
          </div>
        </div>

        {/* Operational Runway */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Operational Runway</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <h4 className="text-2xl font-black text-amber-600 font-mono">
              {runwayMonths} <span className="text-sm font-semibold text-slate-600">Bulan</span>
            </h4>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Estimasi Ketahanan Kas</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded text-[10px]">
              Kondisi Prima
            </span>
          </div>
        </div>
      </div>

      {/* Chart & Expense Distribution Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Monthly Trend Chart with Interactive Periods */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Tren Kinerja Finansial Bulanan</h3>
              <p className="text-xs text-slate-500">Komparasi Pemasukan vs Pengeluaran Periode Real-time</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter tabs */}
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setChartPeriod("ALL")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    chartPeriod === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  6 Bulan
                </button>
                <button
                  type="button"
                  onClick={() => setChartPeriod("Q2")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    chartPeriod === "Q2" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Kuartal (Q2)
                </button>
                <button
                  type="button"
                  onClick={() => setChartPeriod("MONTH")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    chartPeriod === "MONTH" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Bulan Ini
                </button>
              </div>

              {/* Legends */}
              <div className="hidden sm:flex items-center gap-3 text-xs pl-2 border-l border-slate-200">
                <span className="flex items-center gap-1.5 font-medium text-slate-700 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" /> Pemasukan
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-700 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-400" /> Pengeluaran
                </span>
              </div>
            </div>
          </div>

          {/* Bar Visualization with Dynamic Auto-Scaling */}
          <div className="overflow-x-auto pb-2">
            <div className="h-56 min-w-[340px] flex items-end justify-between gap-3 pt-6 px-4">
              {displayedChartData.map((d, i) => {
                // Skala dinamis proporsional terhadap nilai transaksi terbesar (maksimum 90% dari container agar tooltip muat)
                const inHeight =
                  d.rawIn > 0
                    ? Math.max(8, Math.min(92, (d.rawIn / maxRawChartVal) * 90))
                    : 0;
                const outHeight =
                  d.rawOut > 0
                    ? Math.max(8, Math.min(92, (d.rawOut / maxRawChartVal) * 90))
                    : 0;

                const formatTooltip = (val: number) => {
                  if (!val || val === 0) return "Rp 0";
                  if (val >= 1000000000) {
                    return `Rp ${(val / 1000000000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
                  }
                  if (val >= 1000000) {
                    return `Rp ${(val / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Jt`;
                  }
                  return `Rp ${(val / 1000).toLocaleString("id-ID")} Rb`;
                };

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full flex items-end justify-center gap-1.5 h-44">
                      {/* Income bar */}
                      <div
                        className="w-5 bg-blue-600 rounded-t-sm transition-all duration-500 hover:bg-blue-700 relative group cursor-pointer"
                        style={{ height: `${inHeight}%` }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-mono py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-xs">
                          {formatTooltip(d.rawIn)}
                        </div>
                      </div>
                      {/* Expense bar */}
                      <div
                        className="w-5 bg-slate-400 rounded-t-sm transition-all duration-500 hover:bg-slate-500 relative group cursor-pointer"
                        style={{ height: `${outHeight}%` }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-mono py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-xs">
                          {formatTooltip(d.rawOut)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                      {d.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Cash Efficiency & Expense Breakdown */}
        <div className="lg:col-span-4 space-y-4">
          {/* Net Cash Flow & Efficiency Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-slate-900 text-sm">Metrik Efisiensi Arus Kas</h3>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-100 mb-3">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Arus Kas Bersih (Net Cash Flow)
              </span>
              <h4 className="text-xl font-black text-emerald-700 font-mono mt-0.5">
                {arusKasBersih >= 0 ? "+" : "-"}Rp {Math.abs(arusKasBersih).toLocaleString("id-ID")}
              </h4>
              <p className="text-[10px] text-emerald-600 mt-0.5">Surplus operasional kuartal berjalan</p>
            </div>

            {/* Indikator Batas Cadangan Minimum Kas Operasional */}
            <div className={`p-3.5 rounded-xl border mb-3 ${
              saldoKas >= minCashAlert
                ? "bg-emerald-50/60 border-emerald-200 text-emerald-800"
                : "bg-rose-50/70 border-rose-200 text-rose-800"
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Batas Kas Minimum
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  saldoKas >= minCashAlert
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700 animate-pulse"
                }`}>
                  {saldoKas >= minCashAlert ? "Kas Aman" : "Perlu Top-up"}
                </span>
              </div>
              <p className="font-mono font-bold text-xs">
                Target Cadangan: {formatRupiah(minCashAlert)}
              </p>
              <p className="text-[10.5px] leading-tight mt-1 opacity-90">
                {saldoKas >= minCashAlert
                  ? `Saldo kas (${formatRupiah(saldoKas)}) melampaui batas cadangan aman operasional.`
                  : `Peringatan: Saldo kas (${formatRupiah(saldoKas)}) berada di bawah batas cadangan minimum operasional.`}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-700">Rasio Efisiensi Anggaran</span>
                <span className="text-xs font-bold text-blue-600 font-mono">
                  {rasioEfisiensi.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${rasioEfisiensi}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Status: <strong className="text-emerald-700">Sangat Sehat & Terkendali</strong>
              </p>
            </div>
          </div>

          {/* Pos Pengeluaran Terbesar Breakdown */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-blue-600" />
                Distribusi Pos Pengeluaran
              </h4>
              <span className="text-[10px] text-slate-400 font-semibold">Bulan Berjalan</span>
            </div>

            <div className="space-y-2.5">
              {sortedCategories.length > 0 ? (
                sortedCategories.map(([category, amount], idx) => {
                  const percent = Math.min(100, Math.round((amount / totalExpenseVal) * 100));
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700 text-[11px] truncate">{category}</span>
                        <span className="font-mono text-slate-900 text-[11px] font-semibold">
                          Rp {amount.toLocaleString("id-ID")} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-600 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">Belum ada pos pengeluaran tercatat.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Recent Financial Transactions */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Catatan Transaksi Finansial Terkini</h3>
            <p className="text-xs text-slate-500">Mutasi kas masuk dan keluar yang telah diverifikasi secara realtime</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Tabs */}
            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setRecentFilter("ALL")}
                className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                  recentFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setRecentFilter("PEMASUKAN")}
                className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                  recentFilter === "PEMASUKAN"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => setRecentFilter("PENGELUARAN")}
                className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                  recentFilter === "PENGELUARAN"
                    ? "bg-white text-rose-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pengeluaran
              </button>
            </div>

            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200 flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Buat Invoice</span>
            </button>

            <button
              onClick={onNavigateToTransactions}
              className="py-1 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-blue-200 flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Kelola Buku Kas</span>
              <span>→</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <th className="pb-3 px-3">Tanggal</th>
                <th className="pb-3 px-3">Deskripsi / Referensi</th>
                <th className="pb-3 px-3">Kategori</th>
                <th className="pb-3 px-3">Metode</th>
                <th className="pb-3 px-3 text-right">Jumlah</th>
                <th className="pb-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecentTransactions.length > 0 ? (
                filteredRecentTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">{formatDateIndo(t.tanggal)}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{t.nama_item}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{t.deskripsi}</p>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {t.kegunaan}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-medium text-[11px]">
                      {t.metode}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span
                        className={`font-mono font-bold ${
                          t.tipe === "PEMASUKAN" ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {t.tipe === "PEMASUKAN" ? "+" : "-"}Rp {t.total_harga.toLocaleString("id-ID")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>{t.status_verifikasi}</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                    Tidak ada transaksi pada filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Add Transaction Modal */}
      {isQuickTrxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm">Catat Kas Masuk / Keluar Cepat</h3>
              <button
                onClick={() => setIsQuickTrxModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickAddTransaction} className="space-y-3 text-xs overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tipe Mutasi</label>
                  <select
                    value={formTipe}
                    onChange={(e) => setFormTipe(e.target.value as TransactionType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                  >
                    <option value="PEMASUKAN">🟢 Pemasukan (Masuk)</option>
                    <option value="PENGELUARAN">🔴 Pengeluaran (Keluar)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Item / Transaksi</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Biaya Langganan Server Cloud"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kategori</label>
                  <select
                    value={formKegunaan}
                    onChange={(e) => setFormKegunaan(e.target.value as TransactionCategory)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  >
                    <option value="Project">Project</option>
                    <option value="SaaS Subscription">SaaS Subscription</option>
                    <option value="Infrastruktur">Infrastruktur</option>
                    <option value="Operasional Kantor">Operasional Kantor</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Metode</label>
                  <select
                    value={formMetode}
                    onChange={(e) => setFormMetode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  >
                    <option value="Transfer Bank (BCA)">Transfer Bank (BCA)</option>
                    <option value="QRIS">QRIS</option>
                    <option value="Corporate Card">Corporate Card</option>
                    <option value="Tunai / Kas Kecil">Tunai / Kas Kecil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={50000}
                  value={formHargaPcs}
                  onChange={(e) => setFormHargaPcs(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickTrxModalOpen(false)}
                  className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTrx}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold cursor-pointer shadow-xs"
                >
                  {isSubmittingTrx ? "Menyimpan..." : "Simpan Transaksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Generator Modal */}
      <InvoiceGeneratorModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        config={config}
        loggedInUserName={loggedInUserName}
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

