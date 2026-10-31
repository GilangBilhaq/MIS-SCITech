import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { RabProject } from "@/types";
import { TenantConfig } from "@/config/tenant.config";
import { StorageService } from "./storage";

export function generateRabPdf(rab: RabProject, config: TenantConfig) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const totals = StorageService.calculateRabTotals(rab);

  // Colors
  const primaryBlue: [number, number, number] = [2, 132, 199];
  const darkNavy: [number, number, number] = [15, 23, 42];
  const slateGray: [number, number, number] = [100, 116, 139];

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...darkNavy);
  doc.text(config.name.toUpperCase(), 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...slateGray);
  doc.text(config.legalName, 14, 26);
  doc.text(config.contact.address, 14, 30);
  doc.text(`Email: ${config.contact.email} | Telp: ${config.contact.phone}`, 14, 34);

  // Horizontal line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.8);
  doc.line(14, 38, 196, 38);

  // Document Title Badge
  doc.setFillColor(...primaryBlue);
  doc.roundedRect(14, 42, 182, 12, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("RENCANA ANGGARAN BIAYA & PENAWARAN HARGA (RAB)", 105, 49.5, { align: "center" });

  // Metadata Box
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...darkNavy);

  const startY = 60;
  doc.text(`Nomor Dokumen  : ${rab.nomor_rab}`, 14, startY);
  doc.text(`Nama Proyek      : ${rab.nama_project}`, 14, startY + 5);
  doc.text(`Klien / Mitra        : ${rab.nama_client}`, 14, startY + 10);

  doc.text(`Tanggal Terbit   : ${rab.tanggal}`, 125, startY);
  doc.text(`Masa Berlaku    : ${rab.masa_berlaku}`, 125, startY + 5);
  doc.text(`PIC Lapangan    : ${rab.pic_name}`, 125, startY + 10);

  // Table Data Preparation
  const formatRupiah = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;

  const tableRows: (string | number)[][] = [];

  // Group by category
  const categories: { title: string; type: "Primary" | "Secondary" | "Tertiary" }[] = [
    { title: "A. KOMPONEN BIAYA UTAMA / PRIMARY (Hardware & Node)", type: "Primary" },
    { title: "B. KOMPONEN BIAYA PENDUKUNG / SECONDARY (Lisensi & Logistik)", type: "Secondary" },
    { title: "C. KOMPONEN JASA & TENAGA AHLI / TERTIARY (Engineering & QA)", type: "Tertiary" },
  ];

  let counter = 1;

  categories.forEach((cat) => {
    const items = (rab.items || []).filter((i) => i.tipe_rincian === cat.type);
    if (items.length > 0) {
      // Category Section Header
      tableRows.push([
        { content: cat.title, colSpan: 6, styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] } } as unknown as string,
      ]);

      items.forEach((item) => {
        tableRows.push([
          counter++,
          `${item.nama_item}\n${item.spesifikasi_teknis}`,
          item.jumlah,
          item.satuan,
          formatRupiah(item.harga_pcs),
          formatRupiah(item.jumlah * item.harga_pcs),
        ]);
      });
    }
  });

  autoTable(doc, {
    startY: startY + 16,
    head: [["No", "Deskripsi Pekerjaan / Komponen", "Vol", "Satuan", "Harga Satuan", "Total Biaya"]],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: primaryBlue,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      valign: "middle",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 72 },
      2: { halign: "center", cellWidth: 12 },
      3: { halign: "center", cellWidth: 20 },
      4: { halign: "right", cellWidth: 32 },
      5: { halign: "right", cellWidth: 36, fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  // Summary Table (Subtotal, PPN, Total Akhir)
  const finalY = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 180) + 4;

  const summaryData = [
    ["Subtotal Komponen Biaya:", formatRupiah(totals.subtotalSebelumPpn)],
    [`PPN (${rab.ppn_percent}%):`, formatRupiah(totals.nilaiPpn)],
    ["TOTAL AKHIR RESMI:", formatRupiah(totals.totalAkhir)],
  ];

  autoTable(doc, {
    startY: finalY,
    body: summaryData,
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 1.5 },
    columnStyles: {
      0: { halign: "right", fontStyle: "bold", cellWidth: 146 },
      1: { halign: "right", fontStyle: "bold", cellWidth: 36, textColor: primaryBlue },
    },
    margin: { left: 14, right: 14 },
  });

  // Terms & Payment Info Box
  const termsY = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 210) + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, termsY, 182, 22, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...darkNavy);
  doc.text("Syarat Pembayaran & Rekening Bank:", 18, termsY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`• Termin I: DP 30% saat penerbitan PO | Termin II: BAP 50% setelah serah terima hardware | Pelunasan: 20% (garansi 12 bulan).`, 18, termsY + 11);
  doc.text(`• Pembayaran ditransfer ke rekening resmi: ${config.finance.bankName} No. ${config.finance.accountNumber} a/n ${config.finance.accountHolder}`, 18, termsY + 16);

  // Signature Block
  const sigY = termsY + 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Disetujui oleh Klien / Mitra:", 24, sigY);
  doc.text("Penanggung Jawab Proyek / SCI Tech:", 130, sigY);

  doc.setFont("helvetica", "bold");
  doc.text("( .................................................... )", 20, sigY + 20);
  doc.text(`( ${rab.pic_name} )`, 130, sigY + 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...slateGray);
  doc.text("Tanda Tangan & Cap Perusahaan", 28, sigY + 24);
  doc.text("Lead Technical / Operations", 140, sigY + 24);

  // Save PDF
  doc.save(`${rab.nomor_rab.replace(/[/\\?%*:|"<>]/g, "_")}_RAB_Resmi.pdf`);
}

export function generateFinancialReportPdf(
  transactions: import("@/types").Transaction[],
  config: TenantConfig,
  filterInfo = "Seluruh Transaksi"
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const darkNavy: [number, number, number] = [15, 23, 42];
  const slateGray: [number, number, number] = [100, 116, 139];
  const emeraldGreen: [number, number, number] = [16, 185, 129];
  const roseRed: [number, number, number] = [244, 63, 94];

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...darkNavy);
  doc.text(config.name.toUpperCase(), 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...slateGray);
  doc.text(config.legalName, 14, 23);
  doc.text(`Periode Laporan: ${filterInfo} | Tanggal Cetak: ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}`, 14, 27);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.6);
  doc.line(14, 31, 196, 31);

  // Summary Metrics Calculation
  const totalMasuk = transactions.filter((t) => t.tipe === "PEMASUKAN").reduce((a, b) => a + Number(b.total_harga), 0);
  const totalKeluar = transactions.filter((t) => t.tipe === "PENGELUARAN").reduce((a, b) => a + Number(b.total_harga), 0);
  const netKas = totalMasuk - totalKeluar;

  // 3 Summary Cards
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 34, 58, 16, 1, 1, "F");
  doc.setFontSize(7);
  doc.setTextColor(...slateGray);
  doc.text("TOTAL PEMASUKAN", 18, 39);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...emeraldGreen);
  doc.text(`Rp ${totalMasuk.toLocaleString("id-ID")}`, 18, 46);

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(76, 34, 58, 16, 1, 1, "F");
  doc.setFontSize(7);
  doc.setTextColor(...slateGray);
  doc.setFont("helvetica", "normal");
  doc.text("TOTAL PENGELUARAN", 80, 39);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...roseRed);
  doc.text(`Rp ${totalKeluar.toLocaleString("id-ID")}`, 80, 46);

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(138, 34, 58, 16, 1, 1, "F");
  doc.setFontSize(7);
  doc.setTextColor(...slateGray);
  doc.setFont("helvetica", "normal");
  doc.text("SALDO KAS BERSIH", 142, 39);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(2, 132, 199);
  doc.text(`Rp ${netKas.toLocaleString("id-ID")}`, 142, 46);

  // Ledger Table
  const tableData = transactions.map((t, idx) => [
    idx + 1,
    t.tanggal,
    t.tipe,
    t.nama_item + "\n" + (t.deskripsi || ""),
    t.kegunaan,
    t.metode,
    `Rp ${Number(t.total_harga).toLocaleString("id-ID")}`,
  ]);

  autoTable(doc, {
    startY: 54,
    head: [["No", "Tanggal", "Tipe", "Item & Deskripsi", "Kategori", "Metode", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontSize: 8,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 20 },
      2: { cellWidth: 22, fontStyle: "bold" },
      3: { cellWidth: 58 },
      4: { cellWidth: 28 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22, halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`Laporan_Keuangan_${config.name}_${new Date().toISOString().split("T")[0]}.pdf`);
}

export function generateProjectReportPdf(
  project: import("@/types").Project,
  config: TenantConfig
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const darkNavy: [number, number, number] = [15, 23, 42];
  const slateGray: [number, number, number] = [100, 116, 139];
  const primaryBlue: [number, number, number] = [2, 132, 199];

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...darkNavy);
  doc.text(config.name.toUpperCase(), 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...slateGray);
  doc.text(`${config.legalName} • Laporan Perkembangan Proyek Resmi`, 14, 23);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.6);
  doc.line(14, 27, 196, 27);

  // Title Box
  doc.setFillColor(...primaryBlue);
  doc.roundedRect(14, 32, 182, 10, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text("EXECUTIVE PROJECT STATUS & MILESTONE REPORT", 105, 38.5, { align: "center" });

  // Project Info Table
  autoTable(doc, {
    startY: 46,
    body: [
      ["ID Proyek", project.id, "PIC Teknisi Lapangan", project.pic_teknisi],
      ["Nama Proyek", project.nama_project, "Target Deadline", project.deadline],
      ["Klien / Mitra", project.client, "Divisi Pelaksana", project.divisi_tag || "Engineering"],
      ["RAB Terkait", project.rab_nomor || (project.rab_id ? `Ref: ${project.rab_id}` : "Tanpa Tautan RAB"), "Sprint Berjalan", project.sprint_info || "Sprint Delivery"],
      ["Tahapan Saat Ini", project.tahapan_saat_ini, "Progres Kemajuan", `${project.progress_persen}% Selesai`],
    ],
    theme: "plain",
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: darkNavy,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 32, textColor: slateGray },
      1: { cellWidth: 60, fontStyle: "bold" },
      2: { fontStyle: "bold", cellWidth: 35, textColor: slateGray },
      3: { cellWidth: 55, fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  // Technical Notes Box
  const notesY = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100) + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...darkNavy);
  doc.text("Catatan Teknis & Evaluasi Progres Lapangan:", 14, notesY);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, notesY + 3, 182, 40, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(doc.splitTextToSize(project.catatan_teknis || "Tidak ada kendala kritis pada pengerjaan fase berjalan. Sistem beroperasi stabil sesuai ekspektasi SLA.", 174), 18, notesY + 10);

  // Signatures
  const sigY = notesY + 55;
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  doc.text("Disetujui oleh Klien / Mitra:", 24, sigY);
  doc.text("Penanggung Jawab Proyek:", 135, sigY);

  doc.setFont("helvetica", "bold");
  doc.text("( ..................................................... )", 20, sigY + 24);
  doc.text(`( ${project.pic_teknisi} )`, 135, sigY + 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...slateGray);
  doc.text("Perwakilan Resmi Klien", 28, sigY + 28);
  doc.text("Lead Technical Engineer", 140, sigY + 28);

  doc.save(`Laporan_Proyek_${project.id}_${project.client.replace(/[/\\?%*:|"<>]/g, "_")}.pdf`);
}
