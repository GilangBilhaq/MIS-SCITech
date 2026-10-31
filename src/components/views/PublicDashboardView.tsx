"use client";

import React, { useState } from "react";
import {
  Rocket,
  LineChart,
  Eye,
  Calendar,
  Lock,
  Sparkles,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Search,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { TenantConfig } from "@/config/tenant.config";
import { Project, KpiEvaluation, Announcement, FinanceSettings, User, Worklog } from "@/types";

interface PublicDashboardViewProps {
  config: TenantConfig;
  announcements: Announcement[];
  projects: Project[];
  kpis: KpiEvaluation[];
  users: User[];
  worklogs?: Worklog[];
  financeSettings: FinanceSettings;
  cashTotal: number;
}

export const PublicDashboardView: React.FC<PublicDashboardViewProps> = ({
  config,
  announcements,
  projects,
  kpis,
  users,
  worklogs = [],
  financeSettings,
  cashTotal,
}) => {
  const [kpiSearch, setKpiSearch] = useState("");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const activeAnnouncement = announcements.find((a) => a.is_published) || announcements[0];
  const publishedKpis = kpis.filter((k) => k.is_published);

  const filteredKpis = publishedKpis.filter((k) => {
    const u = users.find((user) => user.id === k.user_id);
    const search = kpiSearch.toLowerCase();
    return (
      k.indikator_kpi.toLowerCase().includes(search) ||
      k.skor_kategori.toLowerCase().includes(search) ||
      (u?.nama_lengkap && u.nama_lengkap.toLowerCase().includes(search)) ||
      (u?.divisi && u.divisi.toLowerCase().includes(search)) ||
      (u?.jabatan && u.jabatan.toLowerCase().includes(search))
    );
  });

  // Find Top Performer
  const topKpi = [...publishedKpis].sort((a, b) => b.skor - a.skor)[0];
  const topUser = topKpi ? users.find((u) => u.id === topKpi.user_id) : null;

  const getUser = (userId: string) => users.find((u) => u.id === userId);

  // Recent 4 worklogs for live stream
  const recentWorklogs = [...worklogs].slice(0, 4);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Title & Live Operational Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Portal {config.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ruang Informasi dan Operasional
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-xs text-xs font-semibold text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Operasional Aktif (08:00 - 17:00 WIB)</span>
        </div>
      </div>

      {/* Top Announcement Banner */}
      {activeAnnouncement && (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(activeAnnouncement.tanggal_terbit).toLocaleDateString("id-ID", { dateStyle: "long" })}</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                    {activeAnnouncement.prioritas}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">{activeAnnouncement.judul}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl line-clamp-2">
                  {activeAnnouncement.isi_pengumuman}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedAnnouncement(activeAnnouncement)}
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <span>Baca Selengkapnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Proyek Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Proyek Aktif
            </p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {projects.length} Inisiatif
            </h4>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% On Track & Berjalan Sesuai Timeline</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <Rocket className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Rata-Rata Skor Sprint */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Rata-Rata Skor Sprint
            </p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">
              {kpis.length > 0 ? (kpis.reduce((acc, k) => acc + Number(k.skor), 0) / kpis.length).toFixed(1) : "94.8"}%
            </h4>
            <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Target Tercapai (Target: 90%) • High Velocity</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
            <LineChart className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Cash Status with Privacy Lock */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Status Kas Perusahaan
              </p>
              <Lock className="w-3 h-3 text-slate-400" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              {financeSettings.show_cash_to_public ? (
                <h4 className="text-2xl font-black text-slate-900 font-mono">
                  Rp {cashTotal.toLocaleString("id-ID")}
                </h4>
              ) : (
                <div className="flex items-center gap-1 text-slate-700 py-1 font-mono font-bold text-xl">
                  <span>Rp</span>
                  <span className="tracking-widest text-slate-400">••••••••••</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {financeSettings.show_cash_to_public
                ? "Diverifikasi Keuangan (Publik)"
                : "Privat • Khusus Otoritas Finansial"}
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors ${
              financeSettings.show_cash_to_public
                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                : "bg-slate-50 text-slate-400 border-slate-200"
            }`}
            title={
              financeSettings.show_cash_to_public
                ? "Kas Terbuka untuk Publik"
                : "Kas Ditutup untuk Publik (Konfigurasi Keuangan)"
            }
          >
            {financeSettings.show_cash_to_public ? (
              <Eye className="w-5 h-5" />
            ) : (
              <Lock className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {/* Proyek Berjalan Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Proyek Berjalan</h3>
          <span className="text-xs text-slate-400 font-medium">Monitoring Real-Time Operasional</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {projects.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
              Belum ada proyek aktif yang dipublikasikan saat ini.
            </div>
          ) : (
            projects.map((proj) => {
              const isCompleted = proj.progress_persen === 100;
              const isNearDone = proj.progress_persen >= 75;
              const healthBadge = isCompleted ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Selesai (Production)
                </span>
              ) : isNearDone ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Tahap UAT / Review
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Active Sprint
                </span>
              );

              return (
                <div
                  key={proj.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px] border border-slate-200">
                        {proj.divisi_tag}
                      </span>
                      {healthBadge}
                    </div>

                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                        {proj.nama_project.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">{proj.nama_project}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{proj.client}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center text-[11px] font-semibold mb-1.5">
                        <span className="text-slate-600">{proj.tahapan_saat_ini}</span>
                        <span className="text-blue-600 font-mono">{proj.progress_persen}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${proj.progress_persen}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">
                      PIC: <strong className="text-slate-700">{proj.pic_teknisi}</strong>
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Target: {proj.deadline}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2-Column Section: Live Activity Stream & Top Performer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Rapor Kinerja & KPI Talenta */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Rapor Kinerja & KPI Talenta
                  </h3>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    Kuartal 2026
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evaluasi kinerja terpublikasi resmi oleh Direksi & Manajemen
                </p>
              </div>

              {/* Search Mini Filter */}
              <div className="w-full sm:w-56 relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  placeholder="Cari anggota / divisi..."
                  value={kpiSearch}
                  onChange={(e) => setKpiSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 px-3">Anggota Tim</th>
                    <th className="pb-3 px-3">Divisi & Fokus</th>
                    <th className="pb-3 px-3">Pencapaian KPI</th>
                    <th className="pb-3 px-3 text-right">Skor Evaluasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKpis.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Tidak ada rapor kinerja yang sesuai dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredKpis.map((kpi) => {
                      const user = getUser(kpi.user_id);
                      const isTop = topKpi?.id === kpi.id;

                      return (
                        <tr key={kpi.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                                  {user?.nama_lengkap.slice(0, 2).toUpperCase() || "ST"}
                                </div>
                                {isTop && (
                                  <div
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-amber-900 rounded-full flex items-center justify-center shadow-xs"
                                    title="Top Performer of the Quarter"
                                  >
                                    <Trophy className="w-2.5 h-2.5" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                  <span>{user?.nama_lengkap || "Staf"}</span>
                                  {isTop && (
                                    <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1 rounded font-bold">
                                      Top #1
                                    </span>
                                  )}
                                </h5>
                                <p className="text-[10px] text-slate-400">{user?.divisi || "Divisi Operasional"}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <p className="font-semibold text-slate-800">{user?.jabatan}</p>
                            <p className="text-[10px] text-slate-500">{user?.divisi}</p>
                          </td>

                          <td className="py-3 px-3">
                            <div className="max-w-xs">
                              <p className="font-medium text-slate-800 text-[11px] line-clamp-1">
                                {kpi.indikator_kpi}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                {kpi.realisasi}
                              </p>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                                  kpi.skor >= 90
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : kpi.skor >= 80
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                <span>{kpi.skor}/100</span>
                                <span>•</span>
                                <span>{kpi.skor_kategori}</span>
                              </span>
                              <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    kpi.skor >= 90
                                      ? "bg-emerald-500"
                                      : kpi.skor >= 80
                                      ? "bg-blue-500"
                                      : "bg-amber-500"
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, kpi.skor))}%` }}
                                />
                              </div>
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
        </div>

        {/* Right Column (1 Col): Live Activity Stream */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Aktivitas Terkini Tim</h3>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Log
              </span>
            </div>

            <div className="space-y-3.5">
              {recentWorklogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Belum ada aktivitas baru hari ini.</p>
              ) : (
                recentWorklogs.map((w) => {
                  const u = getUser(w.user_id);
                  return (
                    <div key={w.id} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-900">{u?.nama_lengkap || "Anggota Tim"}</span>
                        <span className="text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded text-[10px]">
                          {w.jam_durasi} Jam
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {w.pekerjaan}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span>{w.kategori}</span>
                        <span>{w.tanggal}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">Total Transparansi Tim</span>
            <span className="text-[11px] font-bold text-blue-600">Verifikasi 100% PIN</span>
          </div>
        </div>
      </div>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {new Date(selectedAnnouncement.tanggal_terbit).toLocaleDateString("id-ID", { dateStyle: "long" })}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {selectedAnnouncement.prioritas}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{selectedAnnouncement.judul}</h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              {selectedAnnouncement.isi_pengumuman}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Tutup Pengumuman
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
