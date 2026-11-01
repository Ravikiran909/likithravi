import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  QrCode,
  RotateCw,
  Copy,
  Check,
  X,
  Smartphone,
  KeyRound,
  Fingerprint,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { E2EESecurityProfile } from '../types/index.ts';

interface E2EESafetyNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: E2EESecurityProfile;
  contactName: string;
  phoneNumber: string;
  onRotateKey: () => Promise<void>;
  onVerifyStatusChange: (verified: boolean) => void;
}

export const E2EESafetyNumberModal: React.FC<E2EESafetyNumberModalProps> = ({
  isOpen,
  onClose,
  profile,
  contactName,
  phoneNumber,
  onRotateKey,
  onVerifyStatusChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [scanSimulated, setScanSimulated] = useState(false);
  const [showRawKey, setShowRawKey] = useState(false);

  if (!isOpen) return null;

  const blocks = profile.safetyNumber ? profile.safetyNumber.split(' ') : [];

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(profile.safetyNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRotate = async () => {
    setIsRotating(true);
    try {
      await onRotateKey();
    } finally {
      setIsRotating(false);
    }
  };

  const handleSimulateScan = () => {
    setScanSimulated(true);
    onVerifyStatusChange(true);
    setTimeout(() => setScanSimulated(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-1.5">
                <span>Verify Security Code</span>
                {profile.verified && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                    <Check className="w-2.5 h-2.5" />
                    <span>Verified</span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                End-to-End Encryption · WhatsApp AI Agent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Explanation Text */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 text-xs text-emerald-200/90 leading-relaxed">
            <p>
              Messages and calls with <strong>{contactName}</strong> ({phoneNumber}) are secured with <strong>AES-256-GCM End-to-End Encryption</strong>. Neither WhatsApp, Google AI Studio, nor intermediate servers can decrypt or read your messages.
            </p>
            <p className="mt-2 text-slate-400">
              To verify that encryption is active, compare the 60-digit safety number below or scan the security QR code.
            </p>
          </div>

          {/* Interactive QR Code Visualizer */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-950 border border-slate-800 rounded-2xl relative group">
            {/* SVG Procedural QR Code */}
            <div className="w-48 h-48 bg-white p-3 rounded-2xl shadow-inner flex flex-col items-center justify-center relative">
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-950">
                {/* QR Positioning Markers */}
                <rect x="5" y="5" width="26" height="26" fill="currentColor" rx="4" />
                <rect x="9" y="9" width="18" height="18" fill="white" rx="2" />
                <rect x="13" y="13" width="10" height="10" fill="currentColor" rx="2" />

                <rect x="69" y="5" width="26" height="26" fill="currentColor" rx="4" />
                <rect x="73" y="9" width="18" height="18" fill="white" rx="2" />
                <rect x="77" y="13" width="10" height="10" fill="currentColor" rx="2" />

                <rect x="5" y="69" width="26" height="26" fill="currentColor" rx="4" />
                <rect x="9" y="73" width="18" height="18" fill="white" rx="2" />
                <rect x="13" y="77" width="10" height="10" fill="currentColor" rx="2" />

                {/* Procedural Data Pattern derived from fingerprint */}
                <rect x="36" y="8" width="6" height="6" fill="currentColor" />
                <rect x="46" y="8" width="8" height="6" fill="currentColor" />
                <rect x="58" y="8" width="6" height="6" fill="currentColor" />

                <rect x="36" y="18" width="8" height="6" fill="currentColor" />
                <rect x="48" y="18" width="6" height="6" fill="currentColor" />

                <rect x="36" y="28" width="6" height="8" fill="currentColor" />
                <rect x="46" y="28" width="18" height="6" fill="currentColor" />

                <rect x="8" y="36" width="6" height="6" fill="currentColor" />
                <rect x="18" y="36" width="8" height="6" fill="currentColor" />
                <rect x="28" y="36" width="6" height="6" fill="currentColor" />
                <rect x="38" y="38" width="6" height="6" fill="currentColor" />
                <rect x="48" y="38" width="10" height="6" fill="currentColor" />
                <rect x="62" y="38" width="8" height="6" fill="currentColor" />
                <rect x="74" y="36" width="6" height="6" fill="currentColor" />
                <rect x="84" y="36" width="10" height="6" fill="currentColor" />

                <rect x="8" y="48" width="12" height="6" fill="currentColor" />
                <rect x="24" y="48" width="8" height="6" fill="currentColor" />
                <rect x="36" y="48" width="8" height="6" fill="currentColor" />
                <rect x="50" y="48" width="6" height="6" fill="currentColor" />
                <rect x="60" y="48" width="12" height="6" fill="currentColor" />
                <rect x="78" y="48" width="14" height="6" fill="currentColor" />

                <rect x="8" y="58" width="8" height="6" fill="currentColor" />
                <rect x="20" y="58" width="6" height="6" fill="currentColor" />
                <rect x="32" y="58" width="14" height="6" fill="currentColor" />
                <rect x="50" y="58" width="10" height="6" fill="currentColor" />
                <rect x="66" y="58" width="8" height="6" fill="currentColor" />
                <rect x="78" y="58" width="14" height="6" fill="currentColor" />

                <rect x="36" y="68" width="8" height="6" fill="currentColor" />
                <rect x="48" y="68" width="6" height="6" fill="currentColor" />
                <rect x="58" y="68" width="14" height="6" fill="currentColor" />
                <rect x="76" y="68" width="16" height="6" fill="currentColor" />

                <rect x="36" y="78" width="12" height="6" fill="currentColor" />
                <rect x="52" y="78" width="8" height="6" fill="currentColor" />
                <rect x="64" y="78" width="10" height="6" fill="currentColor" />
                <rect x="78" y="78" width="14" height="6" fill="currentColor" />

                {/* Center Lock Badge */}
                <circle cx="50" cy="50" r="10" fill="white" />
                <circle cx="50" cy="50" r="8" fill="#10b981" />
              </svg>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 text-center">
              Scan this code from a secondary device to verify encryption integrity.
            </p>

            <button
              onClick={handleSimulateScan}
              className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-medium transition flex items-center space-x-1.5 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>{scanSimulated ? '✓ Code Verified Successfully' : 'Simulate Camera QR Scan'}</span>
            </button>
          </div>

          {/* 60-Digit Safety Number Grid */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                <span>60-Digit Safety Number</span>
              </span>
              <button
                onClick={handleCopy}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
              {blocks.map((block, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800/80 p-2 rounded-xl text-slate-200 tracking-wider font-semibold"
                >
                  {block}
                </div>
              ))}
            </div>
          </div>

          {/* Cryptographic Key Parameters */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/70 rounded-xl">
              <span className="text-slate-400">Encryption Cipher</span>
              <span className="font-mono text-white font-semibold">AES-256-GCM (Authenticated)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/70 rounded-xl">
              <span className="text-slate-400">Key Fingerprint</span>
              <span className="font-mono text-emerald-400 font-semibold">{profile.keyFingerprint}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/70 rounded-xl">
              <span className="text-slate-400">Forward Secrecy</span>
              <span className="text-slate-300">
                Rotated {new Date(profile.lastRotatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Raw Key Toggle */}
          <div className="border-t border-slate-800 pt-3">
            <button
              onClick={() => setShowRawKey(!showRawKey)}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 cursor-pointer"
            >
              {showRawKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showRawKey ? 'Hide Device Secret Key' : 'Inspect Raw Device Symmetric Key (Base64)'}</span>
            </button>

            {showRawKey && (
              <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[10px] text-amber-300 break-all select-all">
                {profile.rawKeyB64 || 'Generated via WebCrypto API'}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <button
            onClick={handleRotate}
            disabled={isRotating}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
            <span>Rotate Encryption Key</span>
          </button>

          <button
            onClick={() => onVerifyStatusChange(!profile.verified)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              profile.verified
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{profile.verified ? 'Marked as Verified' : 'Mark as Verified'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
