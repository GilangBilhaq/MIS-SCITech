"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastProps {
  id?: string;
  type?: "success" | "error" | "info";
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  type = "success",
  message,
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getStyles = () => {
    switch (type) {
      case "error":
        return {
          bg: "bg-rose-900/90 border-rose-700/60 text-white shadow-rose-950/20",
          icon: <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />,
        };
      case "info":
        return {
          bg: "bg-slate-900/90 border-slate-700/60 text-white shadow-slate-950/20",
          icon: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
        };
      case "success":
      default:
        return {
          bg: "bg-slate-900/95 border-slate-700/60 text-white shadow-slate-950/30",
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
        };
    }
  };

  const current = getStyles();

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-2xl max-w-md ${current.bg}`}
      >
        {current.icon}
        <p className="text-xs font-semibold leading-relaxed pr-2">{message}</p>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0 ml-auto"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
