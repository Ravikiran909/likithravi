import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  Fingerprint,
  RefreshCw,
  QrCode,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  FileCode,
  Terminal,
  Activity,
  Zap,
} from 'lucide-react';
import { StudentProfile, E2EESecurityProfile, SecurityAuditLogEntry } from '../types/index.ts';
import {
  getOrCreateE2EEProfile,
  rotateSessionKey,
  saveE2EEProfile,
  encryptText,
  decryptText,
} from '../utils/e2eeCrypto.ts';
import { E2EESafetyNumberModal } from './E2EESafetyNumberModal.tsx';

interface E2EESecurityVaultProps {
  profile: StudentProfile;
  onProfileUpdate?: (updated: StudentProfile) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
}

export const E2EESecurityVault: React.FC<E2EESecurityVaultProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
}) => {
  const [e2eeProfile, setE2eeProfile] = useState<E2EESecurityProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Live Crypto Playground state
  const [testInput, setTestInput] = useState('Integration by Parts: ∫u·dv = u·v - ∫v·du');
  const [testEncrypted, setTestEncrypted] = useState<{
    ciphertext: string;
    iv: string;
    authTag?: string;
    keyFingerprint: string;
    timestamp: string;
  } | null>(null);
  const [testDecrypted, setTestDecrypted] = useState<string | null>(null);
  const [isEncryptingTest, setIsEncryptingTest] = useState(false);

  // Initialize or load E2EE profile for student
  useEffect(() => {
    let isMounted = true;
    getOrCreateE2EEProfile(profile.userId, profile.whatsappNumber || '+91 98450 11223').then((p) => {
      if (isMounted) setE2eeProfile(p);
    });
    return () => {
      isMounted = false;
    };
  }, [profile.userId, profile.whatsappNumber]);

  const handleToggleE2EE = (enabled: boolean) => {
    if (!e2eeProfile) return;
    const log: SecurityAuditLogEntry = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      action: enabled ? 'key_pair_generated' : 'key_rotated',
      description: enabled
        ? 'End-to-End Encryption enforcement enabled by student.'
        : 'End-to-End Encryption paused.',
      fingerprint: e2eeProfile.keyFingerprint,
      status: 'success',
    };

    const updated: E2EESecurityProfile = {
      ...e2eeProfile,
      enabled,
      auditLogs: [log, ...(e2eeProfile.auditLogs || [])].slice(0, 30),
    };

    setE2eeProfile(updated);
    saveE2EEProfile(profile.userId, updated);
    setActionNotice(enabled ? '🛡️ End-to-End Encryption is now ACTIVE' : '⚠️ End-to-End Encryption paused');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleToggleOption = (
    key: 'autoEncryptMessages' | 'autoEncryptDocuments' | 'autoEncryptQuizHistory',
    val: boolean
  ) => {
    if (!e2eeProfile) return;
    const updated: E2EESecurityProfile = {
      ...e2eeProfile,
      [key]: val,
    };
    setE2eeProfile(updated);
    saveE2EEProfile(profile.userId, updated);
  };

  const handleRotateKey = async () => {
    setIsRotating(true);
    try {
      const updated = await rotateSessionKey(profile.userId, profile.whatsappNumber || '+91 98450 11223');
      setE2eeProfile(updated);
      setActionNotice('🔑 Session Key successfully rotated with forward secrecy!');
      setTimeout(() => setActionNotice(null), 3500);
    } finally {
      setIsRotating(false);
    }
  };

  const handleVerifyStatusChange = (verified: boolean) => {
    if (!e2eeProfile) return;
    const log: SecurityAuditLogEntry = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      action: 'safety_number_verified',
      description: verified
        ? 'WhatsApp 60-digit Safety Number verified via cryptographic match.'
        : 'Verification status cleared.',
      fingerprint: e2eeProfile.keyFingerprint,
      status: 'success',
    };

    const updated: E2EESecurityProfile = {
      ...e2eeProfile,
      verified,
      auditLogs: [log, ...(e2eeProfile.auditLogs || [])].slice(0, 30),
    };
    setE2eeProfile(updated);
    saveE2EEProfile(profile.userId, updated);
  };

  const handleCopyFingerprint = () => {
    if (e2eeProfile?.keyFingerprint && navigator.clipboard) {
      navigator.clipboard.writeText(e2eeProfile.keyFingerprint);
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
    }
  };

  // Run real-time encryption in playground
  const handleRunPlaygroundEncrypt = async () => {
    if (!testInput.trim()) return;
    setIsEncryptingTest(true);
    try {
      const envelope = await encryptText(testInput, e2eeProfile?.rawKeyB64, profile.userId);
      setTestEncrypted(envelope);
      setTestDecrypted(null);
    } finally {
      setIsEncryptingTest(false);
    }
  };

  const handleRunPlaygroundDecrypt = async () => {
    if (!testEncrypted) return;
    const decrypted = await decryptText(testEncrypted, e2eeProfile?.rawKeyB64, profile.userId);
    setTestDecrypted(decrypted);
  };

  if (!e2eeProfile) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-center space-x-2 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
        <span>Initializing Hardware-Backed E2EE Keys...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
                <span>End-to-End Encryption (E2EE) Vault</span>
              </h3>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex items-center space-x-1 ${
                  e2eeProfile.enabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {e2eeProfile.enabled ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                <span>{e2eeProfile.enabled ? 'AES-256-GCM Active' : 'Encryption Paused'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Client-side cryptographic security securing WhatsApp chat, study materials, and learning logs.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verify Safety Number</span>
          </button>

          <button
            onClick={() => handleToggleE2EE(!e2eeProfile.enabled)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              e2eeProfile.enabled
                ? 'bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
            }`}
          >
            {e2eeProfile.enabled ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{e2eeProfile.enabled ? 'Pause E2EE' : 'Enforce E2EE'}</span>
          </button>
        </div>
      </div>

      {/* Action Notice */}
      {actionNotice && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 flex items-center space-x-2 animate-fadeIn relative z-10">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* KPI & Cryptographic Specs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 relative z-10">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Cryptographic Cipher</span>
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base font-black text-white mt-1">AES-GCM-256</div>
          <div className="text-[11px] text-emerald-400 mt-0.5">NIST SP 800-38D Standard</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Key Fingerprint</span>
            <button onClick={handleCopyFingerprint} className="cursor-pointer text-slate-400 hover:text-white">
              {copiedFingerprint ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-base font-black text-amber-300 mt-1 font-mono truncate">
            {e2eeProfile.keyFingerprint}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Device Key ID</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Safety Number</span>
            <QrCode className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-base font-black text-indigo-300 mt-1">
            {e2eeProfile.verified ? 'Verified ✓' : 'Unverified'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">60-digit comparison code</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Forward Secrecy</span>
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-base font-black text-cyan-300 mt-1">Active</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Rotated {new Date(e2eeProfile.lastRotatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Granular Encryption Protection Settings */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 mb-6 relative z-10">
        <h4 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
          <KeyRound className="w-4 h-4 text-emerald-400" />
          <span>Granular Client-Side Encryption Rules</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700 transition">
            <div className="pr-2">
              <span className="text-xs font-semibold text-white block">WhatsApp AI Chat Messages</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Encrypt all queries before wire dispatch
              </span>
            </div>
            <input
              type="checkbox"
              checked={e2eeProfile.autoEncryptMessages}
              onChange={(e) => handleToggleOption('autoEncryptMessages', e.target.checked)}
              className="accent-emerald-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700 transition">
            <div className="pr-2">
              <span className="text-xs font-semibold text-white block">Study Notes & Documents</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Zero-knowledge storage in Firestore & Mongo
              </span>
            </div>
            <input
              type="checkbox"
              checked={e2eeProfile.autoEncryptDocuments}
              onChange={(e) => handleToggleOption('autoEncryptDocuments', e.target.checked)}
              className="accent-emerald-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700 transition">
            <div className="pr-2">
              <span className="text-xs font-semibold text-white block">Quiz & Diagnostic Answers</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Encrypt test choices and scoring logs
              </span>
            </div>
            <input
              type="checkbox"
              checked={e2eeProfile.autoEncryptQuizHistory}
              onChange={(e) => handleToggleOption('autoEncryptQuizHistory', e.target.checked)}
              className="accent-emerald-500 w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* Live Cryptographic Lab & Ciphertext Inspector */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 mb-6 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">Live Cryptographic Inspector (WebCrypto Lab)</h4>
          </div>
          <span className="text-xs text-slate-400">Real-time AES-GCM 256 execution</span>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Plaintext Payload to Encrypt:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Type confidential note..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={handleRunPlaygroundEncrypt}
                disabled={isEncryptingTest}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition cursor-pointer flex items-center space-x-1"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Encrypt</span>
              </button>
            </div>
          </div>

          {testEncrypted && (
            <div className="mt-4 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                <span className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Wire Transmission Ciphertext Envelope:</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500">{testEncrypted.timestamp}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block">Initialization Vector (IV - 12 bytes Base64):</span>
                  <span className="text-cyan-300 break-all">{testEncrypted.iv}</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block">Signer Key Fingerprint:</span>
                  <span className="text-amber-300">{testEncrypted.keyFingerprint}</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[11px]">
                <span className="text-slate-500 block">Encrypted Ciphertext (AES-256-GCM + Auth Tag):</span>
                <span className="text-emerald-300 break-all">{testEncrypted.ciphertext}</span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={handleRunPlaygroundDecrypt}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition flex items-center space-x-1 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Verify Decryption with Device Key</span>
                </button>

                {testDecrypted && (
                  <span className="text-xs text-slate-300 flex items-center space-x-1 font-mono">
                    <span className="text-slate-500">Decrypted:</span>
                    <strong className="text-white">"{testDecrypted}"</strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Audit Log */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">Cryptographic Audit & Key Rotation Log</h4>
          </div>
          <button
            onClick={handleRotateKey}
            disabled={isRotating}
            className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRotating ? 'animate-spin' : ''}`} />
            <span>Rotate Key Now</span>
          </button>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
          {e2eeProfile.auditLogs && e2eeProfile.auditLogs.length > 0 ? (
            e2eeProfile.auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 bg-slate-900 border border-slate-800/70 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-300 font-medium">{log.description}</span>
                </div>
                <div className="flex items-center space-x-3 text-[11px] text-slate-500 shrink-0 font-mono">
                  <span>{log.fingerprint}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 italic">No previous audit logs recorded.</p>
          )}
        </div>
      </div>

      {/* WhatsApp Safety Number Modal */}
      <E2EESafetyNumberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profile={e2eeProfile}
        contactName={profile.name || 'Student Learner'}
        phoneNumber={profile.whatsappNumber || '+91 98450 11223'}
        onRotateKey={handleRotateKey}
        onVerifyStatusChange={handleVerifyStatusChange}
      />
    </div>
  );
};
