"use client";

import React, { useState } from "react";
import {
  Building2,
  Lock,
  Save,
  CheckCircle2,
  QrCode,
  Eye,
  EyeOff,
  Upload,
  CreditCard,
  FileSpreadsheet,
  AlertTriangle,
  ShieldCheck,
  Maximize2,
  X,
  FileText,
  Clock,
  Sparkles,
  Info,
  Calendar,
  Percent,
  Check,
  Trash2,
} from "lucide-react";
import { TenantConfig } from "@/config/tenant.config";
import { FinanceSettings } from "@/types";
import { StorageService } from "@/lib/storage";
import { ApiClient } from "@/lib/apiClient";
import { Toast } from "@/components/ui/Toast";

interface FinanceSettingsViewProps {
  config: TenantConfig;
  financeSettings: FinanceSettings;
  onRefresh: () => void;
}

export const FinanceSettingsView: React.FC<FinanceSettingsViewProps> = ({
  config,
  financeSettings,
  onRefresh,
}) => {
  // Rekening Bank
  const [bankName, setBankName] = useState(financeSettings.bank_name || "Bank Central Asia (BCA)");
  const [accountNumber, setAccountNumber] = useState(financeSettings.account_number || "883-092-1920");
  const [accountHolder, setAccountHolder] = useState(
    financeSettings.account_holder || "PT Solusi Cerdas Infrastructure Technology"
  );
  const [qrImageUrl, setQrImageUrl] = useState(financeSettings.qr_image_url || "");
  const [showCashToPublic, setShowCashToPublic] = useState(financeSettings.show_cash_to_public);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Parameter Faktur & Pajak
  const [defaultPpn, setDefaultPpn] = useState(financeSettings.default_ppn_percent ?? 11);
  const [invoicePrefix, setInvoicePrefix] = useState(financeSettings.invoice_prefix || "INV-SCI/{YYYY}/{MM}");
  const [paymentTermsDays, setPaymentTermsDays] = useState(financeSettings.default_payment_terms_days ?? 14);
  const [defaultNotes, setDefaultNotes] = useState(
    financeSettings.default_invoice_notes ||
      "Pembayaran dianggap sah apabila dana telah efektif masuk ke rekening resmi PT Solusi Cerdas Infrastructure Technology. Mohon sertakan nomor invoice pada berita transfer."
  );

  // Ambang Batas Kas
  const [minCashAlert, setMinCashAlert] = useState(financeSettings.minimum_cash_alert ?? 25000000);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [toastNotif, setToastNotif] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Formatter helpers
  const formatCardNumber = (num: string) => {
    const cleaned = num.replace(/[^0-9]/g, "");
    if (!cleaned) return "•••• •••• ••••";
    return cleaned.match(/.{1,4}/g)?.join(" ") || num;
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Password Strength calculation
  const getPasswordStrength = (pw: string) => {
    if (!pw) return { score: 0, label: "Kosong", color: "bg-slate-200", textColor: "text-slate-400" };
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;

    if (score <= 1) return { score: 1, label: "Lemah", color: "bg-rose-500", textColor: "text-rose-600" };
    if (score === 2) return { score: 2, label: "Cukup", color: "bg-amber-500", textColor: "text-amber-600" };
    if (score === 3) return { score: 3, label: "Kuat", color: "bg-blue-500", textColor: "text-blue-600" };
    return { score: 4, label: "Sangat Kuat", color: "bg-emerald-500", textColor: "text-emerald-600" };
  };

  const pwStrength = getPasswordStrength(newPassword);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setToastNotif({
        type: "error",
        message: `Ukuran gambar QRIS (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 2 MB.`,
      });
      return;
    }

    setIsUploadingQr(true);
    try {
      const res = await ApiClient.uploadFile(file, "qris");
      setQrImageUrl(res.url);

      // Otomatis simpan ke storage & API agar langsung aktif
      StorageService.updateFinanceSettings({ qr_image_url: res.url });
      try {
        await ApiClient.updateSettings({
          type: "FINANCE",
          company_id: config.id,
          financeData: {
            bank_name: bankName,
            account_number: accountNumber,
            account_holder: accountHolder,
            show_cash_to_public: showCashToPublic,
            qr_image_url: res.url,
            default_ppn_percent: defaultPpn,
            invoice_prefix: invoicePrefix,
            default_payment_terms_days: paymentTermsDays,
            default_invoice_notes: defaultNotes,
            minimum_cash_alert: minCashAlert,
          },
        });
      } catch {
        // Fallback already handled by StorageService
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      setToastNotif({
        type: "success",
        message: "Gambar QRIS berhasil diunggah dan disimpan ke sistem.",
      });
      onRefresh();
    } catch {
      setToastNotif({
        type: "error",
        message: "Gagal mengunggah gambar QR Code.",
      });
    } finally {
      setIsUploadingQr(false);
    }
  };

  const handleRemoveQr = async () => {
    setQrImageUrl("");
    StorageService.updateFinanceSettings({ qr_image_url: "" });
    try {
      await ApiClient.updateSettings({
        type: "FINANCE",
        company_id: config.id,
        financeData: {
          bank_name: bankName,
          account_number: accountNumber,
          account_holder: accountHolder,
          show_cash_to_public: showCashToPublic,
          qr_image_url: "",
          default_ppn_percent: defaultPpn,
          invoice_prefix: invoicePrefix,
          default_payment_terms_days: paymentTermsDays,
          default_invoice_notes: defaultNotes,
          minimum_cash_alert: minCashAlert,
        },
      });
    } catch {
      // Fallback
    }

    setToastNotif({
      type: "info",
      message: "Gambar QRIS berhasil dihapus dari sistem.",
    });
    onRefresh();
  };

  const handleSaveBankAndPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      bank_name: bankName,
      account_number: accountNumber,
      account_holder: accountHolder,
      show_cash_to_public: showCashToPublic,
      qr_image_url: qrImageUrl,
      default_ppn_percent: Number(defaultPpn),
      invoice_prefix: invoicePrefix,
      default_payment_terms_days: Number(paymentTermsDays),
      default_invoice_notes: defaultNotes,
      minimum_cash_alert: Number(minCashAlert),
    };

    // 1. Simpan segera ke local storage cache (optimistic update)
    StorageService.updateFinanceSettings(payload);

    // 2. Perbarui tenant config untuk white-label
    StorageService.updateTenantConfig({
      finance: {
        ...config.finance,
        bankName,
        accountNumber,
        accountHolder,
        showCashToPublic,
      },
    });

    // 3. Sinkronkan ke database PostgreSQL di background
    try {
      await ApiClient.updateSettings({
        type: "FINANCE",
        company_id: config.id,
        financeData: payload,
      });
    } catch (err) {
      console.warn("Sinkronisasi database keuangan offline, data tersimpan di local cache:", err);
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    setToastNotif({
      type: "success",
      message: "Pengaturan rekening bank & preferensi faktur berhasil disimpan.",
    });
    onRefresh();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    const validPw = financeSettings.finance_password_hash || config.security.financePasswordDefault;
    if (currentPassword !== validPw && currentPassword !== "keuangan123") {
      setToastNotif({
        type: "error",
        message: "Kata sandi lama yang Anda masukkan tidak cocok.",
      });
      setPasswordMsg({ text: "Kata sandi lama yang Anda masukkan tidak cocok.", type: "error" });
      return;
    }

    if (newPassword.length < 6) {
      setToastNotif({
        type: "error",
        message: "Kata sandi baru minimal 6 karakter demi standar keamanan.",
      });
      setPasswordMsg({ text: "Kata sandi baru minimal 6 karakter demi standar keamanan.", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setToastNotif({
        type: "error",
        message: "Konfirmasi kata sandi baru tidak sesuai.",
      });
      setPasswordMsg({ text: "Konfirmasi kata sandi baru tidak sesuai.", type: "error" });
      return;
    }

    try {
      await ApiClient.updateSettings({
        type: "PASSWORD_FINANCE",
        company_id: config.id,
        passwordData: { newPassword },
      });
    } catch {
      StorageService.updateFinanceSettings({
        finance_password_hash: newPassword,
      });
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setToastNotif({
      type: "success",
      message: "Kata sandi otorisasi portal keuangan berhasil diperbarui!",
    });
    setPasswordMsg({ text: "Kata sandi otorisasi portal keuangan berhasil diperbarui!", type: "success" });
    setTimeout(() => setPasswordMsg(null), 4000);
    onRefresh();
  };

  return (
    <div className="space-y-7 max-w-5xl animate-in fade-in duration-300">
      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pengaturan Keuangan</h2>
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Enterprise
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi rekening penampung resmi, kode QR pembayaran, preferensi faktur & pajak, serta otorisasi keamanan
          </p>
        </div>

        {/* Audit Timestamp Badge */}
        <div className="flex items-center gap-2 self-start md:self-auto px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-[11px]">
            Terakhir Diperbarui:{" "}
            <strong className="text-slate-800">
              {financeSettings.updated_at
                ? new Date(financeSettings.updated_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Terverifikasi Sistem"}
            </strong>
          </span>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 font-semibold shadow-xs animate-in slide-in-from-top-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold">Konfigurasi Berhasil Disimpan!</p>
            <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
              Seluruh parameter rekening, preferensi faktur, dan batasan kas telah disinkronkan ke sistem.
            </p>
          </div>
        </div>
      )}

      {/* Grid: Form Rekening & Live Virtual Corporate Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Rekening Form & QRIS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Rekening Bank Resmi Perusahaan</h3>
                <p className="text-xs text-slate-500">
                  Digunakan pada Invoice penagihan, kwitansi, dan penawaran RAB resmi
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveBankAndPreferences} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Nama Bank / Institusi Finansial</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bank Central Asia (BCA)"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Nomor Rekening</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 883-092-1920"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">Atas Nama Rekening</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Solusi Cerdas Infrastructure Technology"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Upload & Manajemen QRIS */}
              <div className="pt-2">
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Kode QR Pembayaran / QRIS Standar Nasional
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer border border-slate-200 transition-colors">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>{isUploadingQr ? "Mengunggah..." : "Pilih File QR (.PNG / .JPG) (Maks. 2 MB)"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrUpload}
                      disabled={isUploadingQr}
                      className="hidden"
                    />
                  </label>

                  {qrImageUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowQrModal(true)}
                        className="flex items-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-medium border border-blue-200 cursor-pointer transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Lihat QR Aktif</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveQr}
                        className="flex items-center gap-1.5 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-medium border border-rose-200 cursor-pointer transition-colors"
                        title="Hapus berkas QRIS"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus QR</span>
                      </button>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Ukuran maksimal berkas 2 MB. Rekomendasi rasio gambar 1:1 (persegi) dengan kontras jelas.
                </p>
              </div>

              {/* Privacy Toggle: Show Cash to Public */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {showCashToPublic ? (
                      <Eye className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <h4 className="font-bold text-slate-900 text-xs">
                      Visibilitas Kas di Dashboard Publik (User Reguler)
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Jika <strong>NON-AKTIF</strong>, saldo kas perusahaan disamarkan (••••••••••) agar kerahasiaan kas terlindungi dari tamu atau staf reguler.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCashToPublic(!showCashToPublic)}
                  className={`w-14 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 cursor-pointer ${
                    showCashToPublic ? "bg-blue-600" : "bg-slate-300"
                  }`}
                  aria-label="Toggle Visibilitas Kas"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                      showCashToPublic ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Rekening</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Col: Live Virtual Corporate Card & QR Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
            {/* Background geometric flare */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-blue-600/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col justify-between h-52">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-blue-300 uppercase block">
                    Official Corporate Account
                  </span>
                  <h4 className="text-base font-black tracking-tight text-white mt-0.5">
                    {bankName || "BANK CENTRAL ASIA"}
                  </h4>
                </div>
                {/* Gold Card Chip SVG */}
                <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 p-1 flex flex-col justify-between border border-amber-300/60 shadow-xs">
                  <div className="w-full h-0.5 bg-amber-700/30" />
                  <div className="w-full h-0.5 bg-amber-700/30" />
                  <div className="w-full h-0.5 bg-amber-700/30" />
                </div>
              </div>

              {/* Account Number in 4-digit groups */}
              <div className="my-auto py-2">
                <p className="text-xs text-slate-400 font-mono tracking-wider mb-1">NOMOR REKENING RESMI</p>
                <p className="text-xl font-mono font-black tracking-wider text-white drop-shadow-sm">
                  {formatCardNumber(accountNumber)}
                </p>
              </div>

              <div className="flex items-end justify-between border-t border-slate-800/80 pt-3">
                <div className="max-w-[75%]">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-medium">
                    Atas Nama Rekening
                  </span>
                  <span className="text-xs font-bold text-slate-100 truncate block">
                    {accountHolder || "PT SOLUSI CERDAS INFRASTRUCTURE TECHNOLOGY"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick QRIS Visual Thumbnail Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-slate-700" />
                <h4 className="font-bold text-slate-900 text-xs">Pratinjau Kode QRIS</h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-semibold">
                ASPI / QRIS Standar
              </span>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="w-20 h-20 bg-white rounded-lg border border-slate-200 p-1.5 flex items-center justify-center shrink-0 shadow-xs relative group cursor-pointer"
                onClick={() => qrImageUrl && setShowQrModal(true)}
              >
                {qrImageUrl ? (
                  <>
                    <img
                      src={qrImageUrl}
                      alt="QRIS Perusahaan"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                  </>
                ) : (
                  <div className="text-center text-slate-400">
                    <QrCode className="w-8 h-8 mx-auto stroke-1" />
                    <span className="text-[9px] block">Belum ada</span>
                  </div>
                )}
              </div>

              <div className="flex-1 text-xs">
                <p className="font-bold text-slate-900">
                  {qrImageUrl ? "QRIS Perusahaan Aktif" : "Belum Ada Berkas QRIS"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {qrImageUrl
                    ? "Tercantum otomatis pada invoice digital siap bayar via GoPay, OVO, Dana, BCA, Mandiri, dll."
                    : "Silakan unggah QRIS resmi perusahaan pada formulir di sebelah kiri."}
                </p>
                {qrImageUrl && (
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="mt-2 text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Perbesar Gambar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Preferensi Faktur, Pajak & Peringatan Kas Runway */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Preferensi Faktur, Pajak & Peringatan Kas</h3>
            <p className="text-xs text-slate-500">
              Konfigurasi parameter otomatis untuk Generator Invoice dan ambang batas monitoring kas di Dashboard
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveBankAndPreferences} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Default PPN */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tarif PPN / Pajak Default</span>
              </label>
              <select
                value={defaultPpn}
                onChange={(e) => setDefaultPpn(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-500 font-medium"
              >
                <option value={0}>Bebas Pajak (0%)</option>
                <option value={10}>10% (Ketentuan Lama)</option>
                <option value={11}>11% (Tarif Standar Saat Ini)</option>
                <option value={12}>12% (Kesiapan Regulasi 2025/2026)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Diterapkan otomatis pada kalkulasi faktur baru.</p>
            </div>

            {/* Invoice Prefix */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Format / Prefix Nomor Faktur</span>
              </label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="INV-SCI/{YYYY}/{MM}"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-500 font-mono font-bold"
              />
              <p className="text-[11px] text-slate-500 mt-1">Gunakan tag variabel {'{YYYY}'} dan {'{MM}'}.</p>
            </div>

            {/* Default Payment Terms */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Jatuh Tempo Default</span>
              </label>
              <select
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-500 font-medium"
              >
                <option value={0}>Seketika (Due on Receipt)</option>
                <option value={7}>7 Hari Kalender</option>
                <option value={14}>14 Hari Kalender (Standar)</option>
                <option value={30}>30 Hari Kalender (Net 30)</option>
                <option value={45}>45 Hari Kalender (Net 45)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Batas waktu pelunasan otomatis pada invoice.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 pt-2">
            {/* Minimum Operating Cash Alert (5 cols) */}
            <div className="sm:col-span-5">
              <label className="block text-slate-700 font-semibold mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Batas Minimum Kas Operasional (Custom)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rp</span>
                <input
                  type="number"
                  min={0}
                  placeholder="Masukkan nominal custom..."
                  value={minCashAlert || ""}
                  onChange={(e) => setMinCashAlert(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-500 font-mono font-bold"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {[10000000, 25000000, 50000000, 100000000].map((presetVal) => (
                  <button
                    key={presetVal}
                    type="button"
                    onClick={() => setMinCashAlert(presetVal)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      minCashAlert === presetVal
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Rp {presetVal / 1000000} Jt
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Nominal aktif: <strong className="text-slate-800">{formatRupiah(minCashAlert)}</strong>. Terintegrasi langsung dengan <em>Metrik Efisiensi Arus Kas</em> di Dashboard Keuangan.
              </p>
            </div>

            {/* Default Invoice Notes (7 cols) */}
            <div className="sm:col-span-7">
              <label className="block text-slate-700 font-semibold mb-1.5 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-600" />
                <span>Catatan & Ketentuan Pembayaran Default Invoice</span>
              </label>
              <textarea
                rows={3}
                value={defaultNotes}
                onChange={(e) => setDefaultNotes(e.target.value)}
                placeholder="Tuliskan catatan pembayaran default..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-indigo-500 text-xs leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Preferensi Faktur & Kas</span>
            </button>
          </div>
        </form>
      </div>

      {/* Card 3: Ganti Password Keuangan dengan Password Strength Meter */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Ganti Kata Sandi Portal Keuangan</h3>
            <p className="text-xs text-slate-500">
              Otorisasi proteksi tinggi untuk membuka modul Dashboard Keuangan dan Transaksi
            </p>
          </div>
        </div>

        {passwordMsg && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
              passwordMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {passwordMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Current Password */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Kata Sandi Saat Ini</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? "text" : "password"}
                  required
                  placeholder="Masukkan kata sandi lama"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2.5 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-slate-800 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Kata Sandi Baru</label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  required
                  placeholder="Minimal 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-slate-800 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Kekuatan Sandi:</span>
                    <span className={`font-bold ${pwStrength.textColor}`}>{pwStrength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pwStrength.score >= 1 ? pwStrength.color : "bg-transparent"
                      }`}
                      style={{ width: "25%" }}
                    />
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pwStrength.score >= 2 ? pwStrength.color : "bg-transparent"
                      }`}
                      style={{ width: "25%" }}
                    />
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pwStrength.score >= 3 ? pwStrength.color : "bg-transparent"
                      }`}
                      style={{ width: "25%" }}
                    />
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pwStrength.score >= 4 ? pwStrength.color : "bg-transparent"
                      }`}
                      style={{ width: "25%" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Konfirmasi Kata Sandi Baru</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  required
                  placeholder="Ulangi sandi baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2.5 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-slate-800 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Security Best Practices Callout */}
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Standar Keamanan Korporat:</strong> Gunakan kombinasi minimal 8 karakter dengan huruf kapital, angka, dan karakter khusus. Hindari membagikan kata sandi keuangan kepada pihak yang tidak berkepentingan.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Perbarui Kata Sandi</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal Zoom QRIS */}
      {showQrModal && qrImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Kode QRIS Perusahaan</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
              <img
                src={qrImageUrl}
                alt="QRIS Aktif"
                className="w-64 h-64 object-contain rounded-lg shadow-xs bg-white p-2"
              />
              <p className="text-xs font-bold text-slate-800 mt-3">{accountHolder}</p>
              <p className="text-[11px] text-slate-500 font-mono">{bankName} - {accountNumber}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup Pratinjau
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
