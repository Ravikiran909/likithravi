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
  CheckCircle2,
  ShieldCheck,
  Lock,
  Building2,
  Youtube,
} from 'lucide-react';
import { StudentProfile, SUPPORTED_LANGUAGES } from '../types/index.ts';

interface NavbarProps {
  activeTab: 'simulator' | 'voice' | 'videos' | 'documents' | 'student' | 'admin';
  setActiveTab: (tab: 'simulator' | 'voice' | 'videos' | 'documents' | 'student' | 'admin') => void;
  selectedProfile: StudentProfile | null;
  isWhatsAppConfigured: boolean;
  focusMode?: boolean;
  onToggleFocusMode?: (next?: boolean) => void;
  onOpenSecurityHub?: () => void;
  onLockApp?: () => void;
  onLogout?: () => void;
  isFirebaseConnected?: boolean;
  user?: any;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedProfile,
  isWhatsAppConfigured,
  focusMode = false,
  onToggleFocusMode,
  onOpenSecurityHub,
  onLockApp,
  onLogout,
  user,
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
            onClick={() => setActiveTab('student')}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${
                focusMode
                  ? 'bg-gradient-to-tr from-amber-500 to-orange-400 shadow-amber-500/20'
                  : 'bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-500/20'
              }`}
            >
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
                  Learning Command
                </span>
                {focusMode ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    <EyeOff className="w-3 h-3" />
                    <span>FOCUS MODE</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    v3.8 Flash
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {focusMode
                  ? 'Distraction-Free Deep Study session in progress'
                  : 'Universal Academic & Technical Socratic AI Tutor'}
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5">


            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : focusMode
                  ? 'text-slate-500 opacity-50 hover:opacity-100'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden md:inline">WhatsApp Live</span>
            </button>

            <button
              onClick={() => setActiveTab('voice')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer relative ${
                activeTab === 'voice'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/40'
                  : focusMode
                  ? 'text-slate-500 opacity-50'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span className="font-semibold hidden md:inline">Voice Tutor</span>
            </button>

            <button
              onClick={() => setActiveTab('videos')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer relative ${
                activeTab === 'videos'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/40'
                  : focusMode
                  ? 'text-slate-500 opacity-50'
                  : 'text-red-400 hover:text-red-300 hover:bg-red-950/30'
              }`}
            >
              <Youtube className="w-4 h-4 fill-current text-red-500" />
              <span className="font-semibold hidden md:inline">Free Video Tutorials</span>
            </button>

            <button
              onClick={() => setActiveTab('student')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'student'
                  ? focusMode
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span className="hidden md:inline">My Progress</span>
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
                <span className="hidden xl:inline">Admin</span>
              </button>
            )}
          </nav>

          {/* Focus Mode Toggle & Auth */}
          <div className="flex items-center space-x-2">
            {onToggleFocusMode && (
              <div
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
                  focusMode
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-800/90 border-slate-700 text-slate-200'
                }`}
              >
                <BellOff
                  className={`w-3.5 h-3.5 shrink-0 ${
                    focusMode ? 'text-amber-400 animate-pulse' : 'text-slate-400'
                  }`}
                />
                <span className="text-xs font-bold whitespace-nowrap hidden sm:inline">Focus Mode</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={focusMode}
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

            {onOpenSecurityHub && (
              <button
                type="button"
                onClick={onOpenSecurityHub}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 transition cursor-pointer"
                title="Security Hub"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden xl:inline">Security</span>
              </button>
            )}



            {onLogout && (
              <div className="flex items-center space-x-2 border-l border-slate-800 ml-2 pl-4">
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="text-[10px] font-bold text-white leading-tight truncate max-w-[100px]">
                    {user?.displayName || selectedProfile?.name || 'Student'}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-tight">
                    {user ? 'Cloud Active' : 'Guest Mode'}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* WhatsApp Cloud API Live Indicator */}
            {!focusMode && (
              <div className="hidden 2xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 border border-slate-700">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isWhatsAppConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="text-slate-300">
                  {isWhatsAppConfigured ? 'API Active' : 'Sandbox'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

