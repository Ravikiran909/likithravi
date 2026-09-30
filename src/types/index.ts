export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'student' | 'admin';
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  name: string;
  whatsappNumber: string;
  preferredLanguage: string; // e.g. 'en', 'hi', 'kn', 'ta', 'te', 'es', 'fr', 'de', 'ja', 'ar', etc.
  educationLevel: 'school' | 'college' | 'competitive_exam' | 'professional';
  subjects: string[];
  currentSkillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  learningGoals: string[];
  weakTopics: string[];
  strongTopics: string[];
  studyHoursPerDay: number;
  preferredStudyTime: string; // e.g. "7:00 PM"
  dailyReminderEnabled?: boolean;
  examDates: { subject: string; date: string; title: string }[];
  learningHistory: { topic: string; subject: string; date: string; mastered: boolean }[];
  streak: number;
  lastActiveDate: string;
  overallProgress: number; // 0-100
  totalSessions: number;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  learningRank?: 'Novice' | 'Apprentice' | 'Scholar' | 'Master';
  earnedBadges?: { id: string; name: string; awardedAt: string }[];
  dailyQuestionsGoal?: number;
  questionsAnsweredToday?: number;
  focusStats?: {
    totalFocusMinutes: number;
    completedSessions: number;
    todayFocusMinutes?: number;
    lastSessionDate?: string;
  };
  pinnedDocumentIds?: string[];
  notes?: string;
}

export interface FocusSession {
  id: string;
  userId: string;
  durationMinutes: number;
  subject: string;
  topic?: string;
  completedAt: string;
  type: 'pomodoro' | 'short_break' | 'long_break';
  notes?: string;
}

export interface LearningObjective {
  id: string;
  subject: string;
  topic: string;
  title: string;
  description: string;
  targetLevel?: string;
  bloomLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  createdAt?: string;
}

export interface WeeklyStudyDay {
  dateStr: string;
  dayName: string;
  studyMinutes: number;
  questionsAnswered: number;
  focusSessions: number;
  topSubject: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  subject: string;
  hint?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface FlashcardDeck {
  id: string;
  title: string;
  topic: string;
  subject: string;
  cards: Flashcard[];
  createdAt: string;
}

export interface LearningResource {
  id: string;
  title: string;
  subject: 'Python' | 'Java' | 'C' | 'C++' | 'C#' | 'R' | 'DSA' | 'Mathematics' | 'General';
  type: 'youtube_video' | 'youtube_playlist' | 'free_course' | 'interactive_tutorial';
  provider: string;
  url: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  description: string;
  keyTopics: string[];
  isFreeVerified: boolean;
  featured?: boolean;
}

export interface MaterialReview {
  id: string;
  materialId: string;
  materialType: 'document' | 'course';
  materialTitle: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5 stars
  comment: string;
  createdAt: string;
  likesCount?: number;
}

export interface MaterialRatingSummary {
  materialId: string;
  averageRating: number;
  totalRatings: number;
  ratingDistribution: { [stars: number]: number };
}

export interface VirtualBadge {
  id: string;
  name: string;
  description: string;
  category: 'consistency' | 'problem_solving' | 'quiz' | 'mastery' | 'curriculum';
  iconName: string;
  requirement: string;
  isUnlocked: boolean;
  progress: number;
  maxProgress: number;
  awardedAt?: string;
  badgeTier: 'bronze' | 'silver' | 'gold' | 'diamond';
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  speechVoiceCode: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', speechVoiceCode: 'en-US', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechVoiceCode: 'hi-IN', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechVoiceCode: 'kn-IN', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', speechVoiceCode: 'ta-IN', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', speechVoiceCode: 'te-IN', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', speechVoiceCode: 'bn-IN', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', speechVoiceCode: 'mr-IN', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', speechVoiceCode: 'gu-IN', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', speechVoiceCode: 'ml-IN', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', speechVoiceCode: 'es-ES', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', speechVoiceCode: 'fr-FR', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', speechVoiceCode: 'de-DE', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', speechVoiceCode: 'ja-JP', flag: '🇯🇵' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', speechVoiceCode: 'ar-SA', flag: '🇸🇦' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', speechVoiceCode: 'zh-CN', flag: '🇨🇳' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', speechVoiceCode: 'pt-BR', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', speechVoiceCode: 'ru-RU', flag: '🇷🇺' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', speechVoiceCode: 'ko-KR', flag: '🇰🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', speechVoiceCode: 'it-IT', flag: '🇮🇹' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', speechVoiceCode: 'ur-PK', flag: '🇵🇰' },
];

export interface LearningRankInfo {
  name: 'Novice' | 'Apprentice' | 'Scholar' | 'Master';
  title: string;
  tier: number;
  minQuestions: number;
  minProgress: number;
  badgeColor: string;
  borderColor: string;
  bgGradient: string;
  icon: string;
  perks: string[];
  summary: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  category: string;
  topicsCount: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  title: string;
  orderIndex: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedMinutes: number;
  keyConcepts: string[];
  summary: string;
}

export interface QuizQuestion {
  id: string;
  quizSessionId?: string;
  subject: string;
  topic: string;
  questionText: string;
  type: 'mcq' | 'true_false' | 'numerical' | 'short_answer' | 'code';
  options?: string[]; // e.g. ["A) O(n)", "B) O(log n)", ...]
  correctAnswer: string; // "B" or "O(log n)"
  explanation: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface QuizSession {
  id: string;
  userId: string;
  whatsappNumber: string;
  subject: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  totalQuestions: number;
  currentIndex: number;
  score: number;
  questions: QuizQuestion[];
  completed: boolean;
  startedAt: string;
  completedAt?: string;
}

export interface QuizAnswer {
  id: string;
  quizSessionId: string;
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
  feedback: string;
  submittedAt: string;
}

export interface StudyPlanItem {
  id: string;
  dayNumber: number;
  dateStr: string;
  title: string;
  topic: string;
  subject: string;
  durationMinutes: number;
  tasks: { task: string; completed: boolean }[];
  isCompleted: boolean;
  isMissed: boolean;
  timeSlot?: string;
  notes?: string;
}

export interface StudyPlan {
  id: string;
  userId: string;
  subject: string;
  targetExam: string;
  examDate: string;
  dailyHours: number;
  currentLevel: string;
  totalDays: number;
  items: StudyPlanItem[];
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  whatsappNumber: string;
  reminderText: string;
  targetTime: string; // e.g. "19:00"
  frequency: 'daily' | 'once' | 'weekly';
  subject?: string;
  timezone: string;
  status: 'active' | 'sent' | 'paused';
  createdAt: string;
  type?: 'exam' | 'daily_session' | 'custom';
  examTitle?: string;
  examDate?: string;
  daysBeforeExam?: number;
}

export interface MessageRecord {
  id: string;
  userId: string;
  whatsappNumber: string;
  direction: 'incoming' | 'outgoing';
  messageType: 'text' | 'image' | 'interactive' | 'audio' | 'document';
  content: string;
  mediaUrl?: string;
  timestamp: string;
  intent?: string;
  agentName?: string;
  tokensUsed?: number;
  rawPayload?: any;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  deliveryError?: string;
}

export interface WhatsAppLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category:
    | 'webhook_verification'
    | 'incoming_message'
    | 'outgoing_message'
    | 'status_receipt'
    | 'media_download'
    | 'delivery_failure'
    | 'api_error';
  message: string;
  phone?: string;
  messageId?: string;
  httpStatus?: number;
  metaErrorCode?: number | string;
  details?: any;
  remediation?: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  subject: string;
  category: string;
  originalFilename: string;
  fileSizeKb: number;
  uploadedAt: string;
  chunkCount: number;
  summary: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  subject: string;
  chunkIndex: number;
  content: string;
  keywords: string[];
}

export interface Recommendation {
  id: string;
  userId: string;
  title: string;
  subject: string;
  topic: string;
  reason: string;
  actionType: 'revision' | 'practice' | 'concept' | 'quiz';
  priority: 'high' | 'medium' | 'low';
  isCompleted: boolean;
  createdAt: string;
}
