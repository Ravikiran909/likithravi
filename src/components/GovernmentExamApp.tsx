import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  BookOpen,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Search,
  Sparkles,
  Target,
  Trophy,
  AlertCircle,
  FileText,
  RotateCcw,
  Play,
  ArrowRight,
  ChevronRight,
  Shield,
  HelpCircle,
  TrendingUp,
  MessageSquare,
  Check,
  Compass,
  Layers,
  GraduationCap,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { StudentProfile, QuizQuestion } from '../types/index.ts';

interface GovernmentExamAppProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
  onNavigateToQuiz?: () => void;
  onLogStudyMinutes?: (minutes: number, label?: string) => void;
}

export interface GovExamTrack {
  id: string;
  name: string;
  shortCode: string;
  conductingBody: string;
  category: 'Civil Services' | 'SSC & Railways' | 'Banking & Insurance' | 'Defence' | 'State PSC';
  badgeColor: string;
  nextExamDate: string;
  daysRemaining: number;
  stages: string[];
  totalVacanciesEst: string;
  syllabusSubjects: string[];
  officialCutoffLastYear: string;
}

export interface CurrentAffairsItem {
  id: string;
  date: string;
  title: string;
  category: 'Polity & Governance' | 'Economy & Schemes' | 'Environment & Ecology' | 'Science & Tech' | 'International Relations';
  source: string;
  summary: string;
  prelimsPointers: string[];
  mainsDimension: string;
}

export interface PolityArticleSummary {
  article: string;
  title: string;
  part: string;
  importance: 'Ultra High' | 'High' | 'Medium';
  summary: string;
  landmarkJudgments?: string;
}

const GOV_EXAM_TRACKS: GovExamTrack[] = [
  {
    id: 'upsc_cse',
    name: 'UPSC Civil Services Examination (IAS / IPS / IFS)',
    shortCode: 'UPSC CSE',
    conductingBody: 'Union Public Service Commission',
    category: 'Civil Services',
    badgeColor: 'from-amber-600 to-orange-600',
    nextExamDate: '2026-05-24',
    daysRemaining: 180,
    stages: ['Prelims (GS-I & CSAT)', 'Mains (9 Written Papers)', 'Personality Test (Interview)'],
    totalVacanciesEst: '1,056 Posts',
    syllabusSubjects: ['Indian Polity & Constitution', 'Modern Indian History', 'Economy & Budget', 'Geography & Environment', 'CSAT Quantitative Aptitude', 'Current Affairs'],
    officialCutoffLastYear: '88.22 / 200 (GS-I)',
  },
  {
    id: 'ssc_cgl',
    name: 'Staff Selection Commission – Combined Graduate Level',
    shortCode: 'SSC CGL',
    conductingBody: 'Staff Selection Commission (SSC)',
    category: 'SSC & Railways',
    badgeColor: 'from-blue-600 to-indigo-600',
    nextExamDate: '2026-09-12',
    daysRemaining: 290,
    stages: ['Tier-I Computer Based Test', 'Tier-II (Quant, Reasoning, English, GA, Computer)'],
    totalVacanciesEst: '14,500 Posts',
    syllabusSubjects: ['Quantitative Aptitude & Advanced Math', 'General Intelligence & Reasoning', 'General Awareness (History, Polity, Science)', 'English Comprehension'],
    officialCutoffLastYear: '140.5 / 200 (Tier-I)',
  },
  {
    id: 'ibps_sbi_po',
    name: 'Banking Probationary Officer (SBI PO / IBPS PO)',
    shortCode: 'SBI & IBPS PO',
    conductingBody: 'Institute of Banking Personnel Selection & State Bank of India',
    category: 'Banking & Insurance',
    badgeColor: 'from-emerald-600 to-teal-600',
    nextExamDate: '2026-10-18',
    daysRemaining: 326,
    stages: ['Prelims (Quant, Reasoning, English)', 'Mains (Data Analysis, Banking GA, Reasoning)', 'Group Discussion & Interview'],
    totalVacanciesEst: '6,200 Posts',
    syllabusSubjects: ['Data Interpretation & Caselets', 'Complex Seating Puzzles & Syllogisms', 'RBI Monetary Policy & Banking Awareness', 'Economic & Financial Current Affairs'],
    officialCutoffLastYear: '54.50 / 100 (Prelims)',
  },
  {
    id: 'rrb_ntpc',
    name: 'Railway Recruitment Board – Non-Technical Popular Categories',
    shortCode: 'RRB NTPC',
    conductingBody: 'Indian Railways (RRB)',
    category: 'SSC & Railways',
    badgeColor: 'from-purple-600 to-pink-600',
    nextExamDate: '2026-11-05',
    daysRemaining: 344,
    stages: ['CBT-1 (Screening Test)', 'CBT-2 (Core Selection)', 'Typing Skill Test / CBAT'],
    totalVacanciesEst: '11,558 Posts',
    syllabusSubjects: ['General Awareness (50 Marks)', 'Mathematics & Arithmetic (35 Marks)', 'General Intelligence & Reasoning (35 Marks)'],
    officialCutoffLastYear: '74.2 / 100 (CBT-1)',
  },
  {
    id: 'state_psc',
    name: 'State Public Service Commissions (KPSC / UPPSC / BPSC / MPSC)',
    shortCode: 'State PSC',
    conductingBody: 'State Public Service Commissions',
    category: 'State PSC',
    badgeColor: 'from-rose-600 to-red-600',
    nextExamDate: '2026-08-20',
    daysRemaining: 268,
    stages: ['Preliminary Exam', 'Main Written Exam', 'Interview'],
    totalVacanciesEst: '3,800 State Posts',
    syllabusSubjects: ['State History, Heritage & Geography', 'Indian Polity & Panchayati Raj', 'State Economic Survey & Budget', 'General Science & Mental Ability'],
    officialCutoffLastYear: '112 / 200 (State Average)',
  },
  {
    id: 'defence_cds_nda',
    name: 'Combined Defence Services & NDA (Army, Navy, Air Force)',
    shortCode: 'UPSC CDS / NDA',
    conductingBody: 'UPSC & Services Selection Board',
    category: 'Defence',
    badgeColor: 'from-yellow-600 to-amber-700',
    nextExamDate: '2026-04-19',
    daysRemaining: 145,
    stages: ['Written Examination (Maths, English, GK)', '5-Day SSB Interview & Medicals'],
    totalVacanciesEst: '850 Commissioned Posts',
    syllabusSubjects: ['Elementary Mathematics', 'General Knowledge & Current Affairs', 'English Language Skills', 'Military History & Geopolitics'],
    officialCutoffLastYear: '124 / 300 (CDS Written)',
  },
];

const DAILY_CURRENT_AFFAIRS: CurrentAffairsItem[] = [
  {
    id: 'ca_1',
    date: 'Today • Fresh Analysis',
    title: 'RBI Monetary Policy Committee: Repo Rate Maintained at 6.50% & Liquidity Management',
    category: 'Economy & Schemes',
    source: 'The Hindu / RBI Bulletin',
    summary: 'The Monetary Policy Committee (MPC) unanimously decided to maintain the policy Repo Rate under the Liquidity Adjustment Facility (LAF) at 6.50%, remaining focused on withdrawal of accommodation to align inflation within the 4% target band (+/- 2%).',
    prelimsPointers: [
      'MPC is constituted under Section 45ZB of the Reserve Bank of India Act, 1934.',
      'Comprises 6 members: 3 from RBI (including Governor with casting vote) and 3 external members nominated by Central Government.',
      'Repo Rate is the interest rate at which RBI lends short-term money to commercial banks against government securities.',
    ],
    mainsDimension: 'Examine how food inflation spikes constrain monetary policy decisions in emerging market economies like India and evaluate the efficacy of flexible inflation targeting (FIT).',
  },
  {
    id: 'ca_2',
    date: 'Today • Supreme Court Landmark',
    title: 'Supreme Court on Article 39(b): Private Resources vs Material Resources of the Community',
    category: 'Polity & Governance',
    source: 'Indian Express / LiveLaw',
    summary: 'A 9-judge Constitution Bench held that not all privately-owned properties constitute "material resources of the community" under Article 39(b) of the Constitution for state redistribution, reversing Justice Krishna Iyer’s 1978 expansive doctrine.',
    prelimsPointers: [
      'Article 39(b) falls under Part IV (Directive Principles of State Policy).',
      'Article 31C immunizes legislation giving effect to Article 39(b) and 39(c) from judicial challenge under Articles 14 and 19.',
      'Kesavananda Bharati (1973) upheld the first clause of Article 31C while striking down the exclusion of judicial review.',
    ],
    mainsDimension: 'Analyze the delicate balance between property rights of individuals and the socialist welfare mandate of Directive Principles in post-liberalization India.',
  },
  {
    id: 'ca_3',
    date: 'Yesterday • Environment & Wildlife',
    title: 'National Tiger Conservation Authority (NTCA) Notifies India’s 56th Tiger Reserve',
    category: 'Environment & Ecology',
    source: 'PIB Environment',
    summary: 'Guru Ghasidas-Tamor Pingla tiger reserve in Chhattisgarh has been officially declared India’s 56th tiger reserve, establishing a crucial ecological corridor connecting Bandhavgarh (MP) and Palamau (Jharkhand).',
    prelimsPointers: [
      'Project Tiger was launched in 1973; statutory backing given via Wildlife (Protection) Amendment Act, 2006 establishing NTCA.',
      'Tiger Reserves consist of a legally inviolate "Core / Critical Tiger Habitat" and a "Buffer / Peripheral Area".',
      'India currently hosts over 75% of the world’s wild tiger population as per the 5th cycle of All India Tiger Estimation (3,682 tigers).',
    ],
    mainsDimension: 'Discuss the role of landscape-level ecological corridors in mitigating human-wildlife conflict and gene pool isolation in protected areas.',
  },
];

const POLITY_MUST_KNOW_ARTICLES: PolityArticleSummary[] = [
  {
    article: 'Article 14',
    title: 'Equality before Law & Equal Protection of the Laws',
    part: 'Part III (Fundamental Rights)',
    importance: 'Ultra High',
    summary: 'The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India. Strikes against arbitrariness (Royappa doctrine).',
    landmarkJudgments: 'E.P. Royappa v. State of TN (1974), Maneka Gandhi v. UOI (1978)',
  },
  {
    article: 'Article 19(1)(a)',
    title: 'Freedom of Speech and Expression',
    part: 'Part III (Fundamental Rights)',
    importance: 'Ultra High',
    summary: 'Protects the freedom to express one’s views and convictions freely by word of mouth, writing, printing, or pictures. Subject to reasonable restrictions under 19(2).',
    landmarkJudgments: 'Shreya Singhal v. UOI (struck down Sec 66A IT Act), Anuradha Bhasin v. UOI (Internet access)',
  },
  {
    article: 'Article 21',
    title: 'Protection of Life and Personal Liberty',
    part: 'Part III (Fundamental Rights)',
    importance: 'Ultra High',
    summary: 'No person shall be deprived of his life or personal liberty except according to procedure established by law (expanded into "due process" & Right to Privacy).',
    landmarkJudgments: 'Maneka Gandhi (1978), K.S. Puttaswamy (2017 Right to Privacy), Navtej Johar (2018)',
  },
  {
    article: 'Article 32',
    title: 'Right to Constitutional Remedies (Heart & Soul)',
    part: 'Part III (Fundamental Rights)',
    importance: 'Ultra High',
    summary: 'Grants the right to move the Supreme Court directly for the enforcement of Fundamental Rights via 5 Writs: Habeas Corpus, Mandamus, Prohibition, Quo-Warranto, and Certiorari.',
    landmarkJudgments: 'Described by Dr. B.R. Ambedkar as the very soul of the Indian Constitution.',
  },
  {
    article: 'Article 368',
    title: 'Power of Parliament to Amend the Constitution',
    part: 'Part XX (Amendment)',
    importance: 'Ultra High',
    summary: 'Lays down special majority and state ratification procedures for amending the Constitution, subject strictly to the inviolable Basic Structure doctrine.',
    landmarkJudgments: 'Kesavananda Bharati v. State of Kerala (1973), Minerva Mills v. UOI (1980)',
  },
  {
    article: 'Article 352, 356, 360',
    title: 'Emergency Provisions (National, President’s Rule & Financial)',
    part: 'Part XVIII (Emergency Provisions)',
    importance: 'High',
    summary: 'Allows transformation of the federal system into a unitary one during war/external aggression/armed rebellion (352), constitutional machinery failure in states (356), or financial instability (360).',
    landmarkJudgments: 'S.R. Bommai v. UOI (1994 - Judicial review over President’s Rule under 356)',
  },
];

const GOV_MOCK_QUESTIONS: QuizQuestion[] = [
  {
    id: 'gov_q1',
    subject: 'Indian Polity',
    topic: 'Indian Constitution — Basic Structure Doctrine',
    questionText: 'In which landmark judgment did the Supreme Court of India propound the "Basic Structure Doctrine", ruling that Article 368 does not enable Parliament to alter the basic framework of the Constitution?',
    type: 'mcq',
    options: [
      'A) Golaknath v. State of Punjab (1967)',
      'B) Kesavananda Bharati v. State of Kerala (1973)',
      'C) Minerva Mills v. Union of India (1980)',
      'D) Shankari Prasad v. Union of India (1951)',
    ],
    correctAnswer: 'B',
    explanation: 'In the historic 13-judge bench ruling of Kesavananda Bharati (1973), the Supreme Court ruled by a 7:6 majority that while Parliament has wide amending powers under Article 368, it cannot alter or destroy the "Basic Structure" of the Constitution (such as democracy, judicial review, federalism, secularism).',
    difficulty: 'intermediate',
  },
  {
    id: 'gov_q2',
    subject: 'Indian Economy',
    topic: 'Monetary Policy & Inflation',
    questionText: 'Which of the following bodies in India is statutorily tasked with fixing the policy Repo Rate to maintain inflation within the target band?',
    type: 'mcq',
    options: [
      'A) Financial Stability and Development Council (FSDC)',
      'B) Monetary Policy Committee (MPC) under the RBI Act, 1934',
      'C) Department of Economic Affairs, Ministry of Finance',
      'D) NITI Aayog Governing Council',
    ],
    correctAnswer: 'B',
    explanation: 'Under Section 45ZB of the Reserve Bank of India (RBI) Act 1934, the Monetary Policy Committee (MPC) consisting of 6 members (3 from RBI, 3 nominated by the Government) determines the policy repo rate necessary to achieve the inflation target.',
    difficulty: 'intermediate',
  },
  {
    id: 'gov_q3',
    subject: 'Modern Indian History',
    topic: 'Indian Freedom Struggle — Non-Cooperation Movement',
    questionText: 'Which tragic incident in February 1922 led Mahatma Gandhi to abruptly withdraw the nationwide Non-Cooperation Movement?',
    type: 'mcq',
    options: [
      'A) Jallianwala Bagh Massacre',
      'B) Chauri Chaura Incident in Gorakhpur, UP',
      'C) Kakori Train Action',
      'D) Execution of Bhagat Singh, Sukhdev, and Rajguru',
    ],
    correctAnswer: 'B',
    explanation: 'On February 4, 1922, an angry mob set fire to a police station at Chauri Chaura in Gorakhpur district of Uttar Pradesh, killing 22 policemen. Believing that the movement had degenerated into violence and the masses were not yet trained in non-violence (Satyagraha), Gandhi called off the movement.',
    difficulty: 'beginner',
  },
  {
    id: 'gov_q4',
    subject: 'General Science & Geography',
    topic: 'Physical Geography & Wetlands of India',
    questionText: 'Which is the largest brackish water coastal lagoon in India and designated as the first Indian wetland of international importance under the Ramsar Convention?',
    type: 'mcq',
    options: [
      'A) Vembanad Lake in Kerala',
      'B) Chilika Lake in Odisha',
      'C) Kolleru Lake in Andhra Pradesh',
      'D) Pulicat Lake on Andhra-Tamil Nadu border',
    ],
    correctAnswer: 'B',
    explanation: 'Chilika Lake in Odisha is Asia’s largest brackish water lagoon. In 1981, Chilika Lake was designated the first Indian wetland of international importance under the Ramsar Convention. It is renowned for Irrawaddy dolphins and migratory birds.',
    difficulty: 'intermediate',
  },
  {
    id: 'gov_q5',
    subject: 'Quantitative Aptitude & CSAT',
    topic: 'Number Systems & Remainder Theorem',
    questionText: 'What is the remainder when (17^200) is divided by 18?',
    type: 'mcq',
    options: [
      'A) 1',
      'B) 17',
      'C) 0',
      'D) 16',
    ],
    correctAnswer: 'A',
    explanation: 'Using modular arithmetic: 17 ≡ -1 (mod 18). Therefore, (17^200) ≡ (-1)^200 (mod 18). Since 200 is an even power, (-1)^200 = 1. The remainder is 1.',
    difficulty: 'intermediate',
  },
];

export const GovernmentExamApp: React.FC<GovernmentExamAppProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
  onLogStudyMinutes,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'exams' | 'mock_test' | 'current_affairs' | 'polity_vault' | 'syllabus_tracker'>('exams');
  const [selectedTrack, setSelectedTrack] = useState<GovExamTrack>(GOV_EXAM_TRACKS[0]);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock Test State
  const [mockState, setMockState] = useState<'ready' | 'active' | 'completed'>('ready');
  const [mockQuestions, setMockQuestions] = useState<QuizQuestion[]>(GOV_MOCK_QUESTIONS);
  const [mockIndex, setMockIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [answersRecorded, setAnswersRecorded] = useState<
    { id: string; selected: string; isCorrect: boolean; marks: number }[]
  >([]);
  const [mockScore, setMockScore] = useState(0); // With negative marking (-0.33)
  const [mockTimerSeconds, setMockTimerSeconds] = useState(300); // 5 mins for 5 questions
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Filtered Exam Tracks
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return GOV_EXAM_TRACKS;
    const q = searchQuery.toLowerCase();
    return GOV_EXAM_TRACKS.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.shortCode.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.syllabusSubjects.some((s) => s.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && mockState === 'active' && mockTimerSeconds > 0) {
      interval = setInterval(() => {
        setMockTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleFinishMock();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, mockState, mockTimerSeconds]);

  // Start Mock Test
  const handleStartMock = () => {
    setMockState('active');
    setMockIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setAnswersRecorded([]);
    setMockScore(0);
    setMockTimerSeconds(300);
    setIsTimerRunning(true);
  };

  const handleSelectMockOption = (opt: string) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(opt.slice(0, 1).toUpperCase());
  };

  const handleSubmitCurrentQuestion = () => {
    if (!selectedOption || isAnswerSubmitted) return;
    const currentQ = mockQuestions[mockIndex];
    const correctLetter = currentQ.correctAnswer.slice(0, 1).toUpperCase();
    const isCorrect = selectedOption === correctLetter;
    // Standard UPSC / Government Exam Marking: +2 for correct, -0.66 for incorrect
    const marks = isCorrect ? 2.0 : -0.66;

    setAnswersRecorded((prev) => [
      ...prev,
      {
        id: currentQ.id,
        selected: selectedOption,
        isCorrect,
        marks,
      },
    ]);
    setMockScore((prev) => Math.round((prev + marks) * 100) / 100);
    setIsAnswerSubmitted(true);
  };

  const handleNextMockQuestion = () => {
    if (mockIndex + 1 < mockQuestions.length) {
      setMockIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      handleFinishMock();
    }
  };

  const handleFinishMock = () => {
    setIsTimerRunning(false);
    setMockState('completed');

    // Award 15 study minutes
    if (onLogStudyMinutes) {
      onLogStudyMinutes(15, `Govt Exam Mock: ${selectedTrack.shortCode}`);
    }

    // Update student questions answered & streak
    const updatedCount = (profile.totalQuestionsAnswered || 0) + mockQuestions.length;
    const updatedToday = (profile.questionsAnsweredToday || 0) + mockQuestions.length;
    const updatedCorrect =
      (profile.correctAnswers || 0) + answersRecorded.filter((a) => a.isCorrect).length;

    onProfileUpdate({
      ...profile,
      totalQuestionsAnswered: updatedCount,
      questionsAnsweredToday: updatedToday,
      correctAnswers: updatedCorrect,
      streak: (profile.streak || 0) + 1,
    });
  };

  const currentMockQ = mockQuestions[mockIndex];

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1.5 shadow-sm">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>All-India Government Exam Prep App</span>
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Negative Marking Simulator Active</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Civil Services, SSC, Banking, Railways & State PSC Command Center
            </h1>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Targeted curriculum, Daily Current Affairs from The Hindu & PIB, Indian Polity Constitution Vault, and Official Negative-Marking Mock Tests tailored for UPSC CSE, SSC CGL, IBPS PO, RRB NTPC, and State PSCs.
            </p>
          </div>

          {/* Quick Stat Pillbox */}
          <div className="flex sm:flex-row lg:flex-col gap-3 shrink-0">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex items-center space-x-3 shadow-inner">
              <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Exam Target</div>
                <div className="text-sm font-extrabold text-white">{selectedTrack.shortCode}</div>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex items-center space-x-3 shadow-inner">
              <div className="p-2.5 bg-orange-500/15 border border-orange-500/30 rounded-lg text-orange-400">
                <Flame className="w-5 h-5 fill-orange-400" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Prelims Countdown</div>
                <div className="text-sm font-extrabold text-orange-300">{selectedTrack.daysRemaining} Days Left</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex flex-wrap items-center gap-2 mt-8 pt-6 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveSubTab('exams')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'exams'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Exams & Syllabus</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('mock_test')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'mock_test'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Live Mock Test (-0.66 Marking)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('current_affairs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'current_affairs'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Daily Current Affairs & Editorials</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('polity_vault')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'polity_vault'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Constitution & Polity Vault</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('syllabus_tracker')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'syllabus_tracker'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Subject-wise PYQ Blueprint</span>
          </button>
        </div>
      </div>

      {/* ---------------- SUB-TAB 1: EXAM TRACKS & OFFICIAL SYLLABUS ---------------- */}
      {activeSubTab === 'exams' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Select Your Target Government Examination</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Explore official exam timelines, syllabus stages, vacancies, and historical cut-offs
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search UPSC, SSC, IBPS, Railways..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTracks.map((track) => {
              const isSelected = selectedTrack.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => setSelectedTrack(track)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500/80 shadow-xl shadow-indigo-950/30 ring-1 ring-indigo-500/40'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {track.category}
                      </span>
                      <span className="text-xs font-extrabold text-orange-400 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{track.daysRemaining}d to Exam</span>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug line-clamp-2">
                      {track.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Conducted by <span className="text-slate-300 font-semibold">{track.conductingBody}</span>
                    </p>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">Total Vacancies</span>
                        <span className="text-emerald-300 font-bold">{track.totalVacanciesEst}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">Target Cutoff</span>
                        <span className="text-amber-300 font-bold">{track.officialCutoffLastYear}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">Exam Date</span>
                        <span className="text-white font-medium">{track.nextExamDate}</span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Core Subjects:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {track.syllabusSubjects.slice(0, 3).map((sub) => (
                          <span
                            key={sub}
                            className="px-2 py-0.5 rounded text-[10px] bg-slate-950 text-slate-300 border border-slate-800"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400">
                      {isSelected ? 'Currently Selected Target' : 'Select Target Exam'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTrack(track);
                        setActiveSubTab('mock_test');
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Take Mock</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Track Detailed Blueprint */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Target Roadmap Blueprint
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {selectedTrack.name} – Comprehensive Preparation Architecture
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  onNavigateToChat(
                    `Can you create a structured 90-day study timetable for ${selectedTrack.name}? Focus on Indian Polity, Economy, and Quantitative Aptitude.`
                  )
                }
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask AI Tutor for 90-Day Timetable</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="text-xs font-bold text-indigo-400 uppercase">Stage Selection Process</div>
                <div className="space-y-2 mt-2">
                  {selectedTrack.stages.map((stage, idx) => (
                    <div key={stage} className="flex items-start space-x-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-slate-300">{stage}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="text-xs font-bold text-emerald-400 uppercase">Syllabus Breakdown</div>
                <div className="space-y-1.5 mt-2">
                  {selectedTrack.syllabusSubjects.map((sub) => (
                    <div key={sub} className="flex items-center space-x-1.5 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{sub}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="text-xs font-bold text-amber-400 uppercase">Strategic Exam Guidance</div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Focus on static fundamentals (Polity Articles, Modern History Timeline, Economic Concepts) combined with daily editorial analysis. Negative marking requires disciplined question triage: skip ambiguous choices with less than 50% certainty.
                </p>
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Est. Competition:</span>
                  <span className="text-amber-300 font-bold">12 to 15 Lakh Aspirants</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SUB-TAB 2: LIVE MOCK TEST (-0.66 MARKING) ---------------- */}
      {activeSubTab === 'mock_test' && (
        <div className="space-y-6">
          {mockState === 'ready' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-6 max-w-2xl mx-auto shadow-2xl">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-indigo-500/20 border border-emerald-500/40 text-emerald-400">
                <Target className="w-10 h-10" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Real Exam Simulation
                </span>
                <h3 className="text-2xl font-bold text-white mt-2">
                  All-India Government Exam Prelims Mock Test
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Targeting {selectedTrack.name}. Tested under official negative-marking rules.
                </p>
              </div>

              {/* Rules Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Questions</div>
                  <div className="text-sm font-bold text-white mt-0.5">5 MCQs</div>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Time Limit</div>
                  <div className="text-sm font-bold text-white mt-0.5">5 Minutes</div>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Correct</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">+2.00 Marks</div>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Negative</div>
                  <div className="text-sm font-bold text-rose-400 mt-0.5">-0.66 Marks</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartMock}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Begin Timed Mock Examination</span>
              </button>
            </div>
          )}

          {mockState === 'active' && currentMockQ && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
              {/* Header with Timer and Score */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Question {mockIndex + 1} of {mockQuestions.length}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold">
                    {currentMockQ.subject}
                  </span>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    • {currentMockQ.topic}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/40 rounded-lg text-amber-300 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>
                      {Math.floor(mockTimerSeconds / 60)}:
                      {(mockTimerSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <div className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-emerald-400">
                    Net Score: {mockScore}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-1.5 transition-all duration-300"
                  style={{ width: `${((mockIndex + 1) / mockQuestions.length) * 100}%` }}
                />
              </div>

              {/* Question Text */}
              <div className="bg-slate-950/70 p-5 rounded-xl border border-slate-800">
                <p className="text-sm sm:text-base font-semibold text-slate-100 leading-relaxed whitespace-pre-line">
                  {currentMockQ.questionText}
                </p>
              </div>

              {/* MCQ Options */}
              <div className="space-y-2.5">
                {(currentMockQ.options || []).map((opt) => {
                  const letter = opt.slice(0, 1).toUpperCase();
                  const isSelected = selectedOption === letter;
                  const isCorrect = currentMockQ.correctAnswer.slice(0, 1).toUpperCase() === letter;

                  let style = 'bg-slate-950/50 border-slate-800 text-slate-200 hover:border-slate-700';

                  if (isAnswerSubmitted) {
                    if (isCorrect) {
                      style = 'bg-emerald-950/50 border-emerald-500 text-emerald-200 font-semibold';
                    } else if (isSelected && !isCorrect) {
                      style = 'bg-rose-950/50 border-rose-500 text-rose-200';
                    } else {
                      style = 'bg-slate-950/30 border-slate-800/60 text-slate-500 opacity-60';
                    }
                  } else if (isSelected) {
                    style = 'bg-indigo-950/50 border-indigo-500 text-white shadow-md';
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectMockOption(opt)}
                      disabled={isAnswerSubmitted}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${style}`}
                    >
                      <span className="text-xs sm:text-sm">{opt}</span>
                      {isAnswerSubmitted && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                      )}
                      {isAnswerSubmitted && isSelected && !isCorrect && (
                        <span className="text-[10px] text-rose-300 font-bold bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40">
                          -0.66
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation Box */}
              {isAnswerSubmitted && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Official Answer Key & Pedagogical Notes: Option {currentMockQ.correctAnswer}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentMockQ.explanation}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateToChat(
                        `Explain this government exam question on "${currentMockQ.topic}" in detail: "${currentMockQ.questionText}"`
                      )
                    }
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1 mt-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Discuss doubt on WhatsApp AI Tutor</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setMockState('ready')}
                  className="text-xs text-slate-400 hover:text-white transition flex items-center space-x-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>End Test Early</span>
                </button>

                {!isAnswerSubmitted ? (
                  <button
                    type="button"
                    onClick={handleSubmitCurrentQuestion}
                    disabled={!selectedOption}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Lock Answer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextMockQuestion}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow"
                  >
                    <span>{mockIndex + 1 < mockQuestions.length ? 'Next Question' : 'View Final Scorecard'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {mockState === 'completed' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-6 max-w-2xl mx-auto shadow-2xl">
              <div className="inline-flex p-4 rounded-full bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/40 text-amber-400">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-white">Mock Test Scorecard</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Evaluated with All-India Prelims Negative Marking Scheme
                </p>
              </div>

              {/* Big Score Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Net Score</div>
                  <div className={`text-base font-black mt-0.5 ${mockScore >= 6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {mockScore} / 10.0
                  </div>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Accuracy</div>
                  <div className="text-base font-black text-white mt-0.5">
                    {Math.round((answersRecorded.filter((a) => a.isCorrect).length / mockQuestions.length) * 100)}%
                  </div>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Correct (+2)</div>
                  <div className="text-base font-black text-emerald-400 mt-0.5">
                    {answersRecorded.filter((a) => a.isCorrect).length} Qs
                  </div>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Wrong (-0.66)</div>
                  <div className="text-base font-black text-rose-400 mt-0.5">
                    {answersRecorded.filter((a) => !a.isCorrect).length} Qs
                  </div>
                </div>
              </div>

              {/* Cutoff Evaluation */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-left space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-200">Target Cutoff Comparison ({selectedTrack.shortCode})</span>
                  <span className="text-amber-400">{selectedTrack.officialCutoffLastYear}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {mockScore >= 6
                    ? 'Outstanding! Your net score clears the qualifying trajectory with strong accuracy.'
                    : 'Good attempt. Reduce negative penalties by eliminating choices before guessing.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartMock}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Mock Test</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onNavigateToChat(
                      `Hi! I completed a mock test for ${selectedTrack.name} and scored ${mockScore}/10 with ${answersRecorded.filter((a) => !a.isCorrect).length} mistakes. Can you analyze my weak topics?`
                    )
                  }
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Analyze Weak Areas on WhatsApp</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- SUB-TAB 3: DAILY CURRENT AFFAIRS & EDITORIAL DIGEST ---------------- */}
      {activeSubTab === 'current_affairs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Daily Current Affairs & Editorial Analysis</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Grounded in The Hindu, Indian Express, PIB, and Economic Survey for UPSC CSE & State PSCs
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Updated Daily
            </span>
          </div>

          <div className="space-y-4">
            {DAILY_CURRENT_AFFAIRS.map((ca) => (
              <div
                key={ca.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {ca.category}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs font-medium text-slate-400">{ca.source}</span>
                  </div>
                  <span className="text-xs text-amber-400 font-semibold">{ca.date}</span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                  {ca.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {ca.summary}
                </p>

                {/* Prelims Key Pointers */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5 uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Prelims High-Yield Facts</span>
                  </div>
                  <ul className="space-y-1.5 pl-4 list-disc text-xs text-slate-300">
                    {ca.prelimsPointers.map((p, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Mains Analytical Dimension */}
                <div className="bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-500/30 text-xs">
                  <span className="font-bold text-indigo-300">Mains Question Perspective: </span>
                  <span className="text-slate-300">{ca.mainsDimension}</span>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateToChat(
                        `Explain the background and constitutional significance of this current affairs topic: "${ca.title}". What questions can be asked in UPSC Prelims and Mains?`
                      )
                    }
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask WhatsApp Tutor to generate a practice question on this</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- SUB-TAB 4: CONSTITUTION & POLITY VAULT ---------------- */}
      {activeSubTab === 'polity_vault' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Indian Constitution & Polity Vault</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Most-repeated Articles, Landmark Supreme Court Judgments, and Schedules for UPSC & SSC CGL
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Laxmikanth High-Yield
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {POLITY_MUST_KNOW_ARTICLES.map((art) => (
              <div
                key={art.article}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-black text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                      {art.article}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {art.importance} Frequency
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{art.title}</h3>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{art.part}</div>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {art.summary}
                  </p>

                  {art.landmarkJudgments && (
                    <div className="mt-3 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">
                      <span className="font-bold text-indigo-400">Landmark Judgments: </span>
                      <span className="text-slate-300">{art.landmarkJudgments}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateToChat(
                        `Please explain ${art.article} (${art.title}) with key Supreme Court doctrines, exceptions, and previous UPSC questions.`
                      )
                    }
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Explain {art.article} in WhatsApp</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- SUB-TAB 5: SUBJECT-WISE PYQ BLUEPRINT ---------------- */}
      {activeSubTab === 'syllabus_tracker' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Subject-Wise Marks Weightage & PYQ Frequency</h2>
            <p className="text-xs text-slate-400 mt-1">
              Historical trends based on 10-year question distribution for UPSC Prelims & SSC CGL
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                subject: 'Indian Polity & Governance',
                questionsAvg: '15 - 18 Questions (30-36 Marks)',
                priority: 'High Priority',
                keyFocus: 'Fundamental Rights, Parliament, Constitutional Bodies, Local Governance & Supreme Court Verdicts',
                accuracyTarget: '85%+',
                barWidth: '90%',
              },
              {
                subject: 'Indian Economy & Social Development',
                questionsAvg: '14 - 17 Questions (28-34 Marks)',
                priority: 'High Priority',
                keyFocus: 'Banking, Monetary Policy, Inflation Indices, External Sector, Budget & Government Schemes',
                accuracyTarget: '80%+',
                barWidth: '85%',
              },
              {
                subject: 'Modern Indian History & Art & Culture',
                questionsAvg: '12 - 15 Questions (24-30 Marks)',
                priority: 'High Priority',
                keyFocus: '1857 Revolt, 1919/1935 Acts, Gandhi Phase (1915-1947), Socio-Religious Movements, Temple Architecture',
                accuracyTarget: '75%+',
                barWidth: '78%',
              },
              {
                subject: 'Environment, Ecology & Biodiversity',
                questionsAvg: '14 - 16 Questions (28-32 Marks)',
                priority: 'High Priority',
                keyFocus: 'National Parks, Ramsar Wetlands, Wildlife Protection Act, Climate Agreements, Endangered Species',
                accuracyTarget: '75%+',
                barWidth: '82%',
              },
              {
                subject: 'General Science, Technology & Defense',
                questionsAvg: '10 - 12 Questions (20-24 Marks)',
                priority: 'Medium Priority',
                keyFocus: 'Space Missions (ISRO), Biotechnology (CRISPR), AI & Semiconductors, Emerging Diseases',
                accuracyTarget: '70%+',
                barWidth: '65%',
              },
              {
                subject: 'CSAT / Quantitative Aptitude & Mental Ability',
                questionsAvg: '80 Questions (Qualifying at 33% / 66 Marks)',
                priority: 'Mandatory Qualifying',
                keyFocus: 'Reading Comprehension, Number Systems, Percentages, Syllogisms, Data Sufficiency',
                accuracyTarget: '50%+ (Safe Zone: 85+ Marks)',
                barWidth: '95%',
              },
            ].map((item) => (
              <div key={item.subject} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white">{item.subject}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {item.priority}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-amber-400">{item.questionsAvg}</span>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-2"
                    style={{ width: item.barWidth }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-1 pt-1">
                  <span>
                    <strong className="text-slate-300">Key Focus:</strong> {item.keyFocus}
                  </span>
                  <span className="text-emerald-400 font-semibold shrink-0">
                    Accuracy Target: {item.accuracyTarget}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
