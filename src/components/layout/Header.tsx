"use client";

import React, { useState } from "react";
import { FileText, Download, ShieldCheck, LogIn, Menu, LogOut, ChevronDown } from "lucide-react";
import { TenantConfig } from "@/config/tenant.config";
import { PortalType } from "@/types";

interface HeaderProps {
  config: TenantConfig;
  currentPortal: PortalType;
  userName?: string;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onDownloadCompro: () => void;
  onDownloadPitchDeck: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  currentPortal,
  userName,
  onOpenAuthModal,
  onLogout,
  onDownloadCompro,
  onDownloadPitchDeck,
  onToggleSidebar,
}) => {
  const [showDocsMenu, setShowDocsMenu] = useState(false);

  const getPortalLabel = () => {
    switch (currentPortal) {
      case "KEUANGAN":
        return { name: "Portal Keuangan", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "PROYEK":
        return { name: "Portal Proyek & RAB", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "MANAJEMEN":
        return { name: "Portal Manajemen / CEO", color: "bg-purple-50 text-purple-700 border-purple-200" };
      default:
        return { name: "Akses Publik Reguler", color: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  const portalInfo = getPortalLabel();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left side: Hamburger (mobile/tablet) & corporate title / portal badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <h2 className="hidden sm:block text-xs font-bold text-slate-700 tracking-wide uppercase">
            Management Information System
          </h2>
          {currentPortal !== "REGULER" && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${portalInfo.color}`}
            >
              {portalInfo.name}
            </span>
          )}
        </div>
      </div>

      {/* Right side: Compro, Pitch Deck, Login / Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Dropdown for Documents */}
        <div className="relative md:hidden">
          <button
            onClick={() => setShowDocsMenu(!showDocsMenu)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px]">Dokumen</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showDocsMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDocsMenu(false)}
              />
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
                <button
                  onClick={() => {
                    setShowDocsMenu(false);
                    onDownloadCompro();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Company Profile</span>
                </button>
                <button
                  onClick={() => {
                    setShowDocsMenu(false);
                    onDownloadPitchDeck();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Pitch Deck</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Company Profile PDF (Desktop/Tablet) */}
        <button
          onClick={onDownloadCompro}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Unduh Company Profile Resmi"
        >
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span>Company Profile (PDF)</span>
        </button>

        {/* Pitch Deck PDF (Desktop/Tablet) */}
        <button
          onClick={onDownloadPitchDeck}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Unduh Pitch Deck Perusahaan"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>Pitch Deck (PDF)</span>
        </button>

        <div className="h-4 w-px bg-slate-200 hidden md:block" />

        {currentPortal === "REGULER" ? (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 py-1.5 px-3 sm:px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all cursor-pointer shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-blue-200" />
            <span className="hidden sm:inline">Login Portal</span>
            <span className="sm:hidden">Login</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs font-medium text-slate-600 truncate max-w-[120px]">
              {userName || "Pengguna Aktif"}
            </span>
            <button
              onClick={onLogout}
              className="lg:hidden p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
