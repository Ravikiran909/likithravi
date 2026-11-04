import React, { useState, useMemo } from 'react';
import {
  Bell,
  BookOpen,
  FileText,
  Play,
  Calendar,
  CheckCircle2,
  Send,
  Building2,
  ArrowRight,
  Target,
  Clock,
  X,
  Check,
  Sparkles,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

interface GovExamNotice {
  id: string;
  examCode: string;
  examTitle: string;
  conductingBody: string;
  category: 'UPSC / Civil Services' | 'SSC & Railways' | 'Banking & RBI' | 'State PSC';
  notificationStatus: 'Registration Open' | 'Admit Card & Mock Active' | 'Upcoming Notification';
  applicationDeadline: string;
  examDate: string;
  daysRemaining: number;
  syllabusHighlights: string[];
  prepDocTitle: string;
  liveClassTitle: string;
  videoEmbedUrl: string;
  instructor: string;
  classDuration: string;
}

const GOVERNMENT_EXAM_NOTICES: GovExamNotice[] = [
  {
    id: 'gov_exam_ssc_cgl',
    examCode: 'SSC CGL & RRB NTPC',
    examTitle: 'SSC Combined Graduate Level (Tier-I & II) & Railway NTPC Exam',
    conductingBody: 'Staff Selection Commission (SSC) & Railway Recruitment Board',
    category: 'SSC & Railways',
    notificationStatus: 'Registration Open',
    applicationDeadline: '2026-10-25',
    examDate: '2026-11-08',
    daysRemaining: 32,
    syllabusHighlights: [
      'Quantitative Aptitude: Percentage, Profit & Loss, SI/CI, Time & Work, Mensuration',
      'General Intelligence & Reasoning: Syllogism, Coding-Decoding, Number Series',
      'English Comprehension & General Awareness (Polity, Science, Current Affairs)',
    ],
    prepDocTitle:
      'Government Exams Prep: SSC CGL, IBPS/SBI PO & Railways — Quantitative Aptitude & Reasoning Shortcuts',
    liveClassTitle:
      'SSC CGL, CHSL & Railway NTPC Masterclass: Quantitative Aptitude & Logical Reasoning',
    videoEmbedUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0',
    instructor: 'Prof. R.K. Verma (Competitive Exam Faculty)',
    classDuration: '55 Classes (45 Hours)',
  },
  {
    id: 'gov_exam_upsc_cse',
    examCode: 'UPSC CSE & State PCS',
    examTitle: 'UPSC Civil Services Preliminary & Mains (IAS / IPS / IFS)',
    conductingBody: 'Union Public Service Commission (UPSC)',
    category: 'UPSC / Civil Services',
    notificationStatus: 'Admit Card & Mock Active',
    applicationDeadline: '2026-10-30',
    examDate: '2026-11-22',
    daysRemaining: 46,
    syllabusHighlights: [
      'Indian Polity & Constitution: Fundamental Rights (Art 12–35), Writs, DPSP, Parliament',
      'Indian Economy: RBI Monetary Policy, Budget, Inflation, Inclusive Growth',
      'CSAT Paper-II: Reading Comprehension, Logical Reasoning & Data Sufficiency',
    ],
    prepDocTitle:
      'Government Exams Prep: UPSC CSE & State PCS — Indian Polity, Economy & General Studies',
    liveClassTitle:
      'UPSC CSE & State PCS Foundation Class: Indian Polity, Governance & Laxmikanth Summary',
    videoEmbedUrl: 'https://www.youtube.com/embed/ZA-tUyM_y7s',
    instructor: 'Dr. Siddharth Arora & SWAYAM Faculty',
    classDuration: '40 Lectures (32 Hours)',
  },
  {
    id: 'gov_exam_ibps_sbi_po',
    examCode: 'IBPS PO / SBI PO & RBI',
    examTitle: 'IBPS & SBI Probationary Officer (PO) & RBI Grade B Officer Exam',
    conductingBody: 'Institute of Banking Personnel Selection (IBPS) & RBI',
    category: 'Banking & RBI',
    notificationStatus: 'Registration Open',
    applicationDeadline: '2026-10-20',
    examDate: '2026-11-15',
    daysRemaining: 39,
    syllabusHighlights: [
      'High-Level Seating Arrangement (Circular/Linear) & Floor Puzzles',
      'Data Interpretation: Caselets, Missing DI, Radar & Mixed Graphs',
      'Banking & Financial Awareness: Repo Rate, Basel-III Norms, NPAs, UPI & Digital Rupee',
    ],
    prepDocTitle:
      'Government Exams Prep: SSC CGL, IBPS/SBI PO & Railways — Quantitative Aptitude & Reasoning Shortcuts',
    liveClassTitle:
      'IBPS PO, SBI PO & RBI Grade B Complete Class: Data Interpretation, Puzzles & Banking Awareness',
    videoEmbedUrl: 'https://www.youtube.com/embed/_uQrJ0TkZlc',
    instructor: 'Ankush Lamba & Banking Prep Team',
    classDuration: '36 Classes (28 Hours)',
  },
  {
    id: 'gov_exam_state_psc',
    examCode: 'State PSC Exam',
    examTitle: 'State Public Service Commission Preliminary Exam',
    conductingBody: 'State PSC',
    category: 'State PSC',
    notificationStatus: 'Upcoming Notification',
    applicationDeadline: '2026-11-10',
    examDate: '2026-12-15',
    daysRemaining: 70,
    syllabusHighlights: [
      'Regional History & Geography of the State',
      'State Budget & Socio-Economic Survey',
      'General Mental Ability & State-Specific Current Affairs',
    ],
    prepDocTitle: 'State PSC GS Revision Handbook',
    liveClassTitle: 'State PSC Specialized General Studies Masterclass',
    videoEmbedUrl: 'https://www.youtube.com/embed/8mAITcNt710',
    instructor: 'Regional Expert Faculty',
    classDuration: '30 Lectures (25 Hours)',
  },
];

interface GovExamPrepHubProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
  onNavigateToQuiz?: () => void;
  onOpenMaterialsTab?: () => void;
  onLogStudyMinutes?: (mins: number, label?: string) => void;
}

export const GovExamPrepHub: React.FC<GovExamPrepHubProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
  onOpenMaterialsTab,
  onLogStudyMinutes,
}) => {
  const [activeClassVideo, setActiveClassVideo] = useState<GovExamNotice | null>(null);
  const [notificationToast, setNotificationToast] = useState<{
    title: string;
    message: string;
    examCode: string;
  } | null>(null);
  const [sendingAlertId, setSendingAlertId] = useState<string | null>(null);

  const subscribedExams = useMemo(() => {
    const set = new Set<string>();
    (profile.examDates || []).forEach((e) => {
      set.add(e.title.toLowerCase());
    });
    return set;
  }, [profile.examDates]);

  const handleDispatchGovExamNotification = async (exam: GovExamNotice) => {
    setSendingAlertId(exam.id);
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`Government Exam Alert: ${exam.examCode}`, {
            body: `${exam.examTitle} (${exam.notificationStatus}) — Exam Date: ${exam.examDate} (${exam.daysRemaining} days left).`,
            icon: '/icon-192.svg',
          });
        } catch {}
      }

      const existingExams = profile.examDates || [];
      const alreadyExists = existingExams.some(
        (e) => e.title.toLowerCase() === exam.examTitle.toLowerCase()
      );
      const updatedExams = alreadyExists
        ? existingExams
        : [
            ...existingExams,
            {
              subject: 'Government Exams',
              date: exam.examDate,
              title: exam.examTitle,
            },
          ];

      const updatedSubjects = Array.from(
        new Set([...(profile.subjects || []), 'Government Exams', 'Professional Skills'])
      );

      const updatedProfile: StudentProfile = {
        ...profile,
        subjects: updatedSubjects,
        examDates: updatedExams,
      };
      onProfileUpdate(updatedProfile);

      if (db && profile.userId) {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          {
            userId: profile.userId,
            examDates: updatedExams,
          },
          { merge: true }
        ).catch(() => {});
      }

      await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          reminderText: `Government Exam Notification: ${exam.examTitle} (${exam.examCode})`,
          targetTime: profile.preferredStudyTime || '08:00 AM',
          frequency: 'daily',
          subject: 'Government Exams',
          type: 'exam',
          examTitle: exam.examTitle,
          examDate: exam.examDate,
          daysBeforeExam: exam.daysRemaining,
          sendWhatsAppNow: true,
        }),
      }).catch(() => {});

      setNotificationToast({
        title: `Government Exam Notification Activated: ${exam.examCode}`,
        message: `Alert sent for "${exam.examTitle}" (Exam on ${exam.examDate}, ${exam.daysRemaining} days left) and synced to your Study Planner & WhatsApp (${profile.whatsappNumber}).`,
        examCode: exam.examCode,
      });
    } finally {
      setSendingAlertId(null);
    }
  };

  return (
    <section
      aria-label="Government Exams Preparation Hub"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6"
    >
      {/* Live Government Exam Notification Banner */}
      <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
            <Bell className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-amber-400">
                Official Government Exam Notification Desk
              </span>
              <span aria-hidden="true">·</span>
              <span>UPSC CSE · SSC CGL · IBPS/SBI PO · State PSC</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-emerald-400">
                4 Active Exam Alerts
              </span>
            </div>
            <h4 className="text-sm font-bold text-white">
              Upcoming Government Exams: SSC CGL Tier-II (Nov 8), IBPS PO (Nov 15), UPSC Prelims Mock (Nov 22) & State PSC (Dec 15)
            </h4>
            <p className="text-xs text-slate-300">
              Enable instant WhatsApp & browser push notifications for registration deadlines, admit card releases, daily aptitude classes, and verified preparation documents.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleDispatchGovExamNotification(GOVERNMENT_EXAM_NOTICES[0])}
            disabled={sendingAlertId !== null}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Gov Exam Alert Now</span>
          </button>

          {onOpenMaterialsTab && (
            <button
              type="button"
              onClick={onOpenMaterialsTab}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl border border-slate-700 transition cursor-pointer"
            >
              Browse All RAG Docs
            </button>
          )}
        </div>
      </div>

      {/* Toast Confirmation */}
      {notificationToast && (
        <div
          role="status"
          className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-4 flex items-start justify-between gap-3 text-xs text-emerald-200"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white">{notificationToast.title}</div>
              <p className="text-emerald-200/90 mt-0.5">{notificationToast.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotificationToast(null)}
            className="text-emerald-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-indigo-400">Curriculum & Competitive Prep</span>
            <span aria-hidden="true">·</span>
            <span>Official Government Exam Documents & Classes</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-0.5">
            Government Exams Preparation & Notifications Center
          </h3>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">
              Official Examination Notices & Classes
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            UPSC · SSC CGL · Banking PO · State PSC
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GOVERNMENT_EXAM_NOTICES.map((exam) => {
            const isSubscribed = subscribedExams.has(exam.examTitle.toLowerCase());
            const isSending = sendingAlertId === exam.id;

            return (
              <div
                key={exam.id}
                className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between space-y-4 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                        <span className="font-semibold text-amber-400">{exam.examCode}</span>
                        <span aria-hidden="true">·</span>
                        <span>{exam.notificationStatus}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-emerald-400">
                          {exam.daysRemaining}d left
                        </span>
                      </div>
                      <h5 className="text-sm font-bold text-white mt-1">{exam.examTitle}</h5>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {exam.conductingBody} · Exam Date:{' '}
                        <span className="text-slate-200 font-mono tabular-nums">
                          {exam.examDate}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDispatchGovExamNotification(exam)}
                      disabled={isSending}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                        isSubscribed
                          ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>
                        {isSending
                          ? 'Sending...'
                          : isSubscribed
                          ? 'Alert Active'
                          : 'Notify Me'}
                      </span>
                    </button>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-400">Prep Document: </span>
                        <span className="text-white font-medium">{exam.prepDocTitle}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Play className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-400">Preparation Class: </span>
                        <span className="text-emerald-300 font-medium">{exam.liveClassTitle}</span>
                        <span className="text-slate-400 block text-[11px] mt-0.5">
                          {exam.instructor} · {exam.classDuration}
                        </span>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-1 text-xs text-slate-300">
                    {exam.syllabusHighlights.map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onLogStudyMinutes) {
                          onLogStudyMinutes(45, `Gov Exam Class: ${exam.examCode}`);
                        }
                        setActiveClassVideo(exam);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Attend Prep Class</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onNavigateToChat(
                          `I am preparing for ${exam.examTitle} (${exam.examCode}). Summarize the preparation document "${exam.prepDocTitle}" and give me 3 previous-year level practice MCQs.`
                        )
                      }
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Study Notes & PYQs</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDispatchGovExamNotification(exam)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <span>Send WhatsApp Alert</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeClassVideo && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveClassVideo(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-amber-400">
                  {activeClassVideo.examCode} · Live & Recorded Preparation Class
                </div>
                <h4 className="text-base font-bold text-white mt-0.5">
                  {activeClassVideo.liveClassTitle}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeClassVideo.instructor} · {activeClassVideo.classDuration}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveClassVideo(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
              <iframe
                src={activeClassVideo.videoEmbedUrl}
                title={activeClassVideo.liveClassTitle}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-300">
                Companion Document: <span className="text-white font-medium">{activeClassVideo.prepDocTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = activeClassVideo;
                    setActiveClassVideo(null);
                    onNavigateToChat(
                      `I just watched the ${target.examCode} preparation class "${target.liveClassTitle}". Test me with 5 high-yield government exam questions on this topic.`
                    );
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Practice Class Mock Questions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
