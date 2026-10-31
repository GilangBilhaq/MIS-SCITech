"use client";

import React, { useState, useEffect } from "react";
import { Key, X, Lock } from "lucide-react";
import { StorageService } from "@/lib/storage";

interface PinVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  actionTitle: string; // e.g. "Pembaruan Worklog", "Pembaruan Monthly Plan", "Penerbitan Proyek"
  onVerified: (verifiedPin?: string) => void;
}

export const PinVerificationModal: React.FC<PinVerificationModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  actionTitle,
  onVerified,
}) => {
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockoutTimer > 0) {
      timer = setInterval(() => {
        setLockoutTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTimer]);

  useEffect(() => {
    if (isOpen) {
      setPinDigits(["", "", "", "", "", ""]);
      setErrorMsg("");
      if (lockoutTimer === 0) {
        setTimeout(() => {
          document.getElementById("pin-digit-0")?.focus();
        }, 50);
      }
    }
  }, [isOpen, lockoutTimer]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, val: string) => {
    if (lockoutTimer > 0 || !/^\d*$/.test(val)) return;
    if (val.length > 1) {
      const digits = val.slice(0, 6).split("");
      const newDigits = [...pinDigits];
      for (let i = 0; i < digits.length && index + i < 6; i++) {
        newDigits[index + i] = digits[i];
      }
      setPinDigits(newDigits);
      const nextIndex = Math.min(5, index + digits.length);
      document.getElementById(`pin-digit-${nextIndex}`)?.focus();
      return;
    }
    const newDigits = [...pinDigits];
    newDigits[index] = val;
    setPinDigits(newDigits);

    // Auto-advance
    if (val && index < 5) {
      const nextInput = document.getElementById(`pin-digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length && i < 6; i++) {
      newDigits[i] = pasted[i];
    }
    setPinDigits(newDigits);
    const targetIdx = Math.min(5, pasted.length - 1);
    document.getElementById(`pin-digit-${targetIdx}`)?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (lockoutTimer > 0) return;
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      const prevInput = document.getElementById(`pin-digit-${index - 1}`);
      prevInput?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  };

  const handleConfirm = async () => {
    if (lockoutTimer > 0) return;

    const fullPin = pinDigits.join("");
    if (fullPin.length !== 6) {
      setErrorMsg("Harap lengkapi 6 digit PIN keamanan.");
      return;
    }

    setIsSubmitting(true);
    let success = false;
    let message = "";

    try {
      const res = await fetch("/api/users/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, pin: fullPin }),
      });
      const data = await res.json();
      success = res.ok && data.success;
      message = data.message || "Verifikasi berhasil.";
    } catch {
      // Fallback to local storage verification
      const localRes = StorageService.verifyPin(userId, fullPin);
      success = localRes.success;
      message = localRes.message;
    }

    setIsSubmitting(false);

    if (success) {
      setFailedAttempts(0);
      onVerified(fullPin);
      onClose();
    } else {
      const nextFail = failedAttempts + 1;
      setFailedAttempts(nextFail);
      if (nextFail >= 3) {
        setLockoutTimer(60); // 60 seconds security lockout
        setErrorMsg("Form terkunci 60 detik akibat 3x salah memasukkan PIN (Kebijakan ISO 27001).");
      } else {
        setErrorMsg(`${message} (Percobaan ${nextFail}/3)`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-5 sm:p-7 relative my-auto max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 sm:mb-6 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase">
              Otoritas Keamanan
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Key Icon Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4 shadow-inner ring-4 ring-blue-50">
            <Key className="w-7 h-7" />
          </div>

          <h4 className="text-base font-bold text-slate-900 mb-1">Verifikasi Otoritas PIN</h4>
          <p className="text-xs text-slate-500 max-w-xs mb-4">
            Masukkan 6-digit PIN keamanan anggota untuk menyimpan data:{" "}
            <span className="font-semibold text-slate-800">{userName}</span>
          </p>

          {/* Action pill */}
          <div className="w-full py-2.5 px-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800 font-medium mb-6 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>{actionTitle}</span>
          </div>

          {/* 6 PIN Boxes */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {pinDigits.slice(0, 3).map((d, i) => (
              <input
                key={i}
                id={`pin-digit-${i}`}
                type="password"
                maxLength={6}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className="w-10 h-12 text-center text-lg font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white shadow-sm transition-all"
              />
            ))}
            <span className="text-slate-400 font-bold px-1">•</span>
            {pinDigits.slice(3, 6).map((d, i) => (
              <input
                key={i + 3}
                id={`pin-digit-${i + 3}`}
                type="password"
                maxLength={6}
                value={d}
                onChange={(e) => handleDigitChange(i + 3, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i + 3, e)}
                onPaste={handlePaste}
                className="w-10 h-12 text-center text-lg font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white shadow-sm transition-all"
              />
            ))}
          </div>

          {/* Anti-tamper badge */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-3 mb-5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Anti-Tamper Active</span>
          </div>

          {errorMsg && (
            <div className="w-full p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium mb-4">
              {errorMsg}
            </div>
          )}

          {/* Action buttons */}
          <div className="w-full space-y-2">
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>✓ Konfirmasi & Simpan</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
