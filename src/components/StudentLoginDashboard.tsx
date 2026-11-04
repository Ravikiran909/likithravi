import React, { useState } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  Building2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Globe,
  MessageSquare,
  Zap,
  BookOpen,
  Trophy,
} from 'lucide-react';
import { signInWithGoogle } from '../firebase.ts';

interface StudentLoginDashboardProps {
  onEnterAsGuest: () => void;
  onLoginSuccess: (user: any) => void;
}

export const StudentLoginDashboard: React.FC<StudentLoginDashboardProps> = ({
  onEnterAsGuest,
  onLoginSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03),transparent_70%)] pointer-events-none" />

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Side: Branding & Features */}
        <div className="space-y-8 animate-in fade-in slide-in-from-left duration-700">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-2xl shadow-emerald-500/20 text-white">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
                Skill & Exam Command
              </h1>
              <p className="text-emerald-400 font-bold text-sm uppercase tracking-widest">
                Official Socratic AI Learning Platform
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
              Master Your Exams. <br />
              <span className="text-emerald-400">Own Your Future.</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-lg leading-relaxed font-medium">
              Join thousands of aspirants preparing for UPSC, SSC, Banking, and high-demand Technical Skills with our unified RAG-powered Socratic AI Tutor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: ShieldCheck, title: 'Hardened Security', desc: 'AES-256-GCM encrypted study vault.' },
              { icon: BookOpen, title: 'RAG Knowledge', desc: 'Search across thousands of verified documents.' },
              { icon: Zap, title: 'Socratic Tutor', desc: 'Real-time conceptual guidance on WhatsApp.' },
              { icon: Trophy, title: 'Skill Milestones', desc: 'Earn digital badges as you master topics.' },
            ].map((feature, i) => (
              <div key={i} className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <feature.icon className="w-5 h-5" />
                  <span className="font-bold text-xs uppercase tracking-wider">{feature.title}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Platform Stats Teaser */}
          <div className="flex items-center space-x-6 pt-4 border-t border-slate-800/50">
            <div>
              <div className="text-2xl font-black text-white">145k+</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Students Active</div>
            </div>
            <div className="w-px h-10 bg-slate-800" />
            <div>
              <div className="text-2xl font-black text-white">12k+</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Mock Tests Daily</div>
            </div>
            <div className="w-px h-10 bg-slate-800" />
            <div>
              <div className="text-2xl font-black text-emerald-400">98%</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Accuracy Rate</div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Dashboard Card */}
        <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative animate-in fade-in slide-in-from-right duration-700">
          <div className="absolute top-0 right-0 p-6">
            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">
              Secured Session
            </span>
          </div>

          <div className="space-y-8">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">Student Login Dashboard</h3>
              <p className="text-sm text-slate-400 font-medium">Access your personalized curriculum roadmap and sync progress across devices.</p>
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-400 flex items-start space-x-3">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-slate-800" />
                <span className="absolute bg-slate-950 px-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Access Command Center</span>
              </div>

              <button
                onClick={onEnterAsGuest}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm transition shadow-xl shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-50"
              >
                <span>Enter Prep Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-6 border-t border-slate-800/50 space-y-4">
              <div className="flex items-center space-x-3 text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium">Automatic cloud sync of your study plan</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium">Persistent learning history & digital badges</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium">Direct Socratic AI Tutor access via WhatsApp</span>
              </div>
            </div>

            <p className="text-[10px] text-center text-slate-500 font-medium leading-relaxed">
              By continuing, you agree to our Terms of Service and Privacy Policy. <br />
              All data is protected by <strong>Google Cloud Firestore</strong> security rules.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-12 text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center space-x-4 relative z-10">
        <span className="flex items-center space-x-1">
          <Globe className="w-3 h-3 text-slate-600" />
          <span>India Prep Infrastructure</span>
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span>Socratic AI V3.0</span>
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span>Secured by Firebase</span>
      </div>
    </div>
  );
};
