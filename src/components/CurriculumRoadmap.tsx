import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  BookOpen,
  Award,
  ChevronRight,
  Clock,
  MessageSquare,
  Flame,
  Brain,
  Layers,
  ArrowRight,
  Filter,
  RotateCcw,
  Check,
  Zap,
  Tag,
  WifiOff,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import {
  saveMilestoneProgress,
  getAllMilestoneProgress,
  MilestoneProgressItem,
} from '../utils/offlineDb.ts';
import { db, doc, setDoc } from '../firebase.ts';

export interface RoadmapMilestone {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedTime: string;
  level: 'Foundational' | 'Core' | 'Advanced' | 'Mastery';
  keyConcepts: string[];
  docTitle?: string;
  courseTitle?: string;
}

export const SUBJECT_ROADMAPS: Record<string, RoadmapMilestone[]> = {
  'Indian Polity': [
    {
      id: 'polity_step_1',
      stepNumber: 1,
      title: 'Constitutional Framework: Historical Background & Preamble',
      description: 'Master the Regulating Acts, Government of India Acts (1909, 1919, 1935), and the philosophy of the Preamble.',
      estimatedTime: '4-5 hours',
      level: 'Foundational',
      keyConcepts: ['1935 Act', 'Constituent Assembly', 'Objectives Resolution', 'Preamble Keywords'],
      docTitle: 'Indian Polity: Constitutional Framework & Preamble Summary',
    },
    {
      id: 'polity_step_2',
      stepNumber: 2,
      title: 'Fundamental Rights (Articles 12-35)',
      description: 'Master the 6 categories of Fundamental Rights, their exceptions, and the Heart & Soul (Article 32).',
      estimatedTime: '6-8 hours',
      level: 'Core',
      keyConcepts: ['Right to Equality', 'Right to Liberty', 'Writs', 'Suspension of Rights'],
    },
    {
      id: 'polity_step_3',
      stepNumber: 3,
      title: 'Directive Principles & Fundamental Duties',
      description: 'Understand the socialist, gandhian, and liberal-intellectual principles and the 11 Fundamental Duties.',
      estimatedTime: '3-4 hours',
      level: 'Foundational',
      keyConcepts: ['DPSP vs FR', '42nd Amendment', 'Article 44 (UCC)', 'Article 51A'],
    },
    {
      id: 'polity_step_4',
      stepNumber: 4,
      title: 'Union Executive: President, VP & Prime Minister',
      description: 'Powers, election procedure, impeachment, and the real vs titular head relationship.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['Election College', 'Veto Powers', 'Ordinance Power', 'Council of Ministers'],
    },
    {
      id: 'polity_step_5',
      stepNumber: 5,
      title: 'Parliament: Structure, Sessions & Legislative Procedure',
      description: 'Master Lok Sabha vs Rajya Sabha, types of bills, budgetary process, and parliamentary committees.',
      estimatedTime: '8-10 hours',
      level: 'Advanced',
      keyConcepts: ['Money Bills', 'Joint Sittings', 'Speaker of LS', 'Estimates Committee'],
    },
    {
      id: 'polity_step_6',
      stepNumber: 6,
      title: 'Judiciary: Supreme Court & High Courts',
      description: 'Jurisdiction, independence of judiciary, appointment process (Collegium), and judicial review.',
      estimatedTime: '6-7 hours',
      level: 'Advanced',
      keyConcepts: ['Original Jurisdiction', 'Appellate Jurisdiction', 'PIL', 'NJAC Case'],
    },
    {
      id: 'polity_step_7',
      stepNumber: 7,
      title: 'Local Government: Panchayati Raj & Municipalities',
      description: 'Deep dive into 73rd and 74th Amendments, three-tier structure, and financial resources.',
      estimatedTime: '4-5 hours',
      level: 'Core',
      keyConcepts: ['Gram Sabha', 'State Election Commission', '11th Schedule', 'Reservation'],
    },
    {
      id: 'polity_step_8',
      stepNumber: 8,
      title: 'Constitutional & Non-Constitutional Bodies',
      description: 'Election Commission, UPSC, CAG, NITI Aayog, and Lokpal functions and mandates.',
      estimatedTime: '5-6 hours',
      level: 'Mastery',
      keyConcepts: ['CAG Audit', 'Model Code of Conduct', 'NITI Strategy', 'Electoral Reforms'],
    },
  ],

  'Modern Indian History': [
    {
      id: 'history_step_1',
      stepNumber: 1,
      title: 'Advent of Europeans & Expansion of British Power',
      description: 'Trade rivalries, Battle of Plassey, Buxar, and the Subsidiary Alliance system.',
      estimatedTime: '4-5 hours',
      level: 'Foundational',
      keyConcepts: ['Carnatic Wars', 'Diwani Rights', 'Dual Government', 'Warren Hastings'],
    },
    {
      id: 'history_step_2',
      stepNumber: 2,
      title: 'The Great Revolt of 1857: Causes & Consequences',
      description: 'Analyze political, economic, and immediate causes of the Sepoy Mutiny and its aftermath.',
      estimatedTime: '3-4 hours',
      level: 'Core',
      keyConcepts: ['Greased Cartridges', 'Jhansi & Oudh', 'Canning Proclamation', '1858 Act'],
    },
    {
      id: 'history_step_3',
      stepNumber: 3,
      title: 'Socio-Religious Reform Movements',
      description: 'Brahmo Samaj, Arya Samaj, Aligarh Movement, and the role of Raja Ram Mohan Roy.',
      estimatedTime: '4-5 hours',
      level: 'Foundational',
      keyConcepts: ['Sati Abolition', 'Caste Reforms', 'Education', 'Vivekananda'],
    },
    {
      id: 'history_step_4',
      stepNumber: 4,
      title: 'Early Phase of INC: Moderates vs Extremists',
      description: 'Foundation of Congress (1885), methods of Moderates, and the Rise of Lal-Bal-Pal.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['Drain Theory', 'Partition of Bengal (1905)', 'Swadeshi', 'Surat Split'],
    },
    {
      id: 'history_step_5',
      stepNumber: 5,
      title: 'Gandhian Phase - I: NCM & Khilafat',
      description: 'Champaran, Ahmedabad, Kheda, Rowlatt Act, Jallianwala Bagh, and Non-Cooperation.',
      estimatedTime: '6-7 hours',
      level: 'Advanced',
      keyConcepts: ['Satyagraha', 'Chauri Chaura', 'Swaraj Party', 'Belgaum Session'],
    },
    {
      id: 'history_step_6',
      stepNumber: 6,
      title: 'Gandhian Phase - II: CDM & Simon Commission',
      description: 'Dandi March, Civil Disobedience, RTCs, Gandhi-Irwin Pact, and Poona Pact.',
      estimatedTime: '6-7 hours',
      level: 'Advanced',
      keyConcepts: ['Dandi March', 'Communal Award', 'Salt Satyagraha', '1935 Elections'],
    },
    {
      id: 'history_step_7',
      stepNumber: 7,
      title: 'Final Countdown: Quit India to Independence',
      description: 'August Offer, Cripps Mission, Quit India (1942), INA, and Mountbatten Plan.',
      estimatedTime: '7-8 hours',
      level: 'Advanced',
      keyConcepts: ['Do or Die', 'Subhash Chandra Bose', 'RIN Mutiny', 'Partition'],
    },
    {
      id: 'history_step_8',
      stepNumber: 8,
      title: 'Constitutional Developments & Land Revenue Policy',
      description: 'Permanent Settlement, Ryotwari, Mahalwari, and the evolution of Press & Education.',
      estimatedTime: '5-6 hours',
      level: 'Mastery',
      keyConcepts: ['Cornwallis Code', 'Wood\'s Despatch', 'Vernacular Press Act', 'Hunter Commission'],
    },
  ],

  'Indian Economy': [
    {
      id: 'economy_step_1',
      stepNumber: 1,
      title: 'Introduction to National Income Accounting',
      description: 'Master GDP, GNP, NNP, Real vs Nominal GDP, and calculating growth rates.',
      estimatedTime: '4-5 hours',
      level: 'Foundational',
      keyConcepts: ['GVA', 'Base Year', 'Income Method', 'Product Method'],
    },
    {
      id: 'economy_step_2',
      stepNumber: 2,
      title: 'Monetary Policy & Banking System',
      description: 'RBI functions, monetary instruments (Repo, SLR, CRR), and the structure of Indian banks.',
      estimatedTime: '6-8 hours',
      level: 'Core',
      keyConcepts: ['MPC', 'NPAs', 'Insolvency Code', 'Digital Rupee'],
    },
    {
      id: 'economy_step_3',
      stepNumber: 3,
      title: 'Fiscal Policy & Union Budget',
      description: 'Components of Budget, Revenue vs Capital Expenditure, Deficits (Fiscal, Primary), and FRBM Act.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['Budget Cycle', 'Finance Commission', 'GST', 'Debt-to-GDP'],
    },
    {
      id: 'economy_step_4',
      stepNumber: 4,
      title: 'Inflation & Business Cycles',
      description: 'CPI vs WPI, Cost-push vs Demand-pull inflation, and the Phillips Curve.',
      estimatedTime: '3-4 hours',
      level: 'Foundational',
      keyConcepts: ['Headline Inflation', 'Base Effect', 'Stagflation', 'Deflation'],
    },
    {
      id: 'economy_step_5',
      stepNumber: 5,
      title: 'Agriculture & Food Management',
      description: 'Land reforms, Green Revolution, MSP, PDS, and agricultural marketing reforms.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['MSP Calculation', 'Food Subsidy', 'PM-KISAN', 'E-NAM'],
    },
    {
      id: 'economy_step_6',
      stepNumber: 6,
      title: 'Infrastructure & Industrial Policy',
      description: 'Manufacturing sector, MSMEs, Disinvestment, and the PLI Scheme.',
      estimatedTime: '4-5 hours',
      level: 'Core',
      keyConcepts: ['Startup India', 'Make in India', 'National Infrastructure Pipeline', 'PM Gati Shakti'],
    },
    {
      id: 'economy_step_7',
      stepNumber: 7,
      title: 'External Sector: Balance of Payments',
      description: 'Current account vs Capital account, Forex reserves, and Exchange rate management.',
      estimatedTime: '5-6 hours',
      level: 'Advanced',
      keyConcepts: ['CAD', 'FDI vs FPI', 'NEER/REER', 'World Bank & IMF'],
    },
    {
      id: 'economy_step_8',
      stepNumber: 8,
      title: 'Human Development & Social Infrastructure',
      description: 'Poverty, Unemployment, HDI, Multidimensional Poverty Index, and health/education schemes.',
      estimatedTime: '5-6 hours',
      level: 'Mastery',
      keyConcepts: ['MPI', 'Gini Coefficient', 'Skill India', 'National Health Mission'],
    },
  ],

  'Quantitative Aptitude': [
    {
      id: 'quant_step_1',
      stepNumber: 1,
      title: 'Number Systems & Simplification',
      description: 'Divisibility rules, LCM/HCF, Unit digit, and BODMAS simplification.',
      estimatedTime: '4-5 hours',
      level: 'Foundational',
      keyConcepts: ['Remainder Theorem', 'Surds & Indices', 'Factorials', 'Cyclicity'],
    },
    {
      id: 'quant_step_2',
      stepNumber: 2,
      title: 'Percentage, Profit & Loss',
      description: 'Calculation of percentage change, discount, marked price, and successives.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['Successive Discount', 'Profit %', 'Faulty Weights', 'Ratio Method'],
    },
    {
      id: 'quant_step_3',
      stepNumber: 3,
      title: 'Ratio, Proportion & Averages',
      description: 'Mixtures & Alligations, partnership problems, and weighted averages.',
      estimatedTime: '4-5 hours',
      level: 'Core',
      keyConcepts: ['Alligation Rule', 'Joint Partnership', 'Deviation Method', 'Mean/Median'],
    },
    {
      id: 'quant_step_4',
      stepNumber: 4,
      title: 'Time, Speed & Distance',
      description: 'Relative speed, trains, boats & streams, and average speed.',
      estimatedTime: '6-8 hours',
      level: 'Advanced',
      keyConcepts: ['Relative Velocity', 'Circular Tracks', 'Upstream/Downstream', 'Stoppage Time'],
    },
    {
      id: 'quant_step_5',
      stepNumber: 5,
      title: 'Time & Work, Pipes & Cisterns',
      description: 'Efficiency, alternate days work, and man-days formula.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['Efficiency Ratio', 'Negative Work', 'Man-Hours', 'Wages'],
    },
    {
      id: 'quant_step_6',
      stepNumber: 6,
      title: 'Simple & Compound Interest',
      description: 'Annual vs Semi-annual compounding, difference between SI & CI, and installments.',
      estimatedTime: '5-6 hours',
      level: 'Advanced',
      keyConcepts: ['Effective Rate', 'CI Formula', '3-Year Difference', 'Installment Calc'],
    },
    {
      id: 'quant_step_7',
      stepNumber: 7,
      title: 'Geometry & Mensuration (2D/3D)',
      description: 'Lines, angles, triangles, circles, and surface area/volume of solid shapes.',
      estimatedTime: '8-10 hours',
      level: 'Advanced',
      keyConcepts: ['Congruence', 'Similarity', 'Pythagorean Triplets', 'Volume Conversion'],
    },
    {
      id: 'quant_step_8',
      stepNumber: 8,
      title: 'Algebra & Trigonometry Foundations',
      description: 'Linear/Quadratic equations, trigonometric identities, and heights & distances.',
      estimatedTime: '6-8 hours',
      level: 'Mastery',
      keyConcepts: ['Identity Transformation', 'Roots of Equation', 'Angle of Elevation', 'Polynomials'],
    },
  ],
};


interface CurriculumRoadmapProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
  onNavigateToQuiz?: (subject?: string) => void;
  initialSubject?: string;
}

export const CurriculumRoadmap: React.FC<CurriculumRoadmapProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
  initialSubject = 'Indian Polity',
}) => {
  const subjects = Object.keys(SUBJECT_ROADMAPS);
  const [selectedSubject, setSelectedSubject] = useState<string>(
    SUBJECT_ROADMAPS[initialSubject] ? initialSubject : 'Indian Polity'
  );
  const [milestonesState, setMilestonesState] = useState<Record<string, MilestoneProgressItem>>({});
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');
  const [celebrationMilestone, setCelebrationMilestone] = useState<RoadmapMilestone | null>(null);

  // Load completed milestones from IndexedDB (works offline in rural areas)
  useEffect(() => {
    getAllMilestoneProgress().then((progressMap) => {
      setMilestonesState(progressMap);
    });
  }, []);

  const currentRoadmap = SUBJECT_ROADMAPS[selectedSubject] || SUBJECT_ROADMAPS['Indian Polity'];

  // Calculate statistics
  const completedCount = useMemo(() => {
    return currentRoadmap.filter((m) => milestonesState[m.id]?.completed).length;
  }, [currentRoadmap, milestonesState]);

  const progressPercentage = Math.round((completedCount / currentRoadmap.length) * 100);

  // Total completed across all subjects
  const totalCompletedAllSubjects = useMemo(() => {
    return Object.values(milestonesState).filter((m) => m.completed).length;
  }, [milestonesState]);

  // Toggle milestone completion
  const handleToggleMilestone = async (milestone: RoadmapMilestone) => {
    const isCurrentlyDone = !!milestonesState[milestone.id]?.completed;
    const newStatus = !isCurrentlyDone;

    const progressItem: MilestoneProgressItem = {
      id: milestone.id,
      subject: selectedSubject,
      completed: newStatus,
      completedAt: newStatus ? new Date().toISOString() : undefined,
    };

    // Update local state immediately for responsive UI
    setMilestonesState((prev) => ({
      ...prev,
      [milestone.id]: progressItem,
    }));

    // Save to IndexedDB (offline-ready for rural areas)
    await saveMilestoneProgress(progressItem);

    // If newly completed, trigger celebratory modal
    if (newStatus) {
      setCelebrationMilestone(milestone);
      setTimeout(() => setCelebrationMilestone(null), 4000);
    }

    // Also sync to student profile and Firestore if possible
    try {
      const updatedTotal = newStatus ? totalCompletedAllSubjects + 1 : Math.max(0, totalCompletedAllSubjects - 1);
      const updatedProfile = {
        ...profile,
        overallProgress: Math.min(100, Math.round((updatedTotal / 64) * 100)),
      };
      onProfileUpdate(updatedProfile);

      if (db && profile.userId) {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          { overallProgress: updatedProfile.overallProgress },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('Sync warning for profile milestone update:', err);
    }
  };

  // Ask AI Tutor about this milestone step
  const handleAskTutorStep = (milestone: RoadmapMilestone) => {
    const prompt = `Hey Tutor! I am currently working on Step #${milestone.stepNumber}: "${milestone.title}" in ${selectedSubject}. Can you explain the core concepts (${milestone.keyConcepts.slice(0, 3).join(', ')}) with a simple analogy and give me a quick checkpoint question?`;
    onNavigateToChat(prompt);
  };

  // Filtered milestones
  const displayedMilestones = useMemo(() => {
    if (filterMode === 'completed') {
      return currentRoadmap.filter((m) => milestonesState[m.id]?.completed);
    }
    if (filterMode === 'pending') {
      return currentRoadmap.filter((m) => !milestonesState[m.id]?.completed);
    }
    return currentRoadmap;
  }, [currentRoadmap, filterMode, milestonesState]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Header */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/60 border border-emerald-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Curriculum Roadmap & Milestones
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Offline Ready • Rural Support</span>
                </span>
              </div>
              <h2 className="text-xl font-black text-white mt-0.5 tracking-tight">
                Step-by-Step Learning Journey
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Structured curriculum checklists for every government exam subject. Mark off milestones as you master concepts, earn achievements, and discuss any topic with your WhatsApp Socratic Tutor!
              </p>
            </div>
          </div>

          {/* Quick Counter */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-center min-w-[110px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Completed</span>
              <span className="text-lg font-black text-emerald-400">
                {completedCount} / {currentRoadmap.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-lg">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Select Your Subject Roadmap:
          </span>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            {subjects.map((sub) => {
              const subRoadmap = SUBJECT_ROADMAPS[sub] || [];
              const subDone = subRoadmap.filter((m) => milestonesState[m.id]?.completed).length;

              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-2 ${
                    selectedSubject === sub
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {sub === 'Indian Polity' && <span>🏛️</span>}
                  {sub === 'Modern Indian History' && <span>📜</span>}
                  {sub === 'Indian Economy' && <span>💹</span>}
                  {sub === 'Quantitative Aptitude' && <span>🔢</span>}
                  <span>{sub}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                    selectedSubject === sub ? 'bg-emerald-700 text-white' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {subDone}/{subRoadmap.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Bar & Filter Toolbar */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <span>{selectedSubject} Mastery Progress</span>
                {progressPercentage === 100 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                    Mastered 🏆
                  </span>
                )}
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {progressPercentage}% Completed
              </span>
            </div>
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-100 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All ({currentRoadmap.length})
            </button>
            <button
              onClick={() => setFilterMode('pending')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filterMode === 'pending'
                  ? 'bg-slate-100 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Remaining ({currentRoadmap.length - completedCount})
            </button>
            <button
              onClick={() => setFilterMode('completed')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filterMode === 'completed'
                  ? 'bg-slate-100 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Celebratory Milestone Banner */}
      {celebrationMilestone && (
        <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-emerald-500/20 border-2 border-amber-400/50 rounded-2xl p-4 flex items-center space-x-3.5 shadow-xl animate-in zoom-in-95">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 animate-bounce" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-amber-300">
              Milestone Complete: Step #{celebrationMilestone.stepNumber} – {celebrationMilestone.title}!
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Awesome work! Your offline learning progress and badge credits have been saved.
            </p>
          </div>
          {onNavigateToQuiz && (
            <button
              onClick={() => onNavigateToQuiz(selectedSubject)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0 shadow-md"
            >
              Test Knowledge
            </button>
          )}
        </div>
      )}

      {/* Step-by-Step Checklist Roadmap */}
      <div className="space-y-4">
        {displayedMilestones.map((milestone) => {
          const isDone = !!milestonesState[milestone.id]?.completed;

          return (
            <div
              key={milestone.id}
              className={`border rounded-3xl p-5 shadow-xl transition-all duration-300 ${
                isDone
                  ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Checkbox and Step Details */}
                <div className="flex items-start space-x-4">
                  {/* Interactive Milestone Checkbox */}
                  <button
                    onClick={() => handleToggleMilestone(milestone)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer mt-0.5 shrink-0 ${
                      isDone
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                        : 'bg-slate-800 border border-slate-700 hover:border-emerald-400 text-slate-500 hover:text-emerald-400'
                    }`}
                    title={isDone ? 'Click to uncheck milestone' : 'Mark milestone completed'}
                  >
                    {isDone ? (
                      <Check className="w-5 h-5 stroke-[3]" />
                    ) : (
                      <span className="text-xs font-bold font-mono">{milestone.stepNumber}</span>
                    )}
                  </button>

                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        Step {milestone.stepNumber}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          milestone.level === 'Foundational'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : milestone.level === 'Core'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : milestone.level === 'Advanced'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {milestone.level}
                      </span>

                      <span className="flex items-center space-x-1 text-[11px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{milestone.estimatedTime}</span>
                      </span>

                      {isDone && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Completed</span>
                        </span>
                      )}
                    </div>

                    <h4
                      className={`text-base font-bold transition ${
                        isDone ? 'text-emerald-300 line-through decoration-emerald-500/50' : 'text-white'
                      }`}
                    >
                      {milestone.title}
                    </h4>

                    <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                      {milestone.description}
                    </p>

                    {/* Key Concepts Tags */}
                    {milestone.keyConcepts && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {milestone.keyConcepts.map((concept) => (
                          <span
                            key={concept}
                            className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-950 text-slate-300 border border-slate-800 font-mono"
                          >
                            {concept}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Grounded Reference Notes & Course Suggestions */}
                    {(milestone.docTitle || milestone.courseTitle) && (
                      <div className="pt-1 flex items-center space-x-3 text-[11px] text-slate-400 flex-wrap gap-y-1">
                        {milestone.docTitle && (
                          <span className="flex items-center space-x-1 text-emerald-400">
                            <BookOpen className="w-3 h-3" />
                            <span>Notes: {milestone.docTitle}</span>
                          </span>
                        )}
                        {milestone.courseTitle && (
                          <span className="flex items-center space-x-1 text-red-400">
                            <Flame className="w-3 h-3" />
                            <span>Course: {milestone.courseTitle}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <button
                    onClick={() => handleAskTutorStep(milestone)}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer border border-slate-700 hover:border-emerald-500 shadow-sm"
                    title="Ask doubts regarding this milestone"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask Tutor</span>
                  </button>

                  <button
                    onClick={() => handleToggleMilestone(milestone)}
                    className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                      isDone
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                    }`}
                  >
                    {isDone ? (
                      <span>Mark Pending</span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Done</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
