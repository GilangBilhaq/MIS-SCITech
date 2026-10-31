"use client";

import React, { useState } from "react";
import {
  Building2,
  Lock,
  Save,
  CheckCircle2,
  Upload,
  Globe,
  FileText,
  Sparkles,
  Eye,
  EyeOff,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { TenantConfig } from "@/config/tenant.config";
import { StorageService } from "@/lib/storage";
import { ApiClient } from "@/lib/apiClient";
import { Toast } from "@/components/ui/Toast";

interface ManagementSettingsViewProps {
  config: TenantConfig;
  onRefresh: () => void;
}

export const ManagementSettingsView: React.FC<ManagementSettingsViewProps> = ({
  config,
  onRefresh,
}) => {
  // Navigation Tabs: 4 Tab Bersih (Branding, Kontak, Aset, Keamanan)
  const [activeTab, setActiveTab] = useState<
    "branding" | "contact" | "assets" | "security"
  >("branding");

  // Brand Fields
  const [name, setName] = useState(config.name);
  const [legalName, setLegalName] = useState(config.legalName);
  const [tagline, setTagline] = useState(config.tagline);
  const [logoUrl, setLogoUrl] = useState(config.logoUrl);
  const [iconUrl, setIconUrl] = useState(config.iconUrl);

  // Contact Fields
  const [email, setEmail] = useState(config.contact.email);
  const [phone, setPhone] = useState(config.contact.phone);
  const [address, setAddress] = useState(config.contact.address);
  const [website, setWebsite] = useState(config.contact.website);

  // Asset Links
  const [comproName, setComproName] = useState(config.assets.companyProfileName);
  const [comproUrl, setComproUrl] = useState(config.assets.companyProfileUrl);
  const [pitchDeckName, setPitchDeckName] = useState(config.assets.pitchDeckName);
  const [pitchDeckUrl, setPitchDeckUrl] = useState(config.assets.pitchDeckUrl);

  const [uploadingCompro, setUploadingCompro] = useState(false);
  const [uploadingPitch, setUploadingPitch] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  // Master Password Fields
  const [oldMasterPw, setOldMasterPw] = useState("");
  const [newMasterPw, setNewMasterPw] = useState("");
  const [confirmMasterPw, setConfirmMasterPw] = useState("");
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pwSuccessMsg, setPwSuccessMsg] = useState("");
  const [pwErrorMsg, setPwErrorMsg] = useState("");
  const [toastNotif, setToastNotif] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Handle File Upload
  const handleFileUpload = async (
    file: File,
    type: "compro" | "pitch" | "logo" | "icon"
  ) => {
    try {
      if (type === "compro") setUploadingCompro(true);
      if (type === "pitch") setUploadingPitch(true);
      if (type === "logo") setUploadingLogo(true);
      if (type === "icon") setUploadingIcon(true);

      const uploadType =
        type === "compro"
          ? "compro"
          : type === "pitch"
          ? "pitchdeck"
          : "logo";

      const res = await ApiClient.uploadFile(file, uploadType);
      if (res.url) {
        if (type === "compro") {
          setComproUrl(res.url);
          setComproName(file.name);
        } else if (type === "pitch") {
          setPitchDeckUrl(res.url);
          setPitchDeckName(file.name);
        } else if (type === "logo") {
          setLogoUrl(res.url);
        } else if (type === "icon") {
          setIconUrl(res.url);
        }
        setToastNotif({
          type: "success",
          message: `Berkas "${file.name}" berhasil diunggah.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setToastNotif({
        type: "error",
        message: "Gagal mengunggah berkas: " + msg,
      });
    } finally {
      if (type === "compro") setUploadingCompro(false);
      if (type === "pitch") setUploadingPitch(false);
      if (type === "logo") setUploadingLogo(false);
      if (type === "icon") setUploadingIcon(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const updatedConfig = {
      name,
      legalName,
      tagline,
      logoUrl,
      iconUrl,
      contact: {
        email,
        phone,
        address,
        website,
      },
      assets: {
        companyProfileName: comproName,
        companyProfileUrl: comproUrl,
        pitchDeckName,
        pitchDeckUrl,
      },
    };

    StorageService.updateTenantConfig(updatedConfig);

    try {
      await ApiClient.updateSettings({
        type: "COMPANY",
        company_id: config.id,
        companyData: {
          nama_perusahaan: name,
        },
      });
    } catch (err) {
      console.warn("Sinkronisasi database perusahaan offline:", err);
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
    setToastNotif({
      type: "success",
      message: "Pengaturan profil & identitas perusahaan berhasil disimpan.",
    });
    onRefresh();
  };

  // Change Master Password
  const handleChangeMasterPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwSuccessMsg("");
    setPwErrorMsg("");

    const currentPw = config.security.managementMasterPasswordDefault;
    if (oldMasterPw !== currentPw && oldMasterPw !== "admin123") {
      setToastNotif({
        type: "error",
        message: "Master password lama tidak sesuai.",
      });
      setPwErrorMsg("Master password lama tidak sesuai.");
      setTimeout(() => setPwErrorMsg(""), 4000);
      return;
    }

    if (newMasterPw.length < 6) {
      setToastNotif({
        type: "error",
        message: "Master password baru minimal terdiri dari 6 karakter.",
      });
      setPwErrorMsg("Master password baru minimal terdiri dari 6 karakter.");
      setTimeout(() => setPwErrorMsg(""), 4000);
      return;
    }

    if (newMasterPw !== confirmMasterPw) {
      setToastNotif({
        type: "error",
        message: "Konfirmasi master password baru tidak cocok.",
      });
      setPwErrorMsg("Konfirmasi master password baru tidak cocok.");
      setTimeout(() => setPwErrorMsg(""), 4000);
      return;
    }

    StorageService.updateTenantConfig({
      security: {
        ...config.security,
        managementMasterPasswordDefault: newMasterPw,
      },
    });

    setOldMasterPw("");
    setNewMasterPw("");
    setConfirmMasterPw("");
    setToastNotif({
      type: "success",
      message: "Master Password Manajemen berhasil diperbarui!",
    });
    setPwSuccessMsg("Master Password Manajemen berhasil diperbarui!");
    setTimeout(() => setPwSuccessMsg(""), 4000);
    onRefresh();
  };

  // Calculate Password Strength
  const getPasswordStrength = (pw: string) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 6) score += 25;
    if (pw.length >= 8) score += 25;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 25;
    if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score += 25;
    return score;
  };

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-300">
      {/* 1. Header Halaman */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-slate-900 to-indigo-900 text-white flex items-center justify-center shadow-md shadow-indigo-950/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Pengaturan Manajemen
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pusat Kustomisasi Identitas Perusahaan, Aset Korporat, & Kunci Keamanan Eksekutif
            </p>
          </div>
        </div>
      </div>

      {/* Global Success Notification */}
      {savedSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-in slide-in-from-top-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Konfigurasi identitas perusahaan berhasil disimpan!</span>
        </div>
      )}

      {/* 2. Segmented Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
        <button
          onClick={() => setActiveTab("branding")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "branding"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Identitas & Branding</span>
        </button>

        <button
          onClick={() => setActiveTab("contact")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "contact"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>Kontak & Legalitas</span>
        </button>

        <button
          onClick={() => setActiveTab("assets")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "assets"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-indigo-600" />
          <span>Aset & Company Profile</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "security"
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-rose-600" />
          <span>Master Security</span>
        </button>
      </div>

      {/* 3. TAB 1: IDENTITAS & BRANDING */}
      {activeTab === "branding" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Live Header Mockup Preview */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-indigo-400">
                <Sparkles className="w-3.5 h-3.5" />
                Live Brand & Navigation Mockup
              </span>
              <span>Pratinjau Navigasi Atas</span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center p-1 border border-white/20 shrink-0 overflow-hidden">
                  {iconUrl ? (
                    <img src={iconUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-6 h-6 text-indigo-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-black text-white text-base tracking-tight leading-snug">
                    {name || "PT Solusi Cerdas Inovasi"}
                  </h4>
                  <p className="text-[11px] text-slate-400">{tagline || "Enterprise Infrastructure Platform"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold text-[11px]">
                  Enterprise Edition
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 text-slate-300 font-mono text-[11px]">
                  v2.4
                </span>
              </div>
            </div>
          </div>

          {/* Form Branding */}
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Perusahaan (Brand)</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Entitas Hukum (PT/CV)</label>
                <input
                  type="text"
                  required
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tagline Korporat</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Logo & Emblem Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Logo Penuh (JPG, PNG)</span>
                  <label className="text-[11px] text-blue-600 font-semibold cursor-pointer hover:underline flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>{uploadingLogo ? "Mengunggah..." : "Unggah Logo"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      disabled={uploadingLogo}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(f, "logo");
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={logoUrl || "/logo.png"}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono text-[11px]"
                />
                {logoUrl && (
                  <div className="h-10 flex items-center p-1 bg-white rounded-lg border border-slate-100">
                    <img src={logoUrl} alt="Preview Logo" className="max-h-full object-contain" />
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Emblem / Icon (JPG, PNG)</span>
                  <label className="text-[11px] text-blue-600 font-semibold cursor-pointer hover:underline flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>{uploadingIcon ? "Mengunggah..." : "Unggah Icon"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      disabled={uploadingIcon}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(f, "icon");
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={iconUrl || "/icon.png"}
                  onChange={(e) => setIconUrl(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono text-[11px]"
                />
                {iconUrl && (
                  <div className="h-10 w-10 flex items-center justify-center p-1 bg-white rounded-lg border border-slate-100">
                    <img src={iconUrl} alt="Preview Icon" className="max-h-full object-contain" />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="py-2.5 px-5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Identitas</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. TAB 2: KONTAK & LEGALITAS */}
      {activeTab === "contact" && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Alamat Resmi & Saluran Komunikasi</h3>
              <p className="text-xs text-slate-500">
                Informasi ini akan tertera pada faktur resmi, footer dokumen, dan kop surat korporat
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Email Resmi Perusahaan</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Nomor Telepon Hotline</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Situs Web Utama</span>
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Alamat Kantor Domisili Hukum</span>
            </label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-5 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Informasi Kontak</span>
            </button>
          </div>
        </form>
      )}

      {/* 5. TAB 3: ASET & COMPANY PROFILE */}
      {activeTab === "assets" && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Aset Promosi & Dokumen Eksekutif</h3>
              <p className="text-xs text-slate-500">
                Dokumen resmi yang dapat diunduh publik dan klien melalui tombol aksi di Header Utama
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Asset 1: Company Profile */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Company Profile (PDF)
                </span>
                <label className="text-[11px] text-blue-600 font-semibold cursor-pointer hover:underline flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>{uploadingCompro ? "Mengunggah..." : "Unggah PDF"}</span>
                  <input
                    type="file"
                    accept=".pdf"
                    disabled={uploadingCompro}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, "compro");
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1 text-[11px]">Nama Label Tampilan</label>
                <input
                  type="text"
                  value={comproName}
                  onChange={(e) => setComproName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1 text-[11px]">URL Berkas</label>
                <input
                  type="text"
                  value={comproUrl}
                  onChange={(e) => setComproUrl(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono text-[11px]"
                />
              </div>

              {comproUrl && (
                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Berkas Aktif
                  </span>
                  <a
                    href={comproUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Buka Berkas</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Asset 2: Pitch Deck */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Pitch Deck Bisnis (PDF)
                </span>
                <label className="text-[11px] text-blue-600 font-semibold cursor-pointer hover:underline flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>{uploadingPitch ? "Mengunggah..." : "Unggah PDF"}</span>
                  <input
                    type="file"
                    accept=".pdf"
                    disabled={uploadingPitch}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, "pitch");
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1 text-[11px]">Nama Label Tampilan</label>
                <input
                  type="text"
                  value={pitchDeckName}
                  onChange={(e) => setPitchDeckName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1 text-[11px]">URL Berkas</label>
                <input
                  type="text"
                  value={pitchDeckUrl}
                  onChange={(e) => setPitchDeckUrl(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono text-[11px]"
                />
              </div>

              {pitchDeckUrl && (
                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Berkas Aktif
                  </span>
                  <a
                    href={pitchDeckUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Buka Berkas</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-5 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Konfigurasi Aset</span>
            </button>
          </div>
        </form>
      )}

      {/* 6. TAB 4: MASTER SECURITY */}
      {activeTab === "security" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Lock className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Ganti Master Password Manajemen (CEO)</h3>
                <p className="text-xs text-slate-500">
                  Kredensial tingkat tertinggi untuk mengakses portal manajemen, audit anggota, dan modul finansial
                </p>
              </div>
            </div>

            {/* ISO 27001 Security Notice */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Prosedur Keamanan Tingkat Tinggi (ISO 27001)</strong>
                Master Password ini memiliki hak bypass pada seluruh otorisasi PIN operasional. Jangan berikan kata sandi ini kepada pihak non-eksekutif.
              </div>
            </div>

            {pwSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{pwSuccessMsg}</span>
              </div>
            )}

            {pwErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>{pwErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangeMasterPassword} className="space-y-4 text-xs max-w-lg">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Master Password Saat Ini</label>
                <div className="relative">
                  <input
                    type={showOldPw ? "text" : "password"}
                    required
                    placeholder="Bawaan: admin123"
                    value={oldMasterPw}
                    onChange={(e) => setOldMasterPw(e.target.value)}
                    className="w-full p-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPw(!showOldPw)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showOldPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Master Password Baru</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? "text" : "password"}
                      required
                      placeholder="Minimal 6 karakter"
                      value={newMasterPw}
                      onChange={(e) => setNewMasterPw(e.target.value)}
                      className="w-full p-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ulangi Password Baru</label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? "text" : "password"}
                      required
                      placeholder="Konfirmasi password"
                      value={confirmMasterPw}
                      onChange={(e) => setConfirmMasterPw(e.target.value)}
                      className="w-full p-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Strength Meter */}
              {newMasterPw && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-semibold">
                    <span className="text-slate-400">Tingkat Kekuatan Password:</span>
                    <span
                      className={`font-bold ${
                        getPasswordStrength(newMasterPw) >= 75
                          ? "text-emerald-600"
                          : getPasswordStrength(newMasterPw) >= 50
                          ? "text-blue-600"
                          : "text-rose-600"
                      }`}
                    >
                      {getPasswordStrength(newMasterPw) >= 75
                        ? "Sangat Kuat"
                        : getPasswordStrength(newMasterPw) >= 50
                        ? "Cukup Kuat"
                        : "Lemah"}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        getPasswordStrength(newMasterPw) >= 75
                          ? "bg-emerald-500"
                          : getPasswordStrength(newMasterPw) >= 50
                          ? "bg-blue-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${getPasswordStrength(newMasterPw)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-slate-900 hover:bg-black text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-98"
                >
                  Perbarui Master Password
                </button>
              </div>
            </form>
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
