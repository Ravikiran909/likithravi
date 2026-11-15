import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  Building2,
  ArrowRight,
  CheckCircle2,
  Lock,
  BookOpen,
  Zap,
  Trophy,
  UserCheck,
  Briefcase,
  Bot,
  Youtube,
  LogOut,
  ArrowLeft,
  Target,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import { signInWithGoogle } from '../firebase.ts';
import { StudentProfile } from '../types/index.ts';

export type AccountPortalType = 'student' | 'user';

export interface WorkspaceEntryPayload {
  accountType: AccountPortalType;
  name: string;
  educationLevel: StudentProfile['educationLevel'];
  whatsappNumber?: string;
}

interface StudentLoginDashboardProps {
  onEnterAsGuest: (payload: WorkspaceEntryPayload) => void;
  onLoginSuccess: (user: any, accountType: AccountPortalType) => void;
  currentUser?: any;
  currentProfile?: StudentProfile;
  isInAppView?: boolean;
  onSwitchAccountType?: (accountType: AccountPortalType) => void;
  onLogout?: () => void;
  onBackToApp?: () => void;
}

const STUDENT_TRACKS: { value: StudentProfile['educationLevel']; label: string }[] = [
  { value: 'college_university', label: 'College / University' },
  { value: 'school', label: 'High School / K-12' },
  { value: 'competitive_exam', label: 'Competitive & Entrance Exams (GATE / GRE / SAT / UPSC)' },
  { value: 'engineering', label: 'Engineering & Computer Science' },
];

const USER_TRACKS: { value: StudentProfile['educationLevel']; label: string }[] = [
  { value: 'professional', label: 'Working Professional / Career Growth' },
  { value: 'engineering', label: 'Software Developer / Tech Builder' },
  { value: 'college_university', label: 'Independent Researcher / Self-Learner' },
];

export const StudentLoginDashboard: React.FC<StudentLoginDashboardProps> = ({
  onEnterAsGuest,
  onLoginSuccess,
  currentUser,
  currentProfile,
  isInAppView = false,
  onSwitchAccountType,
  onLogout,
  onBackToApp,
}) => {
  const initialType: AccountPortalType =
    currentProfile?.accountType === 'user' ? 'user' : 'student';

  const [accountType, setAccountType] = useState<AccountPortalType>(initialType);
  const [fullName, setFullName] = useState<string>(
    currentUser?.displayName ||
      (currentProfile?.name && currentProfile.name !== 'Active Learner'
        ? currentProfile.name
        : '')
  );
  const [educationLevel, setEducationLevel] = useState<StudentProfile['educationLevel']>(
    currentProfile?.educationLevel || (initialType === 'user' ? 'professional' : 'college_university')
  );
  const [whatsappNumber, setWhatsappNumber] = useState<string>(
    currentProfile?.whatsappNumber && currentProfile.whatsappNumber !== '+91 98450 11223'
      ? currentProfile.whatsappNumber
      : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accountType === 'student') {
      if (!STUDENT_TRACKS.some((t) => t.value === educationLevel)) {
        setEducationLevel('college_university');
      }
    } else {
      if (!USER_TRACKS.some((t) => t.value === educationLevel)) {
        setEducationLevel('professional');
      }
    }
  }, [accountType]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        onLoginSuccess(user, accountType);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('popup-closed-by-user')) {
        setError('Google sign-in popup was closed before completion. Please try again.');
      } else if (msg.includes('popup-blocked')) {
        setError('Browser blocked the sign-in popup. Please allow popups for this site or use quick workspace access below.');
      } else {
        setError(msg || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = fullName.trim().slice(0, 100);
    const fallbackName = accountType === 'student' ? 'Student Scholar' : 'Workspace User';
    onEnterAsGuest({
      accountType,
      name: cleanedName || fallbackName,
      educationLevel,
      whatsappNumber: whatsappNumber.trim().slice(0, 30) || '+91 98450 11223',
    });
  };

  const activeTracks = accountType === 'student' ? STUDENT_TRACKS : USER_TRACKS;

  const portalCapabilities =
    accountType === 'student'
      ? [
          {
            icon: GraduationCap,
            title: 'Adaptive Study Roadmap',
            desc: 'Daily schedules, weak-topic drills, and syllabus progress tracking.',
          },
          {
            icon: BookOpen,
            title: 'Verified RAG Knowledge Base',
            desc: 'Ask questions grounded directly in your indexed study documents.',
          },
          {
            icon: Zap,
            title: 'Socratic WhatsApp & Voice Tutor',
            desc: 'Step-by-step conceptual reasoning in 20+ languages.',
          },
          {
            icon: Trophy,
            title: 'Mastery & Progress Analytics',
            desc: 'Monitor daily quiz accuracy, focus hours, and curriculum mastery.',
          },
        ]
      : [
          {
            icon: Zap,
            title: 'Voice & WhatsApp AI Tutor',
            desc: 'Practice step-by-step Socratic reasoning in 20+ languages.',
          },
          {
            icon: Bot,
            title: 'AIO Doubt Solver',
            desc: 'Solve technical bugs, system design questions, and career doubts.',
          },
          {
            icon: Youtube,
            title: 'Curated Tech Video Hub',
            desc: 'Free full courses in Python, Java, C, C++, SQL, Data Analysis & Agentic AI.',
          },
          {
            icon: ShieldCheck,
            title: 'Cloud & Local Sync',
            desc: 'Encrypted workspace backed by Google Cloud Firestore.',
          },
        ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full mx-auto space-y-6">
        {/* Top Context Bar when opened inside the app */}
        {isInAppView && onBackToApp && (
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <button
              type="button"
              onClick={onBackToApp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Command Center</span>
            </button>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>Account Portal</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-200 font-medium">
                {currentUser ? 'Google Account Connected' : 'Local Workspace'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Column: Portal Overview & Capabilities */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-8 py-2">
            <div className="space-y-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    Universal Learning Command
                  </h1>
                  <p className="text-xs text-slate-400">
                    Student Portal · User Workspace · Socratic AI Platform
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight max-w-xl">
                  {accountType === 'student'
                    ? 'Structured learning built for school, college, engineering, and lifelong students.'
                    : 'AI career, coding, and productivity tools built for everyday users.'}
                </h2>
                <p className="text-slate-400 text-base max-w-lg leading-relaxed">
                  {accountType === 'student'
                    ? 'Sign in to sync your study plans, adaptive quiz scores, flashcards, and curriculum progress across sessions with Google Cloud Firestore.'
                    : 'Sign in to save your AIO Doubt Solver conversations, curated coding course progress, and skill roadmaps.'}
                </p>
              </div>

              {/* Dynamic Portal Capabilities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {portalCapabilities.map((feature, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2"
                  >
                    <div className="flex items-center gap-2 text-emerald-400">
                      <feature.icon className="w-4 h-4 shrink-0" />
                      <span className="font-semibold text-sm text-white">{feature.title}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Session Snapshot (real metrics if profile exists, otherwise clean security note) */}
            {currentProfile && isInAppView ? (
              <div className="pt-6 border-t border-slate-800 grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-400">Quiz Accuracy</div>
                  <div className="text-xl font-bold text-white font-mono tabular-nums mt-0.5 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>
                      {currentProfile.totalQuestionsAnswered > 0
                        ? Math.round(
                            (currentProfile.correctAnswers /
                              currentProfile.totalQuestionsAnswered) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Questions Solved</div>
                  <div className="text-xl font-bold text-white font-mono tabular-nums mt-0.5">
                    {currentProfile.totalQuestionsAnswered || 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Mastery Progress</div>
                  <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-0.5 flex items-center gap-1.5">
                    <Target className="w-4 h-4" />
                    <span>{currentProfile.overallProgress || 0}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Firebase Authentication</span>
                </span>
                <span aria-hidden="true">·</span>
                <span>Cloud Firestore Sync</span>
                <span aria-hidden="true">·</span>
                <span>Instant Guest Mode Available</span>
              </div>
            )}
          </div>

          {/* Right Column: Login & Role Dashboard Card */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              {/* Header & Role Segmented Control */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {currentUser ? 'Account & Portal Dashboard' : 'Sign In Dashboard'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Select your role to tailor your workspace and dashboard tools.
                    </p>
                  </div>
                </div>

                {/* Interactive Role Tabs: Student vs User */}
                <div
                  role="tablist"
                  aria-label="Select Account Role"
                  className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={accountType === 'student'}
                    onClick={() => {
                      setAccountType('student');
                      if (currentUser && onSwitchAccountType) {
                        onSwitchAccountType('student');
                      }
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      accountType === 'student'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 shrink-0" />
                    <span>Student Login</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={accountType === 'user'}
                    onClick={() => {
                      setAccountType('user');
                      if (currentUser && onSwitchAccountType) {
                        onSwitchAccountType('user');
                      }
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      accountType === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 shrink-0" />
                    <span>User Login</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Current Authenticated Google Account View */}
              {currentUser ? (
                <div className="space-y-5">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || 'User avatar'}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
                          {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {currentUser.displayName || currentProfile?.name || 'Signed-in User'}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{currentUser.email}</div>
                        <div className="text-[11px] text-emerald-400 mt-0.5">
                          {accountType === 'student' ? 'Student Account' : 'User Account'} · Cloud Synced
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {onBackToApp && (
                      <button
                        type="button"
                        onClick={onBackToApp}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Open {accountType === 'student' ? 'Student' : 'User'} Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    {onLogout && (
                      <button
                        type="button"
                        onClick={onLogout}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-rose-300 border border-slate-800 rounded-xl font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Primary Firebase Google Auth CTA */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-sm transition-colors disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                          <span>Connecting Google Account...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              fill="#4285F4"
                              d="M23.745 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.97z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                            />
                          </svg>
                          <span>
                            Continue with Google as {accountType === 'student' ? 'Student' : 'User'}
                          </span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-center text-slate-400">
                      Recommended for persistent Firestore cloud sync across devices.
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center py-1">
                    <div className="w-full border-t border-slate-800" />
                    <span className="bg-slate-900 px-3 text-[11px] text-slate-400 font-medium whitespace-nowrap">
                      Or configure quick workspace access
                    </span>
                    <div className="w-full border-t border-slate-800" />
                  </div>

                  {/* Quick Local / Guest Profile Form */}
                  <form onSubmit={handleWorkspaceSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="login-fullname"
                          className="block text-xs font-medium text-slate-300"
                        >
                          {accountType === 'student' ? 'Student Name' : 'User Name'}
                        </label>
                        <input
                          id="login-fullname"
                          type="text"
                          value={fullName}
                          maxLength={100}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={accountType === 'student' ? 'e.g. Aarav Mehta' : 'e.g. Priya Nair'}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="login-track"
                          className="block text-xs font-medium text-slate-300"
                        >
                          {accountType === 'student' ? 'Academic Level' : 'Workspace Track'}
                        </label>
                        <select
                          id="login-track"
                          value={educationLevel}
                          onChange={(e) =>
                            setEducationLevel(e.target.value as StudentProfile['educationLevel'])
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                        >
                          {activeTracks.map((track) => (
                            <option key={track.value} value={track.value}>
                              {track.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="login-whatsapp"
                        className="block text-xs font-medium text-slate-300"
                      >
                        WhatsApp Number <span className="text-slate-500">(Optional for study reminders)</span>
                      </label>
                      <input
                        id="login-whatsapp"
                        type="tel"
                        value={whatsappNumber}
                        maxLength={30}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="+91 98450 11223"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono tabular-nums"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-sm text-white transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer ${
                        accountType === 'student'
                          ? 'bg-emerald-600 hover:bg-emerald-500'
                          : 'bg-indigo-600 hover:bg-indigo-500'
                      }`}
                    >
                      <UserCheck className="w-4 h-4 shrink-0" />
                      <span>
                        {isInAppView
                          ? `Save & Switch to ${accountType === 'student' ? 'Student' : 'User'} Workspace`
                          : `Enter ${accountType === 'student' ? 'Student' : 'User'} Dashboard`}
                      </span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Footer Guarantees */}
            <div className="pt-5 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2.5 text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-xs">
                  {accountType === 'student'
                    ? 'Includes Study Planner, Adaptive Quizzes, Flashcards & Analytics'
                    : 'Includes AIO Doubt Solver, Free Coding Videos & Skill Analytics'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-xs">
                  Protected by Cloud Firestore ownership rules and encrypted local storage
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
