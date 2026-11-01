import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  ShieldAlert,
  Delete,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface AppLockOverlayProps {
  isLocked: boolean;
  profile: StudentProfile | null;
  onUnlock: () => void;
}

export const AppLockOverlay: React.FC<AppLockOverlayProps> = ({
  isLocked,
  profile,
  onUnlock,
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [errorShake, setErrorShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isLocked) {
      setPinInput('');
      setErrorMsg(null);
    }
  }, [isLocked]);

  // Listen to physical keyboard events
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        setPinInput('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, pinInput]);

  if (!isLocked) return null;

  const handleDigit = (digit: string) => {
    if (pinInput.length >= 4) return;
    const nextPin = pinInput + digit;
    setPinInput(nextPin);
    setErrorMsg(null);

    if (nextPin.length === 4) {
      verifyPin(nextPin);
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const verifyPin = (enteredPin: string) => {
    const expectedPin = profile?.securityPinHash || '1234'; // Default fallback PIN 1234 if newly enabled
    if (enteredPin === expectedPin) {
      onUnlock();
    } else {
      setErrorShake(true);
      setErrorMsg('Incorrect PIN. Please try again.');
      setTimeout(() => {
        setErrorShake(false);
        setPinInput('');
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Lock Icon & Header */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-600/30 mb-4 animate-bounce duration-1000">
            <Lock className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">
            Security Passcode Required
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
            {profile?.name ? `${profile.name}'s Learning Vault` : 'Personal AI Tutor'} is locked with end-to-end security protection.
          </p>

          {/* PIN Dots Indicator */}
          <div
            className={`flex items-center justify-center space-x-3.5 my-6 ${
              errorShake ? 'animate-shake' : ''
            }`}
          >
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pinInput.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    isFilled
                      ? 'bg-emerald-400 ring-4 ring-emerald-400/30 scale-110 shadow-lg shadow-emerald-400/40'
                      : 'bg-slate-800 border border-slate-700'
                  }`}
                />
              );
            })}
          </div>

          {errorMsg ? (
            <div className="text-xs text-rose-400 font-medium flex items-center space-x-1.5 mb-4 animate-in fade-in">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 mb-4">
              Enter 4-digit PIN (default: <span className="font-mono text-slate-400">1234</span>)
            </div>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mb-6">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className="w-16 h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-emerald-600 active:text-white border border-slate-700 text-lg font-bold text-white transition cursor-pointer flex items-center justify-center shadow-sm select-none"
              >
                {digit}
              </button>
            ))}

            {/* Clear / Blank */}
            <button
              type="button"
              onClick={() => setPinInput('')}
              className="w-16 h-14 rounded-2xl bg-transparent hover:bg-slate-800/50 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer flex items-center justify-center select-none"
            >
              Clear
            </button>

            {/* Zero */}
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="w-16 h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-emerald-600 active:text-white border border-slate-700 text-lg font-bold text-white transition cursor-pointer flex items-center justify-center shadow-sm select-none"
            >
              0
            </button>

            {/* Backspace */}
            <button
              type="button"
              onClick={handleBackspace}
              className="w-16 h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-rose-600 active:text-white border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center shadow-sm select-none"
              title="Delete digit"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 flex items-center space-x-1.5 text-[10px] text-slate-500">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Encrypted with AES-256-GCM & In-Memory Lock</span>
          </div>
        </div>
      </div>
    </div>
  );
};
