"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { RoleAuthModal } from "@/components/modals/RoleAuthModal";
import { PublicDashboardView } from "@/components/views/PublicDashboardView";
import { WorklogView } from "@/components/views/WorklogView";
import { MonthlyPlanView } from "@/components/views/MonthlyPlanView";
import { FinanceDashboardView } from "@/components/views/FinanceDashboardView";
import { TransactionsView } from "@/components/views/TransactionsView";
import { FinanceSettingsView } from "@/components/views/FinanceSettingsView";
import { ProjectsView } from "@/components/views/ProjectsView";
import { RabCalculatorView } from "@/components/views/RabCalculatorView";
import { MembersView } from "@/components/views/MembersView";
import { KpiManagementView } from "@/components/views/KpiManagementView";
import { AnnouncementsView } from "@/components/views/AnnouncementsView";
import { ManagementSettingsView } from "@/components/views/ManagementSettingsView";
import { StorageService } from "@/lib/storage";
import { ApiClient } from "@/lib/apiClient";
import { PortalType, ActiveAuthSession, User, Worklog, MonthlyPlan, Transaction, Project, RabProject, KpiEvaluation, Announcement, FinanceSettings } from "@/types";
import { TenantConfig, defaultTenantConfig } from "@/config/tenant.config";
import { Toast } from "@/components/ui/Toast";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<TenantConfig>(defaultTenantConfig);
  const [currentPortal, setCurrentPortal] = useState<PortalType>("REGULER");
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [authSession, setAuthSession] = useState<ActiveAuthSession | null>(null);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authToast, setAuthToast] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Data Store State
  const [users, setUsers] = useState<User[]>([]);
  const [worklogs, setWorklogs] = useState<Worklog[]>([]);
  const [monthlyPlans, setMonthlyPlans] = useState<MonthlyPlan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [rabList, setRabList] = useState<RabProject[]>([]);
  const [currentRab, setCurrentRab] = useState<RabProject>(StorageService.getRab());
  const [kpis, setKpis] = useState<KpiEvaluation[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [financeSettings, setFinanceSettings] = useState<FinanceSettings>(StorageService.getFinanceSettings());

  const refreshData = useCallback(async () => {
    // 1. Local fallback initial
    const tenantCfg = StorageService.getTenantConfig();
    setConfig(tenantCfg);
    setUsers(StorageService.getUsers());
    setWorklogs(StorageService.getWorklogs());
    setMonthlyPlans(StorageService.getMonthlyPlans());
    setTransactions(StorageService.getTransactions());
    setProjects(StorageService.getProjects());
    setKpis(StorageService.getKpis());
    setAnnouncements(StorageService.getAnnouncements());
    setFinanceSettings(StorageService.getFinanceSettings());

    // 2. Fetch fresh real-time data from PostgreSQL API
    try {
      const compId = tenantCfg.id || "sci-tech-01";
      const [u, w, mp, t, p, rabs, kpiData, a, s] = await Promise.all([
        ApiClient.getUsers(compId).catch(() => StorageService.getUsers()),
        ApiClient.getWorklogs(compId).catch(() => StorageService.getWorklogs()),
        ApiClient.getMonthlyPlans(compId).catch(() => StorageService.getMonthlyPlans()),
        ApiClient.getTransactions(compId).catch(() => StorageService.getTransactions()),
        ApiClient.getProjects(compId).catch(() => StorageService.getProjects()),
        ApiClient.getRabList(compId).catch(() => []),
        ApiClient.getKpis(compId).catch(() => ({ kpis: StorageService.getKpis(), userStats: {} })),
        ApiClient.getAnnouncements(compId).catch(() => StorageService.getAnnouncements()),
        ApiClient.getSettings(compId).catch(() => ({ company: null, finance: StorageService.getFinanceSettings() })),
      ]);

      if (u && u.length > 0) setUsers(u);
      if (w) setWorklogs(w);
      if (mp) setMonthlyPlans(mp);
      if (t) setTransactions(t);
      if (p) setProjects(p);
      if (rabs && rabs.length > 0) {
        setRabList(rabs);
        // Load items for the first rab
        ApiClient.getRabById(rabs[0].id)
          .then((fullRab) => setCurrentRab(fullRab))
          .catch(() => setCurrentRab(StorageService.getRab()));
      }
      if (kpiData && kpiData.kpis) setKpis(kpiData.kpis);
      if (a) setAnnouncements(a);
      if (s && s.finance) setFinanceSettings(s.finance);
    } catch (e) {
      console.warn("PostgreSQL sync deferred, operating on local cache:", e);
    }
  }, []);

  useEffect(() => {
    setMounted(true);

    // Restore persistent session from sessionStorage (prevents logout on F5)
    try {
      const savedSession = sessionStorage.getItem("sci_tech_auth_session");
      if (savedSession) {
        const parsed: ActiveAuthSession = JSON.parse(savedSession);
        setAuthSession(parsed);
        setCurrentPortal(parsed.portal);
        if (parsed.portal === "KEUANGAN") setActiveTab("finance_dash");
        else if (parsed.portal === "PROYEK") setActiveTab("projects");
        else if (parsed.portal === "MANAJEMEN") setActiveTab("members");
      }
    } catch {
      // Ignore sessionStorage parsing error
    }

    refreshData();
  }, [refreshData]);

  const handleAuthSuccess = (portal: PortalType, sessionData?: { userId?: string; userName?: string }) => {
    setCurrentPortal(portal);
    const resolvedName = sessionData?.userName || (portal === "KEUANGAN" ? "Admin Keuangan" : portal === "MANAJEMEN" ? "Executive CEO" : "Teknisi Lapangan");
    const portalLabel = portal === "KEUANGAN" ? "Portal Keuangan" : portal === "PROYEK" ? "Portal Proyek & RAB" : "Portal Manajemen / CEO";

    const newSession: ActiveAuthSession = {
      portal,
      authenticated: true,
      userId: sessionData?.userId,
      userName: resolvedName,
      loginTime: new Date().toISOString(),
    };
    setAuthSession(newSession);

    // Persist to sessionStorage
    try {
      sessionStorage.setItem("sci_tech_auth_session", JSON.stringify(newSession));
    } catch {
      // Ignore
    }

    // Switch default tab for the portal
    if (portal === "KEUANGAN") setActiveTab("finance_dash");
    else if (portal === "PROYEK") setActiveTab("projects");
    else if (portal === "MANAJEMEN") setActiveTab("members");

    // Tampilkan pop-up berhasil login
    setAuthToast({
      type: "success",
      message: `Berhasil login sebagai ${resolvedName} (${portalLabel})`,
    });
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      setCurrentPortal("REGULER");
      setAuthSession(null);
      setActiveTab("dashboard");
      try {
        sessionStorage.removeItem("sci_tech_auth_session");
      } catch {
        // Ignore
      }
      setIsLoggingOut(false);
      setAuthToast({
        type: "info",
        message: "Anda telah berhasil logout. Kembali ke Akses Publik.",
      });
    }, 600);
  };

  const handleDownloadCompro = () => {
    if (config.assets.companyProfileUrl && config.assets.companyProfileUrl.startsWith("/uploads")) {
      window.open(config.assets.companyProfileUrl, "_blank");
    } else {
      // Create branded downloadable document blob
      const content = `COMPANY PROFILE RESMI\n${config.name} (${config.legalName})\nTagline: ${config.tagline}\nWebsite: ${config.contact.website}\nEmail: ${config.contact.email}\nAlamat: ${config.contact.address}\n\nDokumen resmi diterbitkan melalui Enterprise MIS SCI Tech.`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${config.name.replace(/\s+/g, "_")}_Company_Profile.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadPitchDeck = () => {
    if (config.assets.pitchDeckUrl && config.assets.pitchDeckUrl.startsWith("/uploads")) {
      window.open(config.assets.pitchDeckUrl, "_blank");
    } else {
      const content = `PITCH DECK PRESENTASI INVESTOR\n${config.name} (${config.legalName})\nSolusi Infrastruktur & Multi-Tenant Enterprise OS\nKontak: ${config.contact.email}\n\nVersi 2026. Hak Cipta Dilindungi.`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${config.name.replace(/\s+/g, "_")}_Pitch_Deck.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Memuat Sistem Konsol SCI Tech & PostgreSQL...</p>
        </div>
      </div>
    );
  }

  // Calculate live cash total from transactions
  const totalMasuk = transactions.filter((t) => t.tipe === "PEMASUKAN").reduce((a, b) => a + Number(b.total_harga), 0);
  const totalKeluar = transactions.filter((t) => t.tipe === "PENGELUARAN").reduce((a, b) => a + Number(b.total_harga), 0);
  const liveCashTotal = totalMasuk - totalKeluar;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        config={config}
        currentPortal={currentPortal}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        userName={authSession?.userName}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          config={config}
          currentPortal={currentPortal}
          userName={authSession?.userName}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          onDownloadCompro={handleDownloadCompro}
          onDownloadPitchDeck={handleDownloadPitchDeck}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Public Views */}
          {activeTab === "dashboard" && (
            <PublicDashboardView
              config={config}
              announcements={announcements}
              projects={projects}
              kpis={kpis}
              users={users}
              worklogs={worklogs}
              financeSettings={financeSettings}
              cashTotal={liveCashTotal}
            />
          )}

          {activeTab === "worklog" && (
            <WorklogView
              config={config}
              worklogs={worklogs}
              users={users}
              plans={monthlyPlans}
              onRefresh={refreshData}
            />
          )}

          {activeTab === "plan" && (
            <MonthlyPlanView
              config={config}
              plans={monthlyPlans}
              users={users}
              onRefresh={refreshData}
            />
          )}

          {/* Finance Portal Views */}
          {activeTab === "finance_dash" && (
            <FinanceDashboardView
              config={config}
              transactions={transactions}
              onNavigateToTransactions={() => setActiveTab("transactions")}
              onRefresh={refreshData}
              loggedInUserName={authSession?.userName}
            />
          )}

          {activeTab === "transactions" && (
            <TransactionsView
              config={config}
              transactions={transactions}
              onRefresh={refreshData}
            />
          )}

          {activeTab === "finance_settings" && (
            <FinanceSettingsView
              config={config}
              financeSettings={financeSettings}
              onRefresh={refreshData}
            />
          )}

          {/* Project & RAB Portal Views */}
          {activeTab === "projects" && (
            <ProjectsView
              config={config}
              projects={projects}
              users={users}
              rabList={rabList}
              currentUserName={authSession?.userName}
              onRefresh={refreshData}
            />
          )}

          {activeTab === "rab" && (
            <RabCalculatorView
              config={config}
              rab={currentRab}
              rabList={rabList}
              users={users}
              currentUserName={authSession?.userName}
              onSelectRab={(selectedId) => {
                ApiClient.getRabById(selectedId).then(setCurrentRab).catch(console.error);
              }}
              onRefresh={refreshData}
            />
          )}

          {/* Management & CEO Portal Views */}
          {activeTab === "members" && (
            <MembersView
              config={config}
              users={users}
              currentUserRole={authSession?.role}
              onRefresh={refreshData}
            />
          )}

          {activeTab === "kpi" && (
            <KpiManagementView
              config={config}
              kpis={kpis}
              users={users}
              onRefresh={refreshData}
            />
          )}

          {activeTab === "announcements" && (
            <AnnouncementsView
              config={config}
              announcements={announcements}
              onRefresh={refreshData}
            />
          )}

          {activeTab === "management_settings" && (
            <ManagementSettingsView
              config={config}
              onRefresh={refreshData}
            />
          )}
        </main>
      </div>

      {/* Role Authentication Modal */}
      <RoleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        config={config}
        onSuccess={handleAuthSuccess}
      />

      {/* Logout Fullscreen Transition Overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3 border border-slate-100">
            <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-800">Mengakhiri sesi & memproses logout...</p>
          </div>
        </div>
      )}

      {/* Pop-up Toast Login / Logout Feedback */}
      {authToast && (
        <Toast
          type={authToast.type}
          message={authToast.message}
          onClose={() => setAuthToast(null)}
          duration={3500}
        />
      )}
    </div>
  );
}
