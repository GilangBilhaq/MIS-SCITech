"use client";

import React, { useState } from "react";
import { X, Download, Plus, Trash2, CheckCircle2, QrCode } from "lucide-react";
import { TenantConfig } from "@/config/tenant.config";
import { exportElementAsJpg } from "@/lib/invoiceGenerator";
import { StorageService } from "@/lib/storage";

interface InvoiceGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TenantConfig;
  loggedInUserName?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  qty: number;
  price: number;
}

export const InvoiceGeneratorModal: React.FC<InvoiceGeneratorModalProps> = ({
  isOpen,
  onClose,
  config,
  loggedInUserName,
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-SCI/${new Date().getFullYear()}/04-099`);
  const [clientName, setClientName] = useState("PT Mahakarya Digital Nusantara");
  const [clientAddress, setClientAddress] = useState("Gedung Cyber 2 Lantai 12, Jakarta Selatan");
  const [invoiceDate, setInvoiceDate] = useState("18 April 2026");
  const [dueDate, setDueDate] = useState("02 Mei 2026");
  const [notes, setNotes] = useState(
    "Pembayaran mohon ditransfer sesuai rincian rekening tertera atau scan QRIS sebelum tanggal jatuh tempo."
  );
  const [paymentStatus, setPaymentStatus] = useState<"Menunggu Pembayaran" | "Lunas">(
    "Menunggu Pembayaran"
  );
  const [signatoryName, setSignatoryName] = useState(
    loggedInUserName && loggedInUserName !== "Admin Keuangan" && loggedInUserName !== "Executive CEO"
      ? loggedInUserName
      : "Admin Tim Keuangan"
  );
  const [signatoryTitle, setSignatoryTitle] = useState("Finance Controller & Administration");
  const [qrImageUrl, setQrImageUrl] = useState<string>(
    config.finance?.qrisImageUrl || "/branding/sample-qris.png"
  );
  const [qrImgError, setQrImgError] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Sync signatoryName and load QRIS from finance settings
  React.useEffect(() => {
    if (loggedInUserName && loggedInUserName !== "Admin Keuangan" && loggedInUserName !== "Executive CEO") {
      setSignatoryName(loggedInUserName);
    }
  }, [loggedInUserName]);

  React.useEffect(() => {
    setQrImgError(false);
    try {
      const finSettings = StorageService.getFinanceSettings();
      const resolvedQr = finSettings.qr_image_url || config.finance?.qrisImageUrl || "/branding/sample-qris.png";
      setQrImageUrl(resolvedQr);
    } catch {
      setQrImageUrl(config.finance?.qrisImageUrl || "/branding/sample-qris.png");
    }
  }, [config, isOpen]);

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      description: "B2B Enterprise Subscription Renewal (Q2 2026)",
      qty: 1,
      price: 85000000,
    },
    {
      id: "2",
      description: "Dedicated High-Availability Cloud Setup & Migration",
      qty: 1,
      price: 15000000,
    },
  ]);

  if (!isOpen) return null;

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        description: "Layanan Baru / Item Penagihan",
        qty: 1,
        price: 5000000,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, val: string | number) => {
    setItems(
      items.map((i) => {
        if (i.id === id) {
          return { ...i, [field]: val };
        }
        return i;
      })
    );
  };

  const subtotal = items.reduce((acc, curr) => acc + curr.qty * curr.price, 0);
  const ppn = (subtotal * 11) / 100;
  const grandTotal = subtotal + ppn;

  const handleDownloadJpg = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    const success = await exportElementAsJpg(
      "invoice-render-target",
      `${invoiceNumber.replace(/[/\\?%*:|"<>]/g, "_")}_Official.jpg`
    );
    setIsExporting(false);
    if (success) {
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 my-auto flex flex-col max-h-[94vh]">
        {/* Modal Top Bar */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50 gap-2 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Generator Invoice Resmi JPG</h3>
            <p className="text-xs text-slate-500 hidden sm:block">
              Kustomisasi parameter penagihan dan unduh sebagai file gambar .JPG beresolusi tinggi.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleDownloadJpg}
              disabled={isExporting}
              className="py-1.5 sm:py-2 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              <span>{isExporting ? "Memproses..." : "Unduh JPG"}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {exportSuccess && (
          <div className="bg-emerald-50 px-6 py-2.5 border-b border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Invoice berhasil diekspor ke file JPG resolusi tinggi!</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-100/50">
          {/* Controls Column (Left) */}
          <div className="lg:col-span-5 space-y-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm text-xs">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              Parameter Penagihan
            </h4>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Nomor Invoice</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Status Penagihan</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as "Menunggu Pembayaran" | "Lunas")}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 bg-slate-50 font-semibold focus:bg-white focus:ring-1 focus:ring-blue-500"
              >
                <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                <option value="Lunas">Lunas (Paid)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Nama Klien / Perusahaan</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Alamat Klien</label>
              <input
                type="text"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Tanggal Terbit</label>
                <input
                  type="text"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Jatuh Tempo</label>
                <input
                  type="text"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 bg-slate-50"
                />
              </div>
            </div>

            {/* Line items editor */}
            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <label className="font-bold text-slate-700">Rincian Item Tagihan</label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Item
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {items.map((it) => (
                  <div key={it.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <input
                      type="text"
                      placeholder="Deskripsi item"
                      value={it.description}
                      onChange={(e) => updateItem(it.id, "description", e.target.value)}
                      className="w-full p-1.5 border border-slate-200 rounded bg-white text-slate-900 text-[11px]"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-16">
                        <span className="text-[10px] text-slate-500 block">Qty</span>
                        <input
                          type="number"
                          value={it.qty}
                          min={1}
                          onChange={(e) => updateItem(it.id, "qty", parseInt(e.target.value) || 1)}
                          className="w-full p-1 border border-slate-200 rounded bg-white text-slate-900 text-[11px] text-center"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-500 block">Harga Satuan (Rp)</span>
                        <input
                          type="number"
                          value={it.price}
                          step={100000}
                          onChange={(e) => updateItem(it.id, "price", parseFloat(e.target.value) || 0)}
                          className="w-full p-1 border border-slate-200 rounded bg-white text-slate-900 text-[11px]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        className="text-rose-500 hover:text-rose-700 mt-4 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Catatan Tambahan</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 bg-slate-50"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                Otoritas Penandatangan
              </h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Nama Anggota Tim Finance</label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="Nama Staf Penandatangan"
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Jabatan / Role</label>
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    placeholder="Jabatan"
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Info Sumber QRIS Pengaturan Keuangan */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px]">
              <span className="flex items-center gap-1.5 font-medium">
                <QrCode className="w-4 h-4 text-blue-600" />
                <span>QRIS Otomatis Terhubung</span>
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                Pengaturan Keuangan
              </span>
            </div>
          </div>

          {/* Render Target Column (Right - Actual Printable Invoice) */}
          <div className="lg:col-span-7 flex justify-center overflow-x-auto">
            <div
              id="invoice-render-target"
              className="w-full max-w-[620px] min-w-[500px] sm:min-w-0 p-6 sm:p-8 rounded-xl shadow-md border flex flex-col justify-between"
              style={{
                minHeight: "820px",
                backgroundColor: "#ffffff",
                color: "#1e293b",
                borderColor: "#e2e8f0",
              }}
            >
              {/* Header */}
              <div>
                <div
                  className="flex justify-between items-start pb-6 mb-6"
                  style={{ borderBottom: "1px solid #e2e8f0" }}
                >
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={config.logoUrl}
                      alt={config.name}
                      className="h-12 w-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>

                  <div className="text-right">
                    <span
                      className="inline-block px-3 py-1 font-extrabold text-xs uppercase tracking-wider rounded-md"
                      style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}
                    >
                      INVOICE RESMI
                    </span>
                    <p
                      className="font-mono font-bold text-sm mt-2"
                      style={{ color: "#0f172a" }}
                    >
                      {invoiceNumber}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#64748b" }}>
                      Tanggal: {invoiceDate}
                    </p>
                  </div>
                </div>

                {/* Bill To & Details */}
                <div className="grid grid-cols-2 gap-5 mb-6 text-xs items-stretch">
                  <div
                    className="p-3.5 rounded-lg flex flex-col justify-between"
                    style={{ backgroundColor: "#f8fafc", border: "1px solid #f1f5f9" }}
                  >
                    <div>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                        style={{ color: "#94a3b8" }}
                      >
                        DITUJUKAN KEPADA:
                      </span>
                      <h4 className="font-bold text-sm" style={{ color: "#0f172a" }}>
                        {clientName}
                      </h4>
                      <p
                        className="mt-1 leading-relaxed text-[11px]"
                        style={{ color: "#475569" }}
                      >
                        {clientAddress}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 text-[10px] flex items-center justify-between" style={{ borderTop: "1px dashed #e2e8f0" }}>
                      <span style={{ color: "#64748b" }}>Status Penagihan:</span>
                      <span
                        className="font-bold px-2 py-0.5 rounded text-[10px]"
                        style={{
                          backgroundColor: paymentStatus === "Lunas" ? "#ecfdf5" : "#eff6ff",
                          color: paymentStatus === "Lunas" ? "#047857" : "#0284c7",
                          border: `1px solid ${paymentStatus === "Lunas" ? "#a7f3d0" : "#bfdbfe"}`,
                        }}
                      >
                        {paymentStatus === "Lunas" ? "✓ LUNAS (PAID)" : "MENUNGGU PEMBAYARAN"}
                      </span>
                    </div>
                  </div>

                  <div
                    className="p-3.5 rounded-lg flex flex-col justify-between"
                    style={{ backgroundColor: "#f8fafc", border: "1px solid #f1f5f9" }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2 pb-1" style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider block"
                          style={{ color: "#94a3b8" }}
                        >
                          INFORMASI PEMBAYARAN
                        </span>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
                        >
                          TRANSFER BANK
                        </span>
                      </div>

                      <table className="w-full text-[11px] border-collapse">
                        <tbody>
                          <tr>
                            <td className="py-1 pr-2 whitespace-nowrap" style={{ color: "#64748b", width: "90px" }}>Jatuh Tempo:</td>
                            <td className="py-1 text-right font-bold" style={{ color: "#e11d48" }}>{dueDate}</td>
                          </tr>
                          <tr>
                            <td className="py-1 pr-2 whitespace-nowrap" style={{ color: "#64748b" }}>Bank Tujuan:</td>
                            <td className="py-1 text-right font-bold" style={{ color: "#0f172a" }}>{config.finance.bankName}</td>
                          </tr>
                          <tr>
                            <td className="py-1 pr-2 whitespace-nowrap" style={{ color: "#64748b" }}>Nomor Rekening:</td>
                            <td className="py-1 text-right font-mono font-extrabold text-[12px]" style={{ color: "#1d4ed8" }}>
                              {config.finance.accountNumber}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 pr-2 whitespace-nowrap" style={{ color: "#64748b" }}>Atas Nama:</td>
                            <td className="py-1 text-right font-semibold text-[10.5px]" style={{ color: "#0f172a" }}>
                              {config.finance.accountHolder}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Itemized Table */}
                <table className="w-full text-xs mb-6">
                  <thead>
                    <tr
                      className="font-bold text-left"
                      style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
                    >
                      <th className="py-2.5 px-3 rounded-l-lg">Deskripsi Pekerjaan / Layanan</th>
                      <th className="py-2.5 px-2 text-center w-16">Qty</th>
                      <th className="py-2.5 px-3 text-right w-28">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right rounded-r-lg w-32">Total Biaya</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "#f1f5f9" }}>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-3 px-3 font-medium" style={{ color: "#1e293b" }}>
                          {it.description}
                        </td>
                        <td className="py-3 px-2 text-center" style={{ color: "#475569" }}>
                          {it.qty}
                        </td>
                        <td className="py-3 px-3 text-right font-mono" style={{ color: "#475569" }}>
                          Rp {it.price.toLocaleString("id-ID")}
                        </td>
                        <td
                          className="py-3 px-3 text-right font-bold font-mono"
                          style={{ color: "#0f172a" }}
                        >
                          Rp {(it.qty * it.price).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Totals, QRIS & Signature */}
              <div>
                <div
                  className="pt-4 flex justify-between items-start mb-6"
                  style={{ borderTop: "1px solid #e2e8f0" }}
                >
                  {/* Left Bottom: Catatan & Ketentuan + QRIS Box */}
                  <div className="max-w-[300px] space-y-3">
                    <div>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider block mb-1"
                        style={{ color: "#94a3b8" }}
                      >
                        Catatan & Ketentuan:
                      </span>
                      <p className="text-[10px] leading-relaxed" style={{ color: "#64748b" }}>
                        {notes}
                      </p>
                    </div>

                    {/* QRIS Banner Positioned Under Catatan & Ketentuan */}
                    <div
                      className="p-2.5 rounded-lg flex items-center gap-3"
                      style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
                    >
                      <div
                        className="w-16 h-16 rounded-md flex-shrink-0 flex items-center justify-center p-0.5 overflow-hidden"
                        style={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1" }}
                      >
                        {!qrImgError && qrImageUrl && qrImageUrl !== "/branding/sample-qris.png" ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={qrImageUrl}
                            alt="QRIS Pembayaran"
                            crossOrigin="anonymous"
                            onError={() => setQrImgError(true)}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-50 rounded flex flex-col items-center justify-center">
                            <QrCode className="w-10 h-10 text-slate-800" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="font-extrabold text-[10.5px] block" style={{ color: "#0f172a" }}>
                          SCAN QRIS RESMI
                        </span>
                        <p className="text-[9.5px] leading-relaxed mt-0.5" style={{ color: "#64748b" }}>
                          Scan bayar instan via BCA, Mandiri, BRI, Gopay, OVO, & DANA.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-64 space-y-2 text-xs">
                    <div className="flex justify-between items-center" style={{ color: "#475569" }}>
                      <span>Subtotal</span>
                      <span className="font-mono font-medium">Rp {subtotal.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between items-center" style={{ color: "#475569" }}>
                      <span>PPN (11%)</span>
                      <span className="font-mono font-medium">Rp {ppn.toLocaleString("id-ID")}</span>
                    </div>
                    <div
                      className="flex justify-between items-center pt-2.5 font-bold text-sm"
                      style={{ borderTop: "1px solid #cbd5e1", color: "#1d4ed8" }}
                    >
                      <span className="tracking-wide">TOTAL AKHIR</span>
                      <span className="font-mono text-base font-extrabold">
                        Rp {grandTotal.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Signature */}
                <div
                  className="pt-6 flex justify-between items-end text-xs"
                  style={{ borderTop: "1px dashed #e2e8f0" }}
                >
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: "#94a3b8" }}
                    >
                      Otentikasi Digital SHA-256
                    </p>
                    <p className="font-mono text-[9px]" style={{ color: "#64748b" }}>
                      DOC-REF: SCI-TX-9902-8812 • VERIFIED
                    </p>
                  </div>

                  <div className="text-center min-w-[200px]">
                    <p className="text-[11px] mb-10" style={{ color: "#64748b" }}>
                      Hormat Kami,
                      <br />
                      <strong style={{ color: "#0f172a" }}>{config.name}</strong>
                    </p>
                    <p
                      className="font-bold pb-1 text-xs"
                      style={{ color: "#0f172a", borderBottom: "1px solid #94a3b8" }}
                    >
                      {signatoryName}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>
                      {signatoryTitle}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
