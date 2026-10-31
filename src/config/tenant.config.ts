export interface TenantConfig {
  id: string;
  name: string;
  legalName: string;
  tagline: string;
  description: string;
  subdomain: string;
  logoUrl: string;
  iconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  contact: {
    email: string;
    phone: string;
    address: string;
    website: string;
  };
  finance: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    qrisImageUrl: string;
    currency: string;
    currencySymbol: string;
    showCashToPublic: boolean;
  };
  assets: {
    companyProfileUrl: string;
    companyProfileName: string;
    pitchDeckUrl: string;
    pitchDeckName: string;
  };
  security: {
    pinLength: number; // 6-digit
    sessionTimeoutMinutes: number;
    financePasswordDefault: string;
    managementMasterPasswordDefault: string;
  };
}

export const defaultTenantConfig: TenantConfig = {
  id: "sci-tech-01",
  name: "SCI Tech",
  legalName: "PT Solusi Cerdas Infrastructure Technology",
  tagline: "Solusi Cerdas Infrastructure Technology",
  description: "Enterprise Management & Smart Infrastructure Operations Platform",
  subdomain: "scitech",
  logoUrl: "/branding/sci-tech-full-logo.png",
  iconUrl: "/branding/sci-tech-icon.png",
  primaryColor: "#0284c7", // Sky/Blue SCI Tech
  secondaryColor: "#ea580c", // Orange SCI Tech
  accentColor: "#2563eb",
  contact: {
    email: "contact@scitech.id",
    phone: "+62 812-3456-7890",
    address: "Cyber 2 Tower Lt. 18, Jl. H.R. Rasuna Said, Jakarta Selatan",
    website: "https://scitech.id",
  },
  finance: {
    bankName: "Bank Central Asia (BCA)",
    accountNumber: "883-092-1920",
    accountHolder: "PT Solusi Cerdas Infrastructure Technology",
    qrisImageUrl: "/branding/sample-qris.png",
    currency: "IDR",
    currencySymbol: "Rp",
    showCashToPublic: false, // by default private, toggleable by Finance Admin
  },
  assets: {
    companyProfileUrl: "#",
    companyProfileName: "Company Profile SCI Tech (PDF)",
    pitchDeckUrl: "#",
    pitchDeckName: "Pitch Deck SCI Tech (PDF)",
  },
  security: {
    pinLength: 6,
    sessionTimeoutMinutes: 60,
    financePasswordDefault: "keuangan123",
    managementMasterPasswordDefault: "admin123",
  },
};
