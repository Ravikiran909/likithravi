import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { WhatsAppSimulator } from './components/WhatsAppSimulator.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { VoiceAIAgent } from './components/VoiceAIAgent.tsx';
import { StudyDocuments } from './components/StudyDocuments.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { AppLockOverlay } from './components/AppLockOverlay.tsx';
import { SecurityPrivacyHubModal } from './components/SecurityPrivacyHubModal.tsx';
import { StudentLoginDashboard } from './components/StudentLoginDashboard.tsx';
import { saveOfflineDocuments, saveOfflineProfile } from './utils/offlineDb.ts';
import { StudentProfile } from './types/index.ts';
import { GraduationCap, LogOut } from 'lucide-react';
import {
  db,
  doc,
  setDoc,
  getDoc,
  testConnection,
  auth,
  onAuthStateChanged,
  signOutUser,
} from './firebase.ts';

const normalizeStudentProfile = (
  raw: Partial<StudentProfile> | null | undefined,
  fallback?: StudentProfile | null
): StudentProfile => {
  const base = fallback || ({} as Partial<StudentProfile>);
  const userId = raw?.userId || base.userId || 'usr_aspirant';
  return {
    ...base,
    ...(raw || {}),
    id: raw?.id || base.id || `prof_${userId}`,
    userId,
    name: raw?.name || base.name || 'Active Learner',
    whatsappNumber: raw?.whatsappNumber || base.whatsappNumber || '+91 98450 11223',
    preferredLanguage: raw?.preferredLanguage || base.preferredLanguage || 'en',
    educationLevel: raw?.educationLevel || base.educationLevel || 'college_university',
    subjects:
      Array.isArray(raw?.subjects) && raw.subjects.length > 0
        ? raw.subjects
        : Array.isArray(base.subjects) && base.subjects.length > 0
        ? base.subjects
        : ['Mathematics', 'Programming', 'App Development', 'Science', 'English'],
    currentSkillLevel: raw?.currentSkillLevel || base.currentSkillLevel || 'intermediate',
    learningGoals:
      Array.isArray(raw?.learningGoals) && raw.learningGoals.length > 0
        ? raw.learningGoals
        : Array.isArray(base.learningGoals) && base.learningGoals.length > 0
        ? base.learningGoals
        : ['Master Full-Stack Development', 'Excel in Academic Semester Exams', 'Build Real-World Projects'],
    weakTopics: Array.isArray(raw?.weakTopics)
      ? raw.weakTopics
      : Array.isArray(base.weakTopics)
      ? base.weakTopics
      : ['Data Structures & Algorithms', 'Engineering Mathematics', 'Technical Writing'],
    strongTopics: Array.isArray(raw?.strongTopics)
      ? raw.strongTopics
      : Array.isArray(base.strongTopics)
      ? base.strongTopics
      : ['Logical Reasoning', 'Creative Writing', 'Modern History'],
    studyHoursPerDay:
      typeof raw?.studyHoursPerDay === 'number' && raw.studyHoursPerDay > 0
        ? raw.studyHoursPerDay
        : typeof base.studyHoursPerDay === 'number' && base.studyHoursPerDay > 0
        ? base.studyHoursPerDay
        : 2,
    preferredStudyTime: raw?.preferredStudyTime || base.preferredStudyTime || '7:00 PM',
    dailyReminderEnabled:
      raw?.dailyReminderEnabled !== undefined
        ? Boolean(raw.dailyReminderEnabled)
        : base.dailyReminderEnabled !== undefined
        ? Boolean(base.dailyReminderEnabled)
        : true,
    examDates: Array.isArray(raw?.examDates)
      ? raw.examDates
      : Array.isArray(base.examDates)
      ? base.examDates
      : [],
    learningHistory: Array.isArray(raw?.learningHistory)
      ? raw.learningHistory
      : Array.isArray(base.learningHistory)
      ? base.learningHistory
      : [],
    streak:
      typeof raw?.streak === 'number'
        ? raw.streak
        : typeof base.streak === 'number'
        ? base.streak
        : 1,
    lastActiveDate:
      raw?.lastActiveDate || base.lastActiveDate || new Date().toISOString().split('T')[0],
    overallProgress:
      typeof raw?.overallProgress === 'number'
        ? raw.overallProgress
        : typeof base.overallProgress === 'number'
        ? base.overallProgress
        : 65,
    totalSessions:
      typeof raw?.totalSessions === 'number'
        ? raw.totalSessions
        : typeof base.totalSessions === 'number'
        ? base.totalSessions
        : 1,
    totalQuestionsAnswered:
      typeof raw?.totalQuestionsAnswered === 'number'
        ? raw.totalQuestionsAnswered
        : typeof base.totalQuestionsAnswered === 'number'
        ? base.totalQuestionsAnswered
        : 10,
    correctAnswers:
      typeof raw?.correctAnswers === 'number'
        ? raw.correctAnswers
        : typeof base.correctAnswers === 'number'
        ? base.correctAnswers
        : 8,
    completedSyllabusTopics: Array.isArray(raw?.completedSyllabusTopics)
      ? raw.completedSyllabusTopics
      : Array.isArray(base.completedSyllabusTopics)
      ? base.completedSyllabusTopics
      : [],
  };
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'voice' | 'documents' | 'student' | 'admin'>('student');
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | undefined>(undefined);
  const [selectedProfile, setSelectedProfile] = useState<StudentProfile>(
    normalizeStudentProfile(null)
  );
  const [isWhatsAppConfigured, setIsWhatsAppConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [isSecurityHubOpen, setIsSecurityHubOpen] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [isEntryComplete, setIsEntryComplete] = useState<boolean>(() => {
    return localStorage.getItem('entry_complete') === 'true';
  });
  const [authLoading, setAuthLoading] = useState(true);

  // Connection check on boot
  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await testConnection();
      setIsFirebaseConnected(isConnected);
    };
    checkConnection();
  }, []);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      
      if (firebaseUser) {
        setIsEntryComplete(true);
        localStorage.setItem('entry_complete', 'true');
        
        try {
          // Sync/Load Profile for this UID
          const docSnap = await getDoc(doc(db, 'profiles', firebaseUser.uid));
          if (docSnap.exists()) {
            setSelectedProfile(normalizeStudentProfile(docSnap.data() as StudentProfile));
          } else {
            // Create initial profile for new user
            const newProfile = normalizeStudentProfile({
              userId: firebaseUser.uid,
              name: firebaseUser.displayName || 'Student',
            });
            setSelectedProfile(newProfile);
            await setDoc(doc(db, 'profiles', firebaseUser.uid), newProfile);
          }
        } catch (err) {
          console.warn('Profile fetch failed (offline or reachability issue):', err);
          // Fallback to local profile if available
          const savedProfile = localStorage.getItem(`profile_${firebaseUser.uid}`);
          if (savedProfile) {
            try {
              setSelectedProfile(normalizeStudentProfile(JSON.parse(savedProfile)));
            } catch {
              setSelectedProfile(normalizeStudentProfile({ userId: firebaseUser.uid }));
            }
          } else {
            setSelectedProfile(normalizeStudentProfile({ userId: firebaseUser.uid }));
          }
          setIsFirebaseConnected(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Initialize Guest Profile if not logged in
  useEffect(() => {
    if (authLoading || user) return;

    const savedGuestId = localStorage.getItem('guest_user_id');
    const guestId = savedGuestId || `guest_${Math.random().toString(36).substring(2, 11)}`;
    if (!savedGuestId) {
      localStorage.setItem('guest_user_id', guestId);
    }

    const savedProfile = localStorage.getItem(`profile_${guestId}`);
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setSelectedProfile(normalizeStudentProfile(parsed));
      } catch {
        setSelectedProfile(normalizeStudentProfile({ userId: guestId }));
      }
    } else {
      setSelectedProfile(normalizeStudentProfile({ userId: guestId }));
    }
    
    fetchInitialData();
  }, [authLoading, user]);

  const handleLogout = async () => {
    await signOutUser();
    setIsEntryComplete(false);
    localStorage.removeItem('entry_complete');
    window.location.reload();
  };

  const handleEnterAsGuest = () => {
    setIsEntryComplete(true);
    localStorage.setItem('entry_complete', 'true');
  };

  const handleToggleFocusMode = async (nextState?: boolean) => {
    const target = nextState !== undefined ? nextState : !focusMode;
    setFocusMode(target);
    if (target && activeTab !== 'student') {
      setActiveTab('student');
    }
    if (selectedProfile) {
      const updated = { ...selectedProfile, deepFocusEnabled: target };
      handleProfileUpdate(updated);
      try {
        await fetch(`/api/students/${selectedProfile.userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deepFocusEnabled: target }),
        });
      } catch {}
    }
  };

  useEffect(() => {
    if (selectedProfile?.deepFocusEnabled !== undefined) {
      setFocusMode(Boolean(selectedProfile.deepFocusEnabled));
    }
  }, [selectedProfile?.userId, selectedProfile?.deepFocusEnabled]);

  const fetchInitialData = async () => {
    try {
      const waRes = await fetch('/api/whatsapp/config');

      // Pre-cache learning materials in IndexedDB for offline rural use
      Promise.all([
        fetch('/api/documents').then((r) => (r.ok ? r.json() : null)),
      ])
        .then(([docsData]) => {
          if (docsData?.documents) saveOfflineDocuments(docsData.documents);
        })
        .catch(() => {});

      if (waRes.ok) {
        const waData = await waRes.json();
        setIsWhatsAppConfigured(waData.isConfigured);
      }
    } catch (err) {
      console.error('Failed to load initial data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updated: StudentProfile) => {
    const cleanProfile = normalizeStudentProfile(updated, selectedProfile);
    if (selectedProfile?.userId === cleanProfile.userId) {
      setSelectedProfile(cleanProfile);
    }

    // Persist to localStorage for Guest mode
    if (cleanProfile.userId) {
      localStorage.setItem(`profile_${cleanProfile.userId}`, JSON.stringify(cleanProfile));
    }

    // Persist to Firestore database if connected
    if (db && cleanProfile.userId) {
      try {
        const sanitizedPayload = JSON.parse(
          JSON.stringify({
            ...cleanProfile,
            userId: cleanProfile.userId,
            name: cleanProfile.name || 'Student',
            preferredLanguage: cleanProfile.preferredLanguage || 'en',
          })
        );
        await setDoc(doc(db, 'profiles', cleanProfile.userId), sanitizedPayload, {
          merge: true,
        });
      } catch (err) {
        console.warn('Failed to sync updated profile to Firestore:', err);
      }
    }

    try {
      await fetch(`/api/students/${cleanProfile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanProfile),
      });
    } catch {}
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Initializing Prep Command Center...</p>
        </div>
      </div>
    );
  }

  if (!isEntryComplete && !user) {
    return (
      <StudentLoginDashboard 
        onEnterAsGuest={handleEnterAsGuest}
        onLoginSuccess={() => {
          setIsEntryComplete(true);
          localStorage.setItem('entry_complete', 'true');
        }}
      />
    );
  }



  return (
    <div
      className={`min-h-screen text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200 transition-colors duration-500 ${
        focusMode ? 'bg-black' : 'bg-slate-950'
      }`}
    >
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedProfile={selectedProfile}
        isWhatsAppConfigured={isWhatsAppConfigured}
        isFirebaseConnected={isFirebaseConnected}
        focusMode={focusMode}
        onToggleFocusMode={handleToggleFocusMode}
        onOpenSecurityHub={() => setIsSecurityHubOpen(true)}
        onLockApp={() => setIsLocked(true)}
        onLogout={handleLogout}
        user={user}
      />

      <AppLockOverlay
        isLocked={isLocked}
        profile={selectedProfile}
        onUnlock={() => setIsLocked(false)}
      />

      <SecurityPrivacyHubModal
        isOpen={isSecurityHubOpen}
        onClose={() => setIsSecurityHubOpen(false)}
        profile={selectedProfile}
        onProfileUpdate={handleProfileUpdate}
        onLockApp={() => setIsLocked(true)}
      />

      {/* Ambient Focus Mode Dimming Vignette around the active study workspace */}
      {focusMode && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-30 shadow-[inset_0_0_120px_rgba(0,0,0,0.85)] border border-amber-500/10"
        />
      )}

      <main
        className={`flex-1 relative z-40 transition-all duration-500 ${
          focusMode && activeTab !== 'student' ? 'opacity-40 hover:opacity-95 filter brightness-75' : ''
        }`}
      >
        {activeTab === 'simulator' && (
          <WhatsAppSimulator
            selectedProfile={selectedProfile}
            onProfileUpdate={handleProfileUpdate}
            initialPrompt={pendingChatPrompt}
            onPromptHandled={() => setPendingChatPrompt(undefined)}
          />
        )}

        {activeTab === 'voice' && (
          <VoiceAIAgent
            profile={selectedProfile}
            onProfileUpdate={handleProfileUpdate}
            onNavigateToDocuments={() => setActiveTab('documents')}
          />
        )}

        {activeTab === 'documents' && (
          <StudyDocuments
            profile={selectedProfile}
            onNavigateToVoice={() => setActiveTab('voice')}
            onNavigateToChat={(text) => {
              if (text) setPendingChatPrompt(text);
              setActiveTab('simulator');
            }}
          />
        )}

        {activeTab === 'student' && (
          <StudentDashboard
            profile={selectedProfile}
            onProfileUpdate={handleProfileUpdate}
            onNavigateToChat={(text) => {
              if (text) setPendingChatPrompt(text);
              setActiveTab('simulator');
            }}
            focusMode={focusMode}
            onToggleFocusMode={handleToggleFocusMode}
          />
        )}

        {activeTab === 'admin' && <AdminDashboard />}
      </main>

      <footer
        className={`bg-slate-900 border-t border-slate-800 text-slate-400 py-4 px-4 text-center text-xs transition-opacity duration-500 ${
          focusMode ? 'opacity-25 hover:opacity-80' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Universal Learning Command Center • Personalized Academic, Technical & Competitive Exam Tutor
          </span>
          <span className="text-slate-500">
            Hardened Firestore Security • Gemini 3.8 Flash • Socratic Pedagogy
          </span>
        </div>
      </footer>
      <OfflineIndicator />
    </div>
  );
}

