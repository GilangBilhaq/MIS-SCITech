"use client";

import React, { useState } from "react";
import {
  FolderKanban,
  Plus,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit3,
  Search,
  Download,
  Receipt,
  Layers,
} from "lucide-react";
import { Project, ProjectStage, User, RabProject } from "@/types";
import { TenantConfig } from "@/config/tenant.config";
import { StorageService } from "@/lib/storage";
import { ApiClient } from "@/lib/apiClient";
import { generateProjectReportPdf } from "@/lib/pdfGenerator";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";

interface ProjectsViewProps {
  config: TenantConfig;
  projects: Project[];
  users: User[];
  rabList?: RabProject[];
  currentUserName?: string;
  onRefresh: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  config,
  projects,
  users,
  rabList = [],
  currentUserName,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [picErrorMessage, setPicErrorMessage] = useState("");
  const [deleteTargetProject, setDeleteTargetProject] = useState<Project | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  // Quick Finance Modal
  const [financeModalProject, setFinanceModalProject] = useState<Project | null>(null);
  const [trxTipe, setTrxTipe] = useState<"PEMASUKAN" | "PENGELUARAN">("PEMASUKAN");
  const [trxNama, setTrxNama] = useState("");
  const [trxNominal, setTrxNominal] = useState(15000000);
  const [trxMsg, setTrxMsg] = useState("");
  const [toastNotif, setToastNotif] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Form Fields
  const [formNama, setFormNama] = useState("");
  const [formClient, setFormClient] = useState("");
  const [formPic, setFormPic] = useState(users[0]?.nama_lengkap || "Yosef Satria");
  const [formDeadline, setFormDeadline] = useState("2026-05-30");
  const [formProgress, setFormProgress] = useState(50);
  const [formTahapan, setFormTahapan] = useState<ProjectStage>("Development");
  const [formCatatan, setFormCatatan] = useState("");
  const [formDivisiTag, setFormDivisiTag] = useState("Cloud Infra");
  const [formRabId, setFormRabId] = useState<string>("NONE");

  const filtered = projects.filter(
    (p) =>
      p.nama_project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.pic_teknisi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAdd = () => {
    setPicErrorMessage("");
    setEditingProject(null);
    setFormNama("");
    setFormClient("");
    setFormPic(users[0]?.nama_lengkap || "Yosef Satria");
    setFormDeadline(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0]);
    setFormProgress(25);
    setFormTahapan("Development");
    setFormCatatan("");
    setFormDivisiTag("Cloud Infra");
    setFormRabId("NONE");
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: Project) => {
    // Check if current user is PIC
    if (currentUserName && currentUserName !== "Administrator" && currentUserName !== "Direktur Utama" && currentUserName !== "Anindya Rahma") {
      if (p.pic_teknisi.toLowerCase() !== currentUserName.toLowerCase()) {
        setAccessDeniedMessage(`Anda (${currentUserName}) bukan PIC teknisi untuk proyek ini (${p.pic_teknisi}). Hanya PIC yang berhak mengedit.`);
        return;
      }
    }

    setPicErrorMessage("");
    setEditingProject(p);
    setFormNama(p.nama_project);
    setFormClient(p.client);
    setFormPic(p.pic_teknisi);
    setFormDeadline(p.deadline ? p.deadline.split("T")[0].split(" ")[0] : "");
    setFormProgress(p.progress_persen);
    setFormTahapan(p.tahapan_saat_ini);
    setFormCatatan(p.catatan_teknis);
    setFormDivisiTag(p.divisi_tag);
    setFormRabId(p.rab_id || "NONE");
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      company_id: config.id,
      nama_project: formNama,
      client: formClient,
      pic_teknisi: formPic,
      deadline: formDeadline,
      progress_persen: formProgress,
      tahapan_saat_ini: formTahapan,
      catatan_teknis: formCatatan,
      divisi_tag: formDivisiTag,
      rab_id: formRabId !== "NONE" ? formRabId : undefined,
    };

    try {
      if (editingProject) {
        await ApiClient.updateProject({ id: editingProject.id, ...payload });
        setToastNotif({ type: "success", message: `Data proyek "${formNama}" berhasil diperbarui.` });
      } else {
        await ApiClient.createProject({ ...payload, sprint_info: "Sprint Inisiasi" });
        setToastNotif({ type: "success", message: `Proyek baru "${formNama}" berhasil didaftarkan.` });
      }
    } catch {
      if (editingProject) {
        StorageService.updateProject(editingProject.id, payload);
        setToastNotif({ type: "success", message: `Data proyek "${formNama}" berhasil diperbarui.` });
      } else {
        StorageService.addProject({
          ...payload,
          sprint_info: "Sprint Inisiasi",
        });
        setToastNotif({ type: "success", message: `Proyek baru "${formNama}" berhasil didaftarkan.` });
      }
    }

    setIsAddModalOpen(false);
    onRefresh();
  };

  const handleDeleteClick = (proj: Project) => {
    setDeleteTargetProject(proj);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetProject) return;
    const projName = deleteTargetProject.nama_project;
    try {
      await ApiClient.deleteProject(deleteTargetProject.id);
    } catch {
      StorageService.deleteProject(deleteTargetProject.id);
    }
    setToastNotif({ type: "info", message: `Proyek "${projName}" berhasil dihapus.` });
    setDeleteTargetProject(null);
    onRefresh();
  };

  const handleExportSummary = (proj: Project) => {
    generateProjectReportPdf(proj, config);
    setToastNotif({ type: "success", message: `Laporan resmi proyek "${proj.nama_project}" berhasil diekspor (PDF).` });
  };

  const handleOpenFinanceModal = (proj: Project) => {
    setFinanceModalProject(proj);
    setTrxNama(`Termin Pembayaran: ${proj.nama_project} (${proj.client})`);
    setTrxTipe("PEMASUKAN");
    setTrxNominal(25000000);
    setTrxMsg("");
  };

  const handleSaveProjectTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!financeModalProject) return;

    try {
      await ApiClient.createTransaction({
        company_id: config.id,
        tipe: trxTipe,
        nama_item: trxNama,
        deskripsi: `Dicatat dari Proyek ID: ${financeModalProject.id} (${financeModalProject.client})`,
        tanggal: new Date().toISOString().split("T")[0],
        kegunaan: "Project",
        jumlah: 1,
        harga_pcs: trxNominal,
        metode: "Transfer Bank (BCA)",
      });
      setTrxMsg("✓ Transaksi berhasil dicatat ke Pembukuan Keuangan!");
      setToastNotif({ type: "success", message: `Termin proyek sebesar Rp ${trxNominal.toLocaleString("id-ID")} berhasil dicatat ke Keuangan!` });
      setTimeout(() => {
        setFinanceModalProject(null);
        onRefresh();
      }, 1000);
    } catch {
      StorageService.addTransaction({
        company_id: config.id,
        tipe: trxTipe,
        nama_item: trxNama,
        deskripsi: `Dicatat dari Proyek ID: ${financeModalProject.id} (${financeModalProject.client})`,
        tanggal: new Date().toISOString().split("T")[0],
        kegunaan: "Project",
        jumlah: 1,
        harga_pcs: trxNominal,
        metode: "Transfer Bank (BCA)",
        status_verifikasi: "Terverifikasi",
      });
      setTrxMsg("✓ Transaksi berhasil dicatat ke Pembukuan Keuangan!");
      setToastNotif({ type: "success", message: `Termin proyek sebesar Rp ${trxNominal.toLocaleString("id-ID")} berhasil dicatat ke Keuangan!` });
      setTimeout(() => {
        setFinanceModalProject(null);
        onRefresh();
      }, 1000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Proyek Lapangan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengendalian milestone teknis, delivery sistem, keterhubungan RAB, dan laporan resmi
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Proyek</span>
        </button>
      </div>

      {/* Search Bar (Widened) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="w-full relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Cari nama proyek, klien, atau PIC teknisi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
          />
        </div>
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((proj) => (
          <div
            key={proj.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200">
                  {proj.divisi_tag || "Cloud Infra"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-bold">{proj.id}</span>
              </div>

              {/* Linked RAB Badge */}
              {(proj.rab_nomor || proj.rab_id) && (
                <div className="mb-2 flex items-center gap-1 text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  <Layers className="w-3 h-3 text-indigo-600" />
                  <span>Tautan Dokumen: {proj.rab_nomor || proj.rab_id}</span>
                </div>
              )}

              <h3 className="font-bold text-slate-900 text-sm leading-snug">{proj.nama_project}</h3>
              <p className="text-xs text-slate-500 mt-1">{proj.client}</p>

              {/* Progress Slider */}
              <div className="mt-4">
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                  <span>Progres Implementasi</span>
                  <span className="text-blue-600 font-bold">{proj.progress_persen}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${proj.progress_persen}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400 text-[11px]">Tahapan Saat Ini:</span>
                  <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                    {proj.tahapan_saat_ini}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400 text-[11px]">PIC Teknisi:</span>
                  <span className="font-semibold text-slate-800">{proj.pic_teknisi}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400 text-[11px]">Target Deadline:</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{proj.deadline ? proj.deadline.split("T")[0].split(" ")[0] : "-"}</span>
                  </span>
                </div>

                {proj.catatan_teknis && (
                  <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                    <p className="font-semibold text-slate-700 mb-0.5">Catatan Teknis:</p>
                    <p className="line-clamp-2">{proj.catatan_teknis}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExportSummary(proj)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  title="Unduh Laporan Proyek Resmi (PDF)"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                </button>

                <button
                  onClick={() => handleOpenFinanceModal(proj)}
                  className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  title="Catat Termin / Biaya ke Keuangan"
                >
                  <Receipt className="w-4 h-4 text-emerald-600" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(proj)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  title="Edit Rincian Proyek"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteClick(proj)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Hapus Proyek"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Project Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              {editingProject ? "Perbarui Inisiatif Proyek" : "Daftarkan Proyek Baru"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Kelola jadwal milestone teknis, tautkan ke dokumen RAB resmi, dan perbarui progres.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nama Proyek</label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Revamp ERP Multi-tenant"
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Klien / Mitra</label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: PT Mahakarya Digital"
                    value={formClient}
                    onChange={(e) => setFormClient(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* RAB Link Dropdown */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tautkan dengan Dokumen RAB Terkait (Opsional)
                </label>
                <select
                  value={formRabId}
                  onChange={(e) => setFormRabId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                >
                  <option value="NONE">-- Tanpa Tautan RAB --</option>
                  {rabList.map((r) => (
                    <option key={r.id} value={r.id}>
                      📋 {r.nomor_rab} - {r.nama_project} ({r.nama_client}) [{r.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">PIC Teknisi Lapangan</label>
                  <select
                    value={formPic}
                    onChange={(e) => setFormPic(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.nama_lengkap}>
                        {u.nama_lengkap} ({u.jabatan})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Target Deadline</label>
                  <input
                    type="date"
                    required
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tahapan</label>
                  <select
                    value={formTahapan}
                    onChange={(e) => setFormTahapan(e.target.value as ProjectStage)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  >
                    <option value="Perancangan">Perancangan</option>
                    <option value="Pengadaan Alat">Pengadaan Alat</option>
                    <option value="Development">Development</option>
                    <option value="Testing">Testing</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Divisi Tag</label>
                  <input
                    type="text"
                    value={formDivisiTag}
                    onChange={(e) => setFormDivisiTag(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Progres ({formProgress}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formProgress}
                    onChange={(e) => setFormProgress(parseInt(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Catatan Teknis Proyek</label>
                <textarea
                  rows={3}
                  placeholder="Catatan pengerjaan lapangan, kendala teknis, atau catatan pengujian..."
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {editingProject ? "Simpan Perubahan" : "Daftarkan Proyek"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Finance Transaction Modal */}
      {financeModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-5 sm:p-6 my-auto max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-slate-900 text-base mb-1">Catat Arus Kas Terkait Proyek</h3>
            <p className="text-xs text-slate-500 mb-4">
              Integrasikan termin penagihan klien atau pengeluaran teknis langsung ke modul Keuangan.
            </p>

            {trxMsg && (
              <div className="p-3 mb-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl">
                {trxMsg}
              </div>
            )}

            <form onSubmit={handleSaveProjectTransaction} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="tipe"
                    value="PEMASUKAN"
                    checked={trxTipe === "PEMASUKAN"}
                    onChange={() => setTrxTipe("PEMASUKAN")}
                  />
                  <span>Pemasukan (Termin Klien)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="tipe"
                    value="PENGELUARAN"
                    checked={trxTipe === "PENGELUARAN"}
                    onChange={() => setTrxTipe("PENGELUARAN")}
                  />
                  <span>Pengeluaran (Material/Jasa)</span>
                </label>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Keterangan Item</label>
                <input
                  type="text"
                  required
                  value={trxNama}
                  onChange={(e) => setTrxNama(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  step="500000"
                  required
                  value={trxNominal}
                  onChange={(e) => setTrxNominal(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFinanceModalProject(null)}
                  className="py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Catat ke Keuangan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetProject}
        title="Hapus Inisiatif Proyek?"
        message={`Apakah Anda yakin ingin menghapus proyek "${deleteTargetProject?.nama_project}" (${deleteTargetProject?.client})? Tindakan ini akan menghapus data proyek dari sistem secara permanen.`}
        confirmLabel="Ya, Hapus Proyek"
        cancelLabel="Batal"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetProject(null)}
      />

      {/* Access Denied Dialog */}
      <ConfirmDialog
        isOpen={!!accessDeniedMessage}
        title="Otorisasi PIC Ditolak"
        message={accessDeniedMessage || ""}
        confirmLabel="Saya Mengerti"
        showCancel={false}
        type="warning"
        onConfirm={() => setAccessDeniedMessage(null)}
        onCancel={() => setAccessDeniedMessage(null)}
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
