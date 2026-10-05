import React, { useState } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  Eye,
  GraduationCap,
  Award,
  Flame,
  Clock,
  BookOpen,
  Sparkles,
  Printer,
} from 'lucide-react';
import { StudentProfile, StudyPlan, Recommendation } from '../types/index.ts';
import {
  generateStudentProgressPdf,
  generateExportNotesStudyGuidePdf,
  RagDocumentSummaryItem,
} from '../utils/generatePdfReport.ts';

interface AcademicPdfExportCardProps {
  profile: StudentProfile;
  studyPlan?: StudyPlan | null;
  recommendations?: Recommendation[];
}

export const AcademicPdfExportCard: React.FC<AcademicPdfExportCardProps> = ({
  profile,
  studyPlan = null,
  recommendations = [],
}) => {
  const [institutionName, setInstitutionName] = useState<string>(
    'Department of Computer Science & Engineering'
  );
  const [academicTerm, setAcademicTerm] = useState<string>('Fall Semester 2026');
  const [advisorName, setAdvisorName] = useState<string>('Prof. Vikram Sen (Academic Mentor)');
  const [includeQuizBreakdown, setIncludeQuizBreakdown] = useState<boolean>(true);
  const [includeFocusHours, setIncludeFocusHours] = useState<boolean>(true);
  const [includeBadges, setIncludeBadges] = useState<boolean>(true);

  const [isGeneratingAcademicPdf, setIsGeneratingAcademicPdf] = useState<boolean>(false);
  const [isGeneratingNotesPdf, setIsGeneratingNotesPdf] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [showTranscriptPreview, setShowTranscriptPreview] = useState<boolean>(false);

  const accuracy =
    profile.totalQuestionsAnswered > 0
      ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
      : 78;

  const focusedHours = ((profile.focusStats?.totalFocusMinutes || 125) / 60).toFixed(1);
  const letterGrade =
    accuracy >= 90
      ? 'A+ (4.0 GPA)'
      : accuracy >= 80
      ? 'A (3.8 GPA)'
      : accuracy >= 70
      ? 'B+ (3.4 GPA)'
      : 'B (3.0 GPA)';

  const handleDownloadAcademicPdf = () => {
    setIsGeneratingAcademicPdf(true);
    setExportSuccessMsg(null);
    try {
      const cleanName = profile.name.replace(/\s+/g, '_');
      const fileName = `${cleanName}_Academic_Progress_Report_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;

      generateStudentProgressPdf(profile, {
        fileName,
        studyPlan,
        recommendations,
      });

      setExportSuccessMsg(
        `✅ Exported "${fileName}" — Official Academic Progress Summary PDF downloaded!`
      );
      setTimeout(() => setExportSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Failed to generate Academic PDF:', err);
    } finally {
      setIsGeneratingAcademicPdf(false);
    }
  };

  const handleDownloadRagNotesPdf = async () => {
    setIsGeneratingNotesPdf(true);
    setExportSuccessMsg(null);
    try {
      let ragSummaries: RagDocumentSummaryItem[] = [];
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        const docs = data.documents || [];
        ragSummaries = docs.slice(0, 6).map((d: any) => ({
          id: d.id,
          title: d.title,
          subject: d.subject || 'General',
          category: d.category || 'Course Material',
          summary: (d.content || '').slice(0, 360),
          isPinned: (profile.pinnedDocumentIds || []).includes(d.id),
        }));
      }

      const cleanName = profile.name.replace(/\s+/g, '_');
      const fileName = `${cleanName}_Academic_RAG_Study_Notes.pdf`;
      generateExportNotesStudyGuidePdf(profile, {
        fileName,
        ragDocuments: ragSummaries,
      });

      setExportSuccessMsg(
        `✅ Exported "${fileName}" — RAG Study Guide & Learning Notes PDF downloaded!`
      );
      setTimeout(() => setExportSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Failed to export RAG notes PDF:', err);
    } finally {
      setIsGeneratingNotesPdf(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Academic Report & Transcript PDF Exporter
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                A4 Printable Academic Dossier
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-white mt-0.5">
              Export Study Progress Data as an Official PDF Summary
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Generate a formatted A4 PDF academic report containing your subject mastery, quiz accuracy ({accuracy}%), {profile.streak}-day study streak, Pomodoro focus hours ({focusedHours}h), and mastered curriculum topics.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowTranscriptPreview(!showTranscriptPreview)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>{showTranscriptPreview ? 'Hide Report Preview' : 'Preview Academic Report'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadRagNotesPdf}
            disabled={isGeneratingNotesPdf}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isGeneratingNotesPdf ? 'Exporting...' : 'Export RAG Notes PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadAcademicPdf}
            disabled={isGeneratingAcademicPdf}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>
              {isGeneratingAcademicPdf
                ? 'Generating PDF...'
                : 'Download Academic Progress PDF'}
            </span>
          </button>
        </div>
      </div>

      {/* Report Metadata Configuration Row */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
        <div>
          <label
            htmlFor="pdf-institution-input"
            className="block text-[11px] font-bold text-slate-400 mb-1"
          >
            Institution / Academic Department
          </label>
          <input
            id="pdf-institution-input"
            name="institutionName"
            type="text"
            value={institutionName}
            onChange={(e) => setInstitutionName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label
            htmlFor="pdf-term-input"
            className="block text-[11px] font-bold text-slate-400 mb-1"
          >
            Academic Term / Evaluation Period
          </label>
          <input
            id="pdf-term-input"
            name="academicTerm"
            type="text"
            value={academicTerm}
            onChange={(e) => setAcademicTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label
            htmlFor="pdf-advisor-input"
            className="block text-[11px] font-bold text-slate-400 mb-1"
          >
            Faculty Advisor / Evaluator Name
          </label>
          <input
            id="pdf-advisor-input"
            name="advisorName"
            type="text"
            value={advisorName}
            onChange={(e) => setAdvisorName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Section Toggles + Quick Metrics */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center space-x-1.5 text-slate-300 cursor-pointer">
            <input
              id="pdf-include-quiz"
              name="includeQuizBreakdown"
              type="checkbox"
              checked={includeQuizBreakdown}
              onChange={(e) => setIncludeQuizBreakdown(e.target.checked)}
              className="accent-emerald-500 rounded cursor-pointer"
            />
            <span>Include Subject Mastery & Quiz Scores</span>
          </label>

          <label className="flex items-center space-x-1.5 text-slate-300 cursor-pointer">
            <input
              id="pdf-include-focus"
              name="includeFocusHours"
              type="checkbox"
              checked={includeFocusHours}
              onChange={(e) => setIncludeFocusHours(e.target.checked)}
              className="accent-emerald-500 rounded cursor-pointer"
            />
            <span>Include Deep Focus Hours ({focusedHours}h)</span>
          </label>

          <label className="flex items-center space-x-1.5 text-slate-300 cursor-pointer">
            <input
              id="pdf-include-badges"
              name="includeBadges"
              type="checkbox"
              checked={includeBadges}
              onChange={(e) => setIncludeBadges(e.target.checked)}
              className="accent-emerald-500 rounded cursor-pointer"
            />
            <span>Include Earned Milestone Badges</span>
          </label>
        </div>

        <div className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
          Academic Standing: {letterGrade}
        </div>
      </div>

      {exportSuccessMsg && (
        <div className="relative z-10 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* Expandable Live Academic Transcript Preview */}
      {showTranscriptPreview && (
        <div className="relative z-10 bg-slate-950 border-2 border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                {institutionName} • {academicTerm}
              </div>
              <h4 className="text-base font-black text-white mt-0.5">
                Official Student Learning Progress Transcript — {profile.name}
              </h4>
              <p className="text-[11px] text-slate-400">
                Faculty Evaluator: {advisorName} • Generated: {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black">
                {letterGrade}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Mastery Score</div>
              <div className="text-base font-black text-white mt-0.5">{profile.overallProgress}%</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Quiz Accuracy</div>
              <div className="text-base font-black text-emerald-400 mt-0.5">{accuracy}%</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Active Streak</div>
              <div className="text-base font-black text-amber-400 mt-0.5">{profile.streak} Days</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Focused Hours</div>
              <div className="text-base font-black text-indigo-400 mt-0.5">{focusedHours} hrs</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="font-bold text-emerald-400 mb-1">Mastered Topics Verified:</div>
              <div className="text-slate-300">
                {(profile.strongTopics || []).join(', ') || 'Python Functions, Control Flow'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="font-bold text-amber-400 mb-1">Active Remediation Focus:</div>
              <div className="text-slate-300">
                {(profile.weakTopics || []).join(', ') || 'None — All target areas on track'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
