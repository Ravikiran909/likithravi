import React, { useState, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  CheckCircle2,
  XCircle,
  Award,
  Flame,
  RotateCcw,
  Play,
  ArrowRight,
  Plus,
  BookOpen,
  MessageSquare,
  ShieldCheck,
  Check,
  ChevronRight,
  TrendingUp,
  Target,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import { StudentProfile, QuizQuestion } from '../types/index.ts';
import { db, auth, doc, setDoc } from '../firebase.ts';

export interface DailyQuizProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  onQuizCompleted?: (details: {
    minutesEarned: number;
    questionsCount: number;
    score: number;
    topics: string[];
  }) => void;
}

interface QuestionAnswerResult {
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  explanation: string;
  targetedWeakTopic: string;
}

export const DailyQuiz: React.FC<DailyQuizProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onQuizCompleted,
}) => {
  // Extract weak topics or provide curated defaults
  const studentWeakTopics =
    profile.weakTopics && profile.weakTopics.length > 0
      ? profile.weakTopics
      : ['Recursion in Python', 'Limits in Calculus', 'Dynamic Programming', 'SQL Joins', 'Binary Search'];

  // State
  const [selectedTopics, setSelectedTopics] = useState<string[]>(studentWeakTopics);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>(
    profile.currentSkillLevel === 'beginner'
      ? 'beginner'
      : profile.currentSkillLevel === 'expert'
      ? 'advanced'
      : 'intermediate'
  );
  const [newTopicInput, setNewTopicInput] = useState('');
  const [isAddingTopic, setIsAddingTopic] = useState(false);

  // Quiz progression state
  const [quizState, setQuizState] = useState<'ready' | 'loading' | 'active' | 'completed'>('ready');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userResults, setUserResults] = useState<QuestionAnswerResult[]>([]);
  const [score, setScore] = useState(0);

  // Status feedback
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [masteredTopicsIdentified, setMasteredTopicsIdentified] = useState<string[]>([]);

  // Sync selectedTopics when profile.weakTopics updates
  useEffect(() => {
    if (profile.weakTopics && profile.weakTopics.length > 0) {
      setSelectedTopics(profile.weakTopics);
    }
  }, [profile.weakTopics]);

  // Toggle or add weak topics for this quiz
  const handleToggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      if (selectedTopics.length > 1) {
        setSelectedTopics(selectedTopics.filter((t) => t !== topic));
      }
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleAddNewWeakTopic = () => {
    const trimmed = newTopicInput.trim();
    if (!trimmed) return;
    if (!selectedTopics.includes(trimmed)) {
      const updatedList = [...selectedTopics, trimmed];
      setSelectedTopics(updatedList);
      // Also update in profile if not present
      if (!profile.weakTopics?.includes(trimmed)) {
        const nextProfileWeak = [...(profile.weakTopics || []), trimmed];
        onProfileUpdate({
          ...profile,
          weakTopics: nextProfileWeak,
        });
      }
    }
    setNewTopicInput('');
    setIsAddingTopic(false);
  };

  // Generate 5 questions based on weak topics using Gemini API
  const handleGenerateDailyQuiz = async () => {
    setQuizState('loading');
    setGenerationError(null);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setUserResults([]);
    setScore(0);
    setSaveSuccess(false);
    setMasteredTopicsIdentified([]);

    try {
      const res = await fetch('/api/quiz/daily-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          weakTopics: selectedTopics,
          difficulty: selectedDifficulty,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions.slice(0, 5));
        setQuizState('active');
      } else {
        throw new Error('No questions returned by Gemini API');
      }
    } catch (err: any) {
      console.warn('Failed to generate daily quiz via Gemini API, using high-yield fallback questions:', err);
      // Fallback 5 questions covering selected weak topics
      const fallbacks: QuizQuestion[] = [
        {
          id: `fallback_q1_${Date.now()}`,
          subject: 'Python',
          topic: selectedTopics[0] || 'Recursion in Python',
          questionText: 'In recursive algorithms, what is the fundamental purpose of the "base case"?',
          type: 'mcq',
          options: [
            'A) To allocate additional call stack memory for recursion',
            'B) To terminate the recursive chain and prevent infinite stack overflow',
            'C) To compile bytecode into native machine instructions',
            'D) To initialize default function arguments',
          ],
          correctAnswer: 'B',
          explanation: 'The base case provides a terminal stopping condition. Without it, call stack frames accumulate until RecursionError is raised.',
          difficulty: selectedDifficulty,
        },
        {
          id: `fallback_q2_${Date.now()}`,
          subject: 'Mathematics',
          topic: selectedTopics[1] || selectedTopics[0] || 'Limits in Calculus',
          questionText: 'What is the limit of sin(x) / x as x approaches 0?',
          type: 'mcq',
          options: [
            'A) 0',
            'B) 1',
            'C) Infinity',
            'D) Undefined',
          ],
          correctAnswer: 'B',
          explanation: 'By L\'Hôpital\'s Rule (or geometric proof via Squeeze Theorem), lim(x→0) sin(x)/x = cos(0)/1 = 1.',
          difficulty: selectedDifficulty,
        },
        {
          id: `fallback_q3_${Date.now()}`,
          subject: 'Algorithms',
          topic: selectedTopics[2] || selectedTopics[0] || 'Dynamic Programming',
          questionText: 'Which two fundamental properties must a problem satisfy to be solvable via Dynamic Programming?',
          type: 'mcq',
          options: [
            'A) Greedy choice property and polynomial degree',
            'B) Optimal substructure and overlapping subproblems',
            'C) Unbounded search space and deterministic hashing',
            'D) FIFO scheduling and depth-first exploration',
          ],
          correctAnswer: 'B',
          explanation: 'Dynamic Programming requires both Optimal Substructure (optimal solution composed of optimal sub-solutions) and Overlapping Subproblems (subproblems recur frequently).',
          difficulty: selectedDifficulty,
        },
        {
          id: `fallback_q4_${Date.now()}`,
          subject: 'Databases',
          topic: selectedTopics[3] || selectedTopics[0] || 'SQL Joins',
          questionText: 'Which join type returns all records from the LEFT table, and the matched records from the RIGHT table (filling NULL if unmatched)?',
          type: 'mcq',
          options: [
            'A) INNER JOIN',
            'B) LEFT OUTER JOIN',
            'C) CROSS JOIN',
            'D) FULL OUTER JOIN excluding match',
          ],
          correctAnswer: 'B',
          explanation: 'A LEFT JOIN keeps every row from the left table unconditionally and pairs matching rows from the right table, populating NULLs where unmatched.',
          difficulty: selectedDifficulty,
        },
        {
          id: `fallback_q5_${Date.now()}`,
          subject: 'Algorithms',
          topic: selectedTopics[4] || selectedTopics[0] || 'Binary Search',
          questionText: 'In languages with fixed integer bit widths (such as Java or C++), why is `mid = low + (high - low) / 2` preferred over `mid = (low + high) / 2`?',
          type: 'mcq',
          options: [
            'A) It executes on hardware registers with 2x lower latency',
            'B) It avoids 32-bit signed integer overflow when low + high exceeds 2^31 - 1',
            'C) It always rounds down towards negative infinity',
            'D) It permits logarithmic branching on unsorted arrays',
          ],
          correctAnswer: 'B',
          explanation: 'When low and high are both large positive integers, (low + high) can exceed Integer.MAX_VALUE, producing overflow and negative indices. The alternate form avoids this cleanly.',
          difficulty: selectedDifficulty,
        },
      ];
      setQuestions(fallbacks);
      setQuizState('active');
    }
  };

  // Active question details
  const currentQuestion = questions[currentIndex];

  const handleSelectOption = (opt: string) => {
    if (isSubmitted) return;
    const letter = opt.slice(0, 1).toUpperCase();
    setSelectedOption(letter);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption || !currentQuestion || isSubmitted) return;

    const correctLetter = currentQuestion.correctAnswer.slice(0, 1).toUpperCase();
    const isCorrect = selectedOption === correctLetter;
    const targetedTopic = (currentQuestion as any).targetedWeakTopic || currentQuestion.topic || 'Core Concept';

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    const answerRecord: QuestionAnswerResult = {
      questionId: currentQuestion.id,
      selectedOption,
      isCorrect,
      explanation: currentQuestion.explanation || 'Verified pedagogical explanation.',
      targetedWeakTopic: targetedTopic,
    };

    setUserResults((prev) => [...prev, answerRecord]);
    setIsSubmitted(true);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
    } else {
      finishQuiz();
    }
  };

  // Finalize Quiz
  const finishQuiz = async () => {
    setQuizState('completed');
    setIsSavingProgress(true);

    const totalQuestions = questions.length || 5;
    const finalScore = score + (selectedOption === currentQuestion?.correctAnswer?.slice(0, 1).toUpperCase() && !isSubmitted ? 1 : 0);
    const finalScoreToUse = isSubmitted ? score : finalScore;
    const percentage = Math.round((finalScoreToUse / totalQuestions) * 100);

    // Identify mastered topics (if student answered question correctly on that weak topic)
    const correctlyAnsweredTopics = userResults
      .filter((r) => r.isCorrect)
      .map((r) => r.targetedWeakTopic);

    // If score >= 4, topics with correct answers can be promoted
    const newlyMastered = Array.from(new Set(correctlyAnsweredTopics));
    setMasteredTopicsIdentified(newlyMastered);

    // Minutes earned: 5 questions * 3 mins = 15 mins
    const minutesEarned = 15;
    const todayStr = new Date().toISOString().split('T')[0];

    // Calculate next weak & strong topics
    let nextWeakTopics = [...(profile.weakTopics || [])];
    let nextStrongTopics = [...(profile.strongTopics || [])];

    if (percentage >= 70 && newlyMastered.length > 0) {
      // Remove newly mastered topics from weakTopics and add to strongTopics
      nextWeakTopics = nextWeakTopics.filter(
        (wt) => !newlyMastered.some((mt) => mt.toLowerCase() === wt.toLowerCase())
      );
      newlyMastered.forEach((mt) => {
        if (!nextStrongTopics.some((st) => st.toLowerCase() === mt.toLowerCase())) {
          nextStrongTopics.push(mt);
        }
      });
    }

    const updatedProfile: StudentProfile = {
      ...profile,
      streak: (profile.streak || 0) + 1,
      totalQuestionsAnswered: (profile.totalQuestionsAnswered || 0) + totalQuestions,
      questionsAnsweredToday: (profile.questionsAnsweredToday || 0) + totalQuestions,
      correctAnswers: (profile.correctAnswers || 0) + finalScoreToUse,
      overallProgress: Math.min(100, (profile.overallProgress || 50) + (percentage >= 70 ? 3 : 1)),
      weakTopics: nextWeakTopics,
      strongTopics: nextStrongTopics,
      lastActiveDate: todayStr,
      learningHistory: [
        ...(profile.learningHistory || []),
        {
          topic: `Daily Quiz (5 Weak Topics)`,
          subject: 'Comprehensive Daily Diagnostic',
          date: todayStr,
          score: finalScoreToUse,
          mastered: percentage >= 70,
        },
      ],
    };

    onProfileUpdate(updatedProfile);

    // Sync to backend /api/quiz/record-result
    try {
      await fetch('/api/quiz/record-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          topic: 'Daily Weak Topics Diagnostic',
          subject: 'Comprehensive',
          score: finalScoreToUse,
          totalQuestions,
          studyMinutesLogged: minutesEarned,
        }),
      });
    } catch (err) {
      console.warn('Failed to record result via API, continuing with client state:', err);
    }

    // Sync to Firestore if authenticated
    try {
      if (profile.userId && auth.currentUser) {
        const quizRecordRef = doc(db, 'quiz_history', `daily_${Date.now()}`);
        await setDoc(quizRecordRef, {
          userId: profile.userId,
          quizType: 'DAILY_WEAK_TOPICS_QUIZ',
          score: finalScoreToUse,
          totalQuestions,
          percentage,
          weakTopicsTested: selectedTopics,
          masteredTopics: newlyMastered,
          completedAt: new Date().toISOString(),
          aiModel: 'gemini-3.8-flash',
        });
      }
    } catch (err) {
      console.warn('Firestore quiz history write warning:', err);
    }

    setIsSavingProgress(false);
    setSaveSuccess(true);

    if (onQuizCompleted) {
      onQuizCompleted({
        minutesEarned,
        questionsCount: totalQuestions,
        score: finalScoreToUse,
        topics: selectedTopics,
      });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800/80 pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl text-amber-400 shadow-inner">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl font-bold text-white tracking-tight">Daily Quiz</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Gemini 3.8 Flash</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Personalized 5-question diagnostic targeting your identified weak topics
            </p>
          </div>
        </div>

        {/* Quick Streak & Target Metric */}
        <div className="flex items-center space-x-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-right">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Daily Target</div>
            <div className="text-sm font-bold text-amber-300 flex items-center justify-end space-x-1">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>5 Questions</span>
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/40 text-right">
            <div className="text-[10px] font-semibold text-orange-300 uppercase tracking-wider">Streak Shield</div>
            <div className="text-sm font-bold text-white flex items-center justify-end space-x-1">
              <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
              <span>{profile.streak} Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- STATE 1: READY / TOPIC CONFIGURATION ---------------- */}
      {quizState === 'ready' && (
        <div className="space-y-6">
          <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <Brain className="w-4 h-4 text-emerald-400" />
                <span>Targeted Weak Topics ({selectedTopics.length})</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingTopic(!isAddingTopic)}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-medium transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Weak Topic</span>
              </button>
            </div>

            {isAddingTopic && (
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="text"
                  value={newTopicInput}
                  onChange={(e) => setNewTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNewWeakTopic()}
                  placeholder="e.g. Dijkstra's Algorithm, SQL Joins, Integration by Parts..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddNewWeakTopic}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingTopic(false)}
                  className="px-2.5 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {studentWeakTopics.map((topic) => {
                const isSelected = selectedTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => handleToggleTopic(topic)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>{topic}</span>
                    {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-2.5">
              Click topics to toggle focus. Gemini will generate 5 targeted questions focusing primarily on the active weak areas.
            </p>
          </div>

          {/* Difficulty Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['beginner', 'intermediate', 'advanced'] as const).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setSelectedDifficulty(diff)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  selectedDifficulty === diff
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-white shadow-md'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider capitalize text-emerald-400">
                  {diff}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {diff === 'beginner'
                    ? 'Fundamental concepts & syntax'
                    : diff === 'intermediate'
                    ? 'Application, edge cases & traces'
                    : 'Complex problem solving & Big-O'}
                </div>
              </button>
            ))}
          </div>

          {generationError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {generationError}
            </div>
          )}

          {/* Start Button */}
          <button
            type="button"
            onClick={handleGenerateDailyQuiz}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:via-teal-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center space-x-2 transition active:scale-[0.99] cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Generate Daily Quiz (5 Questions via Gemini AI)</span>
            <ArrowRight className="w-4 h-4 text-emerald-200" />
          </button>
        </div>
      )}

      {/* ---------------- STATE 2: LOADING GEMINI GENERATION ---------------- */}
      {quizState === 'loading' && (
        <div className="py-14 text-center space-y-4">
          <div className="relative inline-flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <Sparkles className="w-7 h-7 text-emerald-400 absolute animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Synthesizing 5 Targeted Questions...</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Gemini 3.8 Flash is analyzing your weak topics ({selectedTopics.slice(0, 3).join(', ')}) to craft high-yield diagnostic questions.
            </p>
          </div>
        </div>
      )}

      {/* ---------------- STATE 3: ACTIVE QUIZ IN PROGRESS ---------------- */}
      {quizState === 'active' && currentQuestion && (
        <div className="space-y-6">
          {/* Progress Header */}
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white">Question {currentIndex + 1} of {questions.length}</span>
              <span className="text-slate-600">•</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-[11px]">
                Target: {(currentQuestion as any).targetedWeakTopic || currentQuestion.topic}
              </span>
            </div>
            <div className="text-emerald-400 font-semibold flex items-center space-x-1">
              <Award className="w-3.5 h-3.5" />
              <span>Score: {score} / {currentIndex + (isSubmitted ? 1 : 0)}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Text */}
          <div className="bg-slate-950/70 p-5 rounded-xl border border-slate-800">
            <p className="text-sm sm:text-base font-semibold text-slate-100 leading-relaxed whitespace-pre-line">
              {currentQuestion.questionText}
            </p>
          </div>

          {/* MCQ Options */}
          <div className="space-y-2.5">
            {(currentQuestion.options || []).map((opt) => {
              const letter = opt.slice(0, 1).toUpperCase();
              const isSelected = selectedOption === letter;
              const isCorrectAnswer = currentQuestion.correctAnswer.slice(0, 1).toUpperCase() === letter;

              let cardStyle = 'bg-slate-950/50 border-slate-800 text-slate-200 hover:border-slate-700';

              if (isSubmitted) {
                if (isCorrectAnswer) {
                  cardStyle = 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200';
                } else if (isSelected && !isCorrectAnswer) {
                  cardStyle = 'bg-rose-950/40 border-rose-500/80 text-rose-200';
                } else {
                  cardStyle = 'bg-slate-950/30 border-slate-800/60 text-slate-500 opacity-60';
                }
              } else if (isSelected) {
                cardStyle = 'bg-indigo-950/40 border-indigo-500 text-white shadow-md';
              }

              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  disabled={isSubmitted}
                  className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${cardStyle}`}
                >
                  <span className="text-xs sm:text-sm font-medium">{opt}</span>
                  {isSubmitted && isCorrectAnswer && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                  )}
                  {isSubmitted && isSelected && !isCorrectAnswer && (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Banner when Submitted */}
          {isSubmitted && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5 animate-fadeIn">
              <div className="flex items-center space-x-2 text-xs font-bold">
                {selectedOption === currentQuestion.correctAnswer.slice(0, 1).toUpperCase() ? (
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Correct! Excellent comprehension.</span>
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center space-x-1">
                    <XCircle className="w-4 h-4" />
                    <span>Incorrect. Correct Answer: Option {currentQuestion.correctAnswer}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentQuestion.explanation}
              </p>

              {/* Ask Tutor bridge */}
              {onNavigateToChat && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigateToChat(
                      `Can you explain this question about "${(currentQuestion as any).targetedWeakTopic || currentQuestion.topic}" in detail? Question: "${currentQuestion.questionText}"`
                    )
                  }
                  className="mt-2 text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-semibold transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ask WhatsApp AI Tutor for deep-dive code explanation</span>
                </button>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setQuizState('ready')}
              className="text-xs text-slate-400 hover:text-white transition flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Quit Quiz</span>
            </button>

            {!isSubmitted ? (
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={!selectedOption}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow cursor-pointer"
              >
                Submit Answer
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextQuestion}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow flex items-center space-x-1.5 cursor-pointer"
              >
                <span>{currentIndex + 1 < questions.length ? 'Next Question' : 'Complete Quiz & View Score'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---------------- STATE 4: QUIZ COMPLETED ---------------- */}
      {quizState === 'completed' && (
        <div className="py-6 text-center space-y-6">
          <div className="inline-flex p-4 rounded-full bg-gradient-to-tr from-emerald-500/20 to-amber-500/20 border border-emerald-500/40 text-emerald-400">
            <Trophy className="w-10 h-10 animate-bounce" />
          </div>

          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">Daily Quiz Completed!</h3>
            <p className="text-sm text-slate-400 mt-1">
              You scored <span className="font-bold text-emerald-400">{score}</span> out of{' '}
              <span className="font-bold text-white">{questions.length}</span> ({Math.round((score / questions.length) * 100)}%)
            </p>
          </div>

          {/* Badges / Rewards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Daily Streak</div>
              <div className="text-sm font-bold text-orange-400 flex items-center space-x-1 mt-0.5">
                <Flame className="w-3.5 h-3.5 fill-orange-400" />
                <span>+1 Day Extended</span>
              </div>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Study Minutes</div>
              <div className="text-sm font-bold text-emerald-400 flex items-center space-x-1 mt-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+15 Minutes Logged</span>
              </div>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Questions Answered</div>
              <div className="text-sm font-bold text-indigo-400 flex items-center space-x-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>5 / 5 Target Met</span>
              </div>
            </div>
          </div>

          {/* Mastered Topics Promotion Notice */}
          {masteredTopicsIdentified.length > 0 && (
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 max-w-lg mx-auto text-left space-y-1.5">
              <div className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Knowledge Mastery Updated!</span>
              </div>
              <p className="text-[11px] text-slate-300">
                You correctly demonstrated mastery in:{' '}
                <span className="font-semibold text-emerald-200">
                  {masteredTopicsIdentified.join(', ')}
                </span>
                . These topics have been advanced to your strong curriculum profile!
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleGenerateDailyQuiz}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Take Another 5-Question Daily Quiz</span>
            </button>

            {onNavigateToChat && (
              <button
                type="button"
                onClick={() =>
                  onNavigateToChat(
                    `Hi! I just finished today's Daily Quiz on weak topics (${selectedTopics.join(', ')}). Can we review my mistakes?`
                  )
                }
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Discuss with WhatsApp Tutor</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setQuizState('ready')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium rounded-xl border border-slate-800 transition cursor-pointer"
            >
              Configure Topics
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
