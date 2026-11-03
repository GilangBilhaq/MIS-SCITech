import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SCI Tech Workspace - Enterprise Management Platform",
  description:
    "Sistem Informasi Manajemen B2B Multi-Tenant untuk Operasional, Finansial, Proyek, dan Kinerja SCI Tech.",
  icons: {
    icon: [
      { url: "/branding/sci-tech-icon.png", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/branding/sci-tech-icon.png",
    apple: "/branding/sci-tech-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
