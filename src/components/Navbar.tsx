import React from 'react';
import {
  MessageSquare,
  GraduationCap,
  LayoutDashboard,
  Mic,
  FileText,
  Globe,
  User,
  LogOut,
  Database,
  BellOff,
  Sparkles,
  EyeOff,
  ScanFace,
  CheckCircle2,
} from 'lucide-react';
import { StudentProfile, SUPPORTED_LANGUAGES } from '../types/index.ts';
import type { FirebaseUser } from '../firebase.ts';

interface NavbarProps {
  activeTab: 'simulator' | 'voice' | 'documents' | 'student' | 'admin';
  setActiveTab: (tab: 'simulator' | 'voice' | 'documents' | 'student' | 'admin') => void;
  profiles: StudentProfile[];
  selectedProfile: StudentProfile | null;
  onSelectProfile: (profile: StudentProfile) => void;
  isWhatsAppConfigured: boolean;
  currentUser: FirebaseUser | null;
  onSignInWithGoogle: () => void;
  onSignOut: () => void;
  isFirebaseConnected: boolean;
  focusMode?: boolean;
  onToggleFocusMode?: (next?: boolean) => void;
  onOpenFaceAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  profiles,
  selectedProfile,
  onSelectProfile,
  isWhatsAppConfigured,
  currentUser,
  onSignInWithGoogle,
  onSignOut,
  focusMode = false,
  onToggleFocusMode,
  onOpenFaceAuth,
}) => {
  return (
    <header
      className={`border-b text-white sticky top-0 z-50 transition-all duration-300 ${
        focusMode
          ? 'bg-slate-950/95 border-amber-500/40 shadow-lg shadow-amber-950/20 backdrop-blur-md'
          : 'bg-slate-900 border-slate-800'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div
            className={`flex items-center space-x-3 cursor-pointer transition-opacity duration-300 ${
              focusMode ? 'opacity-80 hover:opacity-100' : ''
            }`}
            onClick={() => setActiveTab('simulator')}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${
                focusMode
                  ? 'bg-gradient-to-tr from-amber-500 to-orange-400 shadow-amber-500/20'
                  : 'bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-500/20'
              }`}
            >
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
                  WhatsApp AI Learning Agent
                </span>
                {focusMode ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    <EyeOff className="w-3 h-3" />
                    <span>FOCUS MODE ON</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    v3.0
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {focusMode
                  ? 'Distraction-Free Deep Work • Non-Essential UI Hidden'
                  : 'Voice AI Tutor • Speak-to-Speak • Multilingual & Document Grounding'}
              </p>
            </div>
          </div>

          {/* Tab Navigation (Dimmed for non-active/non-student tabs when Focus Mode is active) */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : focusMode
                  ? 'text-slate-500 opacity-50 hover:opacity-100 hover:text-slate-200 hover:bg-slate-900'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden md:inline">WhatsApp Live</span>
            </button>

            {/* Voice AI Agent Tab */}
            <button
              onClick={() => setActiveTab('voice')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer relative ${
                activeTab === 'voice'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/40 ring-1 ring-emerald-400/40'
                  : focusMode
                  ? 'text-slate-500 opacity-50 hover:opacity-100 hover:text-emerald-300'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
              }`}
            >
              <Mic className={`w-4 h-4 ${focusMode ? '' : 'animate-pulse'}`} />
              <span className="font-semibold hidden md:inline">Voice AI Agent</span>
              {!focusMode && (
                <span className="hidden xl:inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.2 bg-emerald-400/20 rounded text-emerald-200">
                  Voice-to-Voice
                </span>
              )}
            </button>

            {/* Study Documents Tab */}
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : focusMode
                  ? 'text-slate-500 opacity-50 hover:opacity-100 hover:text-slate-200 hover:bg-slate-900'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden lg:inline">Study Documents</span>
            </button>

            <button
              onClick={() => setActiveTab('student')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'student'
                  ? focusMode
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30 ring-2 ring-amber-400/50'
                    : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span className="hidden md:inline">Student Portal</span>
            </button>

            {!focusMode && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden xl:inline">Admin & Analytics</span>
              </button>
            )}
          </nav>

          {/* Focus Mode Toggle, Persona Switcher, Language Picker & Auth */}
          <div className="flex items-center space-x-2">
            {/* Global Focus Mode Toggle in Navbar */}
            {onToggleFocusMode && (
              <div
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
                  focusMode
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/40'
                    : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:border-amber-500/50'
                }`}
                title="Toggle Focus Mode: Hides non-essential dashboard widgets and dims surrounding UI for deep-work study sessions"
              >
                <BellOff
                  className={`w-3.5 h-3.5 shrink-0 ${
                    focusMode ? 'text-amber-400 animate-pulse' : 'text-slate-400'
                  }`}
                />
                <span className="text-xs font-bold whitespace-nowrap">Focus Mode</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={focusMode}
                  aria-label="Toggle Focus Mode"
                  onClick={() => onToggleFocusMode(!focusMode)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-300 cursor-pointer focus:outline-none ${
                    focusMode ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                      focusMode ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Global Multilingual Selector (Hidden in Focus Mode to reduce clutter) */}
            {!focusMode && selectedProfile && (
              <div className="relative hidden xl:flex items-center bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200">
                <Globe className="w-3.5 h-3.5 text-emerald-400 mr-1.5 shrink-0" />
                <select
                  id="navbar-language-select"
                  name="preferredLanguage"
                  aria-label="Preferred Language"
                  value={selectedProfile.preferredLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    onSelectProfile({
                      ...selectedProfile,
                      preferredLanguage: newLang,
                    });
                  }}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-1"
                  title="Change Preferred Spoken & Tutor Language"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-slate-800 text-white">
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Student Switcher Dropdown (Hidden in Focus Mode to reduce clutter) */}
            {!focusMode && profiles.length > 0 && selectedProfile && (
              <div className="relative hidden lg:flex items-center bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
                <User className="w-3.5 h-3.5 text-emerald-400 mr-2 shrink-0" />
                <select
                  id="navbar-student-profile-select"
                  name="selectedStudentProfile"
                  aria-label="Select Student Profile"
                  value={selectedProfile.userId}
                  onChange={(e) => {
                    const found = profiles.find((p) => p.userId === e.target.value);
                    if (found) onSelectProfile(found);
                  }}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-1"
                >
                  {profiles.map((p) => (
                    <option key={p.userId} value={p.userId} className="bg-slate-800 text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Biometric Face Authentication Login Button */}
            {onOpenFaceAuth && (
              <button
                type="button"
                onClick={onOpenFaceAuth}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer active:scale-95 ${
                  selectedProfile?.faceAuthEnabled
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400 hover:text-emerald-300'
                }`}
                title="Biometric Face Authentication Login"
              >
                <ScanFace className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {selectedProfile?.faceAuthEnabled ? 'Face ID Verified' : 'Face Login'}
                </span>
                {selectedProfile?.faceAuthEnabled && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                )}
              </button>
            )}

            {/* Google Authentication & Firestore Sync (Dimmed in Focus Mode) */}
            <div className={focusMode ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}>
              {currentUser ? (
                <div className="flex items-center space-x-2 bg-slate-800/90 border border-emerald-500/40 rounded-xl px-2.5 py-1">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-6 h-6 rounded-full border border-emerald-400"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <div className="text-[11px] font-medium text-white leading-tight truncate max-w-[100px]">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </div>
                    <div className="text-[9px] text-emerald-400 flex items-center space-x-0.5">
                      <Database className="w-2.5 h-2.5" />
                      <span>Firestore Synced</span>
                    </div>
                  </div>
                  <button
                    onClick={onSignOut}
                    className="p-1 text-slate-400 hover:text-rose-400 transition"
                    title="Sign out of Firebase"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSignInWithGoogle}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-semibold shadow-sm transition active:scale-95"
                  title="Sign in with your Google account to sync profile & learning records with Firestore"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Google Sign-In</span>
                </button>
              )}
            </div>

            {/* WhatsApp Cloud API Live Indicator */}
            {!focusMode && (
              <div className="hidden 2xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 border border-slate-700">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isWhatsAppConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="text-slate-300">
                  {isWhatsAppConfigured ? 'Cloud API Active' : 'Sandbox Ready'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
