"use client";

import React from "react";
import {
  LayoutDashboard,
  Clock,
  Calendar,
  LineChart,
  Receipt,
  Settings,
  FolderKanban,
  Calculator,
  Users,
  Award,
  Megaphone,
  Sliders,
  LogOut,
  Building2,
  Lock,
  X,
} from "lucide-react";
import { TenantConfig } from "@/config/tenant.config";
import { PortalType } from "@/types";

interface SidebarProps {
  config: TenantConfig;
  currentPortal: PortalType;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  userName?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  config,
  currentPortal,
  activeTab,
  setActiveTab,
  onLogout,
  userName,
  isOpen = false,
  onClose,
}) => {
  const [imgError, setImgError] = React.useState(false);

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile & Tablet Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Element */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 h-screen transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center p-1 shrink-0 shadow-xs overflow-hidden">
                {!imgError && config.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.iconUrl}
                    alt={config.name}
                    className="w-full h-full object-contain"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <Building2 className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div className="overflow-hidden">
                <h1 className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                  {config.name}
                </h1>
                <p className="text-[10px] text-slate-500 font-medium truncate">Management Information System</p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-6 flex-1 overflow-y-auto">
            {/* Public Group */}
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Akses Terbuka
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => handleNavClick("dashboard")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "dashboard"
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>Dashboard Utama</span>
                </button>

                <button
                  onClick={() => handleNavClick("worklog")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "worklog"
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Worklog Tim</span>
                </button>

                <button
                  onClick={() => handleNavClick("plan")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "plan"
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>Rencana Bulanan</span>
                </button>
              </div>
            </div>

            {/* Finance Portal Links */}
            {(currentPortal === "KEUANGAN" || currentPortal === "MANAJEMEN") && (
              <div>
                <div className="px-3 flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    Portal Keuangan
                  </p>
                  <Lock className="w-3 h-3 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => handleNavClick("finance_dash")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === "finance_dash"
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <LineChart className="w-4 h-4 shrink-0" />
                    <span>Dashboard Kas & Laba</span>
                  </button>

                  <button
                    onClick={() => handleNavClick("transactions")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === "transactions"
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Receipt className="w-4 h-4 shrink-0" />
                    <span>Buku Kas & Transaksi</span>
                  </button>

                  <button
                    onClick={() => handleNavClick("finance_settings")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === "finance_settings"
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    <span>Pengaturan Keuangan</span>
                  </button>
                </div>
              </div>
            )}

            {/* Project Portal Links */}
            {(currentPortal === "PROYEK" || currentPortal === "MANAJEMEN") && (
              <div>
                <div className="px-3 flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    Portal Proyek & RAB
                  </p>
                  <Lock className="w-3 h-3 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => handleNavClick("projects")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === "projects"
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <FolderKanban className="w-4 h-4 shrink-0" />
                    <span>Daftar Proyek Aktif</span>
                  </button>

                  <button
                    onClick={() => handleNavClick("rab")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === "rab"
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Calculator className="w-4 h-4 shrink-0" />
                    <span>Kalkulator & Form RAB</span>
                  </button>
                </div>
              </div>
            )}

            {/* Management Portal Links */}
            {currentPortal === "MANAJEMEN" && (
              <div>
                <div className="px-3 flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                    Portal Manajemen
                  </p>
                  <Lock className="w-3 h-3 text-purple-600" />
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => handleNavClick("members")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === "members"
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>Data Anggota & PIN</span>
                  </button>

                  <button
                    onClick={() => handleNavClick("kpi")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === "kpi"
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Award className="w-4 h-4 shrink-0" />
                    <span>KPI Anggota</span>
                  </button>

                  <button
                    onClick={() => handleNavClick("announcements")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === "announcements"
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Megaphone className="w-4 h-4 shrink-0" />
                    <span>Informasi & Pengumuman</span>
                  </button>

                  <button
                    onClick={() => handleNavClick("management_settings")}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === "management_settings"
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Sliders className="w-4 h-4 shrink-0" />
                    <span>Pengaturan Manajemen</span>
                  </button>
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* Footer Role Card & Logout */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          {currentPortal !== "REGULER" ? (
            <div>
              <button
                onClick={() => {
                  onLogout();
                  if (onClose) onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <p className="text-[11px] font-semibold text-slate-700">Management System Information</p>
              <p className="text-[10px] text-slate-400 mt-0.5">by SCI Tech</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
