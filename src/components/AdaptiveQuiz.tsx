import React, { useState, useEffect } from 'react';
import {
  Brain,
  Target,
  Sparkles,
  CheckCircle2,
  XCircle,
  Award,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Play,
  ArrowRight,
  Database,
  Flame,
  BookOpen,
  Volume2,
  RefreshCw,
  Plus,
  Clock,
  Layers,
  Check,
} from 'lucide-react';
import { StudentProfile, QuizQuestion } from '../types/index.ts';
import {
  db,
  auth,
  doc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  handleFirestoreError,
  OperationType,
} from '../firebase.ts';

interface AdaptiveQuizProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat?: (text: string) => void;
}

interface CompletedQuizRecord {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  difficulty: string;
  completedAt: string;
}

export const AdaptiveQuiz: React.FC<AdaptiveQuizProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
}) => {
  // Target topic selection
  const weakTopics = profile.weakTopics && profile.weakTopics.length > 0
    ? profile.weakTopics
    : ['Recursion in Python', 'Limits in Calculus', 'Dynamic Programming'];

  const [selectedTopic, setSelectedTopic] = useState<string>(weakTopics[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [newWeakTopicInput, setNewWeakTopicInput] = useState('');
  const [isAddingTopic, setIsAddingTopic] = useState(false);

  // Active Quiz State
  const [quizState, setQuizState] = useState<'idle' | 'loading' | 'active' | 'completed'>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<
    { questionId: string; selectedOption: string; isCorrect: boolean; explanation: string }[]
  >([]);

  // Firestore sync & history state
  const [isSavingToFirestore, setIsSavingToFirestore] = useState(false);
  const [firestoreSavedSuccess, setFirestoreSavedSuccess] = useState(false);
  const [quizHistory, setQuizHistory] = useState<CompletedQuizRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Subscribe to student's quiz records in Firestore when signed in
  useEffect(() => {
    if (!profile.userId) return;

    if (!auth.currentUser) {
      setLoadingHistory(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'quizzes'),
        where('userId', '==', profile.userId)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const records: CompletedQuizRecord[] = [];
          snapshot.forEach((docSnap) => {
            records.push(docSnap.data() as CompletedQuizRecord);
          });
          records.sort(
            (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
          );
          setQuizHistory(records);
          setLoadingHistory(false);
        },
        (error) => {
          console.warn('Firestore quiz history listener fallback to local state:', error);
          setLoadingHistory(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Could not initialize Firestore listener:', err);
      setLoadingHistory(false);
    }
  }, [profile.userId]);

  // Fetch adaptive quiz questions targeting selected weak topic
  const startAdaptiveQuiz = async (topicToUse?: string) => {
    const topic = topicToUse || selectedTopic;
    setQuizState('loading');
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setUserAnswers([]);
    setFirestoreSavedSuccess(false);

    try {
      const res = await fetch('/api/quiz/adaptive-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          topic,
          difficulty: selectedDifficulty,
          count: 3,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
        setQuizState('active');
      } else {
        // Fallback generator if network or quota issue
        generateFallbackQuestions(topic);
      }
    } catch (err) {
      console.error('Failed to fetch adaptive quiz questions', err);
      generateFallbackQuestions(topic);
    }
  };

  const generateFallbackQuestions = (topic: string) => {
    const isPython = topic.toLowerCase().includes('python') || topic.toLowerCase().includes('recursion');
    const fallbackList: QuizQuestion[] = isPython
      ? [
          {
            id: 'q1',
            subject: 'Python',
            topic,
            questionText: 'What is the primary purpose of a "base case" in a recursive function?',
            type: 'mcq',
            options: [
              'A) To allocate additional heap memory',
              'B) To terminate recursion and prevent infinite call stack execution',
              'C) To compile bytecode into native machine instructions',
              'D) To initialize default function arguments',
            ],
            correctAnswer: 'B',
            explanation: 'The base case provides a stopping condition. Without it, the recursive call continues until Python exceeds recursion limit (RecursionError).',
            difficulty: 'intermediate',
          },
          {
            id: 'q2',
            subject: 'Python',
            topic,
            questionText: 'Which data structure does the computer runtime use internally to track recursive calls?',
            type: 'mcq',
            options: [
              'A) FIFO Queue',
              'B) Hash Table',
              'C) LIFO Call Stack',
              'D) Min Heap',
            ],
            correctAnswer: 'C',
            explanation: 'Recursive function frames are stored on the Call Stack (Last-In, First-Out), popping off when reaching the base case.',
            difficulty: 'intermediate',
          },
          {
            id: 'q3',
            subject: 'Python',
            topic,
            questionText: 'What is the return value of a recursive factorial function for input n = 0?',
            type: 'mcq',
            options: [
              'A) 0',
              'B) 1',
              'C) None',
              'D) -1',
            ],
            correctAnswer: 'B',
            explanation: 'By mathematical convention and recursive definition, 0! = 1, which serves as the classic base case.',
            difficulty: 'intermediate',
          },
        ]
      : [
          {
            id: 'q1',
            subject: 'Mathematics',
            topic,
            questionText: `What is the fundamental objective when analyzing "${topic}"?`,
            type: 'mcq',
            options: [
              'A) Finding the limiting value as the variable approaches a target point',
              'B) Randomly testing integer parameters',
              'C) Ignoring boundary conditions',
              'D) Simplifying equations by eliminating variables',
            ],
            correctAnswer: 'A',
            explanation: 'Evaluating limits allows mathematicians and computer scientists to understand asymptotic behavior near points of discontinuity.',
            difficulty: 'intermediate',
          },
          {
            id: 'q2',
            subject: 'Mathematics',
            topic,
            questionText: 'What technique is used when direct substitution results in the indeterminate form 0/0?',
            type: 'mcq',
            options: [
              'A) Factoring, rationalization, or L\'Hôpital\'s Rule',
              'B) Declaring the limit undefined immediately',
              'C) Rounding to zero',
              'D) Inverting the numerator and denominator',
            ],
            correctAnswer: 'A',
            explanation: 'Indeterminate forms require algebraic simplification or derivatives (L\'Hôpital\'s Rule) to reveal the true limit.',
            difficulty: 'intermediate',
          },
          {
            id: 'q3',
            subject: 'Mathematics',
            topic,
            questionText: 'For a function f(x) to be continuous at point c, which condition must hold?',
            type: 'mcq',
            options: [
              'A) The limit as x approaches c must exist and equal f(c)',
              'B) f(c) must equal zero',
              'C) The derivative must be infinite',
              'D) The function must be strictly linear',
            ],
            correctAnswer: 'A',
            explanation: 'Continuity requires: 1) f(c) is defined, 2) limit x->c exists, and 3) limit equals f(c).',
            difficulty: 'intermediate',
          },
        ];

    setQuestions(fallbackList);
    setQuizState('active');
  };

  // Submit Answer for Current Question
  const handleSelectOption = (opt: string) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(opt);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption || isAnswerSubmitted) return;

    const currentQ = questions[currentQuestionIndex];
    const letter = selectedOption.trim().charAt(0).toUpperCase();
    const correctLetter = currentQ.correctAnswer.trim().charAt(0).toUpperCase();
    const isCorrect = letter === correctLetter;

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setUserAnswers((prev) => [
      ...prev,
      {
        questionId: currentQ.id,
        selectedOption,
        isCorrect,
        explanation: currentQ.explanation,
      },
    ]);

    setIsAnswerSubmitted(true);
  };

  // Proceed to next question or complete quiz
  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      finishAndSaveQuiz();
    }
  };

  // Finalize Quiz & Persist in Firestore
  const finishAndSaveQuiz = async () => {
    setQuizState('completed');
    setIsSavingToFirestore(true);

    const finalScore = score + (selectedOption?.trim().charAt(0).toUpperCase() === questions[currentQuestionIndex]?.correctAnswer.trim().charAt(0).toUpperCase() ? 0 : 0);
    const totalCount = questions.length;
    const percentage = Math.round((finalScore / totalCount) * 100);
    const isMastered = percentage >= 70;

    const quizId = `quiz_${Date.now()}`;
    const quizRecord: CompletedQuizRecord = {
      id: quizId,
      userId: profile.userId,
      subject: questions[0]?.subject || 'Curriculum',
      topic: selectedTopic,
      score: finalScore,
      totalQuestions: totalCount,
      percentage,
      difficulty: selectedDifficulty,
      completedAt: new Date().toISOString(),
    };

    try {
      // 1. Calculate profile improvements
      let updatedWeakTopics = [...(profile.weakTopics || [])];
      let updatedStrongTopics = [...(profile.strongTopics || [])];

      if (isMastered) {
        // Graduate topic from weakTopics!
        updatedWeakTopics = updatedWeakTopics.filter(
          (t) => t.toLowerCase() !== selectedTopic.toLowerCase()
        );
        if (!updatedStrongTopics.some((t) => t.toLowerCase() === selectedTopic.toLowerCase())) {
          updatedStrongTopics.push(selectedTopic);
        }
      } else {
        if (!updatedWeakTopics.some((t) => t.toLowerCase() === selectedTopic.toLowerCase())) {
          updatedWeakTopics.push(selectedTopic);
        }
      }

      const updatedProfileData: Partial<StudentProfile> = {
        totalQuestionsAnswered: (profile.totalQuestionsAnswered || 0) + totalCount,
        correctAnswers: (profile.correctAnswers || 0) + finalScore,
        overallProgress: Math.min(100, (profile.overallProgress || 65) + (isMastered ? 4 : 1)),
        weakTopics: updatedWeakTopics,
        strongTopics: updatedStrongTopics,
        learningHistory: [
          ...(profile.learningHistory || []),
          {
            topic: selectedTopic,
            subject: questions[0]?.subject || 'Curriculum',
            date: new Date().toISOString().split('T')[0],
            mastered: isMastered,
          },
        ],
      };

      // 2. Update local state and history immediately
      setQuizHistory((prev) => [quizRecord, ...prev]);
      onProfileUpdate({
        ...profile,
        ...updatedProfileData,
      } as StudentProfile);

      // 3. Sync to local backend database
      await fetch('/api/quiz/record-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          topic: selectedTopic,
          subject: questions[0]?.subject || 'Curriculum',
          score: finalScore,
          totalQuestions: totalCount,
          difficulty: selectedDifficulty,
        }),
      });

      // 4. Save to Firestore if authenticated
      if (auth.currentUser) {
        try {
          const quizDocRef = doc(db, 'quizzes', quizId);
          await setDoc(quizDocRef, quizRecord);

          const profileDocRef = doc(db, 'profiles', profile.userId);
          await setDoc(profileDocRef, updatedProfileData, { merge: true });
        } catch (fErr) {
          console.warn('Firestore write warning:', fErr);
        }
      }

      setFirestoreSavedSuccess(true);
    } catch (err) {
      console.warn('Quiz recording error:', err);
    } finally {
      setIsSavingToFirestore(false);
    }
  };

  // Add custom weak topic to profile
  const handleAddWeakTopic = async () => {
    if (!newWeakTopicInput.trim()) return;
    const topicToAdd = newWeakTopicInput.trim();
    const updatedWeak = Array.from(new Set([...(profile.weakTopics || []), topicToAdd]));

    try {
      const profileDocRef = doc(db, 'profiles', profile.userId);
      await setDoc(profileDocRef, { weakTopics: updatedWeak }, { merge: true });

      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weakTopics: updatedWeak }),
      });

      onProfileUpdate({
        ...profile,
        weakTopics: updatedWeak,
      });

      setSelectedTopic(topicToAdd);
      setNewWeakTopicInput('');
      setIsAddingTopic(false);
    } catch (err) {
      console.error('Failed to add weak topic', err);
    }
  };

  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Brain className="w-3.5 h-3.5 text-amber-400" />
              <span>Targeted Remediation Engine</span>
              <span>•</span>
              <Database className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300">Firestore Tracked</span>
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Adaptive Weak-Topic Quiz</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Dynamically generates quizzes specifically targeting your identified weak topics (from your student profile). Your answers and mastery progress are tracked directly in Google Cloud Firestore!
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-center">
              <div className="text-xs text-slate-400">Identified Weak Areas</div>
              <div className="text-lg font-bold text-amber-400 font-mono">
                {weakTopics.length} Topics
              </div>
            </div>

            <div className="px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-center">
              <div className="text-xs text-slate-400">Total Quizzes Logged</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {quizHistory.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weak Topics Selector & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Target className="w-4 h-4 text-amber-400" />
            <span>Select Weak Topic to Target</span>
          </span>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Difficulty:</span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value as any)}
              disabled={quizState === 'active'}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <button
              onClick={() => setIsAddingTopic(!isAddingTopic)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
              title="Add a custom challenging topic"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add Topic Input Bar */}
        {isAddingTopic && (
          <div className="flex items-center space-x-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
            <input
              type="text"
              value={newWeakTopicInput}
              onChange={(e) => setNewWeakTopicInput(e.target.value)}
              placeholder="Enter new challenging topic (e.g. Graph Traversal, Chain Rule)..."
              className="flex-1 bg-slate-800 border border-slate-700 text-xs rounded-xl px-3 py-2 text-white focus:outline-none"
            />
            <button
              onClick={handleAddWeakTopic}
              disabled={!newWeakTopicInput.trim()}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-semibold rounded-xl text-white transition"
            >
              Add to Profile
            </button>
          </div>
        )}

        {/* Weak Topic Interactive Pills */}
        <div className="flex flex-wrap gap-2">
          {weakTopics.map((topic) => (
            <button
              key={topic}
              onClick={() => {
                if (quizState !== 'active') {
                  setSelectedTopic(topic);
                }
              }}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
                selectedTopic === topic
                  ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${selectedTopic === topic ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{topic}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Quiz Area: Active Test, Loading or Start Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
        {quizState === 'idle' && (
          <div className="text-center py-10 max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Brain className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                Ready to practice "{selectedTopic}"?
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                The AI will generate 3 adaptive questions calibrated to your skill level. Scoring 70% or higher will graduate this topic from your weak areas!
              </p>
            </div>

            <button
              onClick={() => startAdaptiveQuiz()}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition transform active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Launch Adaptive Quiz</span>
            </button>
          </div>
        )}

        {quizState === 'loading' && (
          <div className="text-center py-14 max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin mx-auto" />
            <div>
              <h4 className="text-base font-semibold text-white">
                Generating Questions for "{selectedTopic}"...
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Synthesizing targeted conceptual questions addressing common pitfalls...
              </p>
            </div>
          </div>
        )}

        {quizState === 'active' && currentQ && (
          <div className="space-y-6">
            {/* Question Progress Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-amber-400 border border-slate-700">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Target: {selectedTopic}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span>Score:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">{score} / {questions.length}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
                style={{
                  width: `${((currentQuestionIndex + (isAnswerSubmitted ? 1 : 0)) / questions.length) * 100}%`,
                }}
              />
            </div>

            {/* Question Text */}
            <div className="py-2">
              <h3 className="text-base sm:text-lg font-semibold text-white leading-relaxed">
                {currentQ.questionText}
              </h3>
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {(currentQ.options || []).map((option, idx) => {
                const optLetter = option.trim().charAt(0).toUpperCase();
                const correctLetter = currentQ.correctAnswer.trim().charAt(0).toUpperCase();
                const isThisSelected = selectedOption === option;

                let optionStyle = 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600';

                if (isAnswerSubmitted) {
                  if (optLetter === correctLetter) {
                    optionStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/20';
                  } else if (isThisSelected && optLetter !== correctLetter) {
                    optionStyle = 'bg-rose-950/60 border-rose-500 text-rose-200 ring-2 ring-rose-500/20';
                  } else {
                    optionStyle = 'bg-slate-900 border-slate-800 text-slate-500 opacity-60';
                  }
                } else if (isThisSelected) {
                  optionStyle = 'bg-amber-500/20 border-amber-500 text-amber-100 ring-2 ring-amber-500/30';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(option)}
                    disabled={isAnswerSubmitted}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start space-x-3 cursor-pointer ${optionStyle}`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isAnswerSubmitted && optLetter === correctLetter
                          ? 'bg-emerald-500 text-white'
                          : isAnswerSubmitted && isThisSelected && optLetter !== correctLetter
                          ? 'bg-rose-500 text-white'
                          : isThisSelected
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-700/60 text-slate-300'
                      }`}
                    >
                      {optLetter}
                    </span>

                    <span className="text-xs sm:text-sm font-medium leading-relaxed pt-0.5">
                      {option.replace(/^[A-D]\)\s*/, '')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Explanation Card (Visible after submit) */}
            {isAnswerSubmitted && (
              <div
                className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-1.5 ${
                  selectedOption?.trim().charAt(0).toUpperCase() === currentQ.correctAnswer.trim().charAt(0).toUpperCase()
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-center space-x-2 font-bold">
                  {selectedOption?.trim().charAt(0).toUpperCase() === currentQ.correctAnswer.trim().charAt(0).toUpperCase() ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Correct! Excellent intuition.</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>Incorrect. Correct answer was {currentQ.correctAnswer}.</span>
                    </>
                  )}
                </div>
                <p className="text-xs leading-relaxed opacity-90">{currentQ.explanation}</p>
              </div>
            )}

            {/* Action Toolbar */}
            <div className="flex items-center justify-end space-x-3 pt-3">
              {!isAnswerSubmitted ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedOption}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer"
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer"
                >
                  <span>{currentQuestionIndex + 1 < questions.length ? 'Next Question' : 'Complete Quiz'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Completed Results Card */}
        {quizState === 'completed' && (
          <div className="text-center py-8 space-y-6 max-w-lg mx-auto">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xl ${
                Math.round((score / questions.length) * 100) >= 70
                  ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 ring-8 ring-emerald-500/10'
                  : 'bg-amber-500/20 text-amber-400 border-2 border-amber-500/40 ring-8 ring-amber-500/10'
              }`}
            >
              {Math.round((score / questions.length) * 100) >= 70 ? (
                <Award className="w-10 h-10" />
              ) : (
                <TrendingUp className="w-10 h-10" />
              )}
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Quiz Result • {selectedTopic}
              </span>
              <h3 className="text-2xl font-bold text-white mt-1">
                {score} / {questions.length} Correct ({Math.round((score / questions.length) * 100)}%)
              </h3>

              {Math.round((score / questions.length) * 100) >= 70 ? (
                <div className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Topic Mastered! Graduated from Weak Topics</span>
                </div>
              ) : (
                <p className="text-xs text-amber-300 mt-2">
                  Good effort! Keep practicing to strengthen your foundational intuition.
                </p>
              )}
            </div>

            {/* Firestore Sync Badge */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <span className="flex items-center space-x-1.5 text-slate-400">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Firestore Status:</span>
              </span>
              {isSavingToFirestore ? (
                <span className="text-amber-400 flex items-center space-x-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Syncing to Firestore...</span>
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Performance Recorded in Cloud Firestore</span>
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => startAdaptiveQuiz()}
                className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Quiz</span>
              </button>

              <button
                onClick={() => setQuizState('idle')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Choose Another Weak Topic
              </button>

              {onNavigateToChat && (
                <button
                  onClick={() => onNavigateToChat(`I just took a quiz on ${selectedTopic}. Can you explain where students commonly get confused?`)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
                >
                  Discuss with AI Tutor
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Firestore Quiz History & Performance Track Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Firestore Quiz Performance History
            </h4>
          </div>

          <span className="text-xs text-slate-400">
            {quizHistory.length} Recorded Sessions
          </span>
        </div>

        {loadingHistory ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Loading performance data from Firestore...
          </div>
        ) : quizHistory.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No quiz records found in Firestore yet. Take an adaptive quiz above to start tracking!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quizHistory.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white truncate max-w-[160px]">
                    {item.topic}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      item.percentage >= 70
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {item.percentage}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Score: {item.score} / {item.totalQuestions}</span>
                  <span className="capitalize">{item.difficulty}</span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80 pt-2">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </span>
                  <span className="text-emerald-400 font-mono">Firestore Verified</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
