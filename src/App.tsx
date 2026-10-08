import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { WhatsAppSimulator } from './components/WhatsAppSimulator.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { VoiceAIAgent } from './components/VoiceAIAgent.tsx';
import { StudyDocuments } from './components/StudyDocuments.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { FaceAuthLoginModal } from './components/FaceAuthLoginModal.tsx';
import { saveOfflineDocuments, saveOfflineCourses, saveOfflineProfile } from './utils/offlineDb.ts';
import { StudentProfile } from './types/index.ts';
import {
  auth,
  db,
  googleSignIn,
  logout,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  testConnection,
  FirebaseUser,
} from './firebase.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'voice' | 'documents' | 'student' | 'admin'>('simulator');
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | undefined>(undefined);
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<StudentProfile | null>(null);
  const [isWhatsAppConfigured, setIsWhatsAppConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [isFaceAuthModalOpen, setIsFaceAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (selectedProfile?.deepFocusEnabled !== undefined) {
      setFocusMode(Boolean(selectedProfile.deepFocusEnabled));
    }
  }, [selectedProfile?.userId, selectedProfile?.deepFocusEnabled]);

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
    testConnection().then((connected) => setIsFirebaseConnected(connected));
    fetchInitialData();
  }, []);

  // Listen to Firebase Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profileDocRef = doc(db, 'profiles', user.uid);
          const userDocRef = doc(db, 'users', user.uid);

          const snap = await getDoc(profileDocRef);
          let userProfile: StudentProfile;

          if (snap.exists()) {
            userProfile = snap.data() as StudentProfile;
          } else {
            // Create user account & profile in Firestore
            const initialUserData = {
              id: user.uid,
              name: user.displayName || 'Google Student',
              email: user.email || '',
              phone: user.phoneNumber || '+1' + Math.floor(1000000000 + Math.random() * 9000000000),
              role: 'student',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await setDoc(userDocRef, initialUserData);

            userProfile = {
              id: 'prof_' + user.uid,
              userId: user.uid,
              name: user.displayName || 'Google Student',
              whatsappNumber: initialUserData.phone,
              preferredLanguage: 'en',
              educationLevel: 'college',
              subjects: ['Python', 'DSA', 'Calculus', 'Machine Learning'],
              currentSkillLevel: 'intermediate',
              learningGoals: ['Master Programming & Algorithms', 'Ace Academic Exams with AI Tutor'],
              weakTopics: ['Calculus (Integration)', 'Recursion edge cases'],
              strongTopics: ['Python Basics', 'Control Flow'],
              studyHoursPerDay: 2,
              preferredStudyTime: '7:30 PM',
              dailyReminderEnabled: true,
              examDates: [],
              learningHistory: [],
              streak: 1,
              lastActiveDate: new Date().toISOString().split('T')[0],
              overallProgress: 65,
              totalSessions: 1,
              totalQuestionsAnswered: 10,
              correctAnswers: 8,
            };

            await setDoc(profileDocRef, userProfile);
          }

          // Sync profile to backend in-memory DB so all AI agents have the active student profile
          fetch(`/api/students/${userProfile.userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userProfile),
          }).catch(() => {});

          // Add to profiles state and select
          setProfiles((prev) => {
            const exists = prev.some((p) => p.userId === userProfile.userId);
            return exists ? prev.map((p) => (p.userId === userProfile.userId ? userProfile : p)) : [userProfile, ...prev];
          });
          setSelectedProfile(userProfile);
        } catch (err) {
          console.warn('Firestore user profile sync notice:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firestore updates if signed in
  useEffect(() => {
    if (!currentUser) return;
    const profileDocRef = doc(db, 'profiles', currentUser.uid);
    const unsub = onSnapshot(
      profileDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const remoteProfile = docSnap.data() as StudentProfile;
          setSelectedProfile(remoteProfile);
          setProfiles((prev) =>
            prev.map((p) => (p.userId === remoteProfile.userId ? remoteProfile : p))
          );
        }
      },
      (error) => {
        console.warn('Realtime profile sync fallback:', error);
      }
    );

    return () => unsub();
  }, [currentUser]);

  const fetchInitialData = async () => {
    try {
      const [studentsRes, waRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/whatsapp/config'),
      ]);

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setProfiles(data.profiles || []);
        if (data.profiles?.length > 0 && !selectedProfile) {
          setSelectedProfile(data.profiles[0]);
          saveOfflineProfile(data.profiles[0]);
        }
      }

      // Pre-cache learning materials in IndexedDB for offline rural use
      Promise.all([
        fetch('/api/documents').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/learning-resources').then((r) => (r.ok ? r.json() : null)),
      ])
        .then(([docsData, coursesData]) => {
          if (docsData?.documents) saveOfflineDocuments(docsData.documents);
          if (coursesData?.resources) saveOfflineCourses(coursesData.resources);
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
    setProfiles((prev) =>
      prev.map((p) => (p.userId === updated.userId ? updated : p))
    );
    if (selectedProfile?.userId === updated.userId) {
      setSelectedProfile(updated);
    }

    // Persist to Firestore database
    if (db && updated.userId) {
      try {
        await setDoc(
          doc(db, 'profiles', updated.userId),
          {
            ...updated,
            userId: updated.userId,
            name: updated.name || 'Student',
            preferredLanguage: updated.preferredLanguage || 'en',
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Failed to sync updated profile to Firestore:', err);
      }
    }
  };

  const handleSignInWithGoogle = async () => {
    try {
      await googleSignIn();
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      // Fallback to first seeded profile
      if (profiles.length > 0) {
        setSelectedProfile(profiles[0]);
      }
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  if (loading || !selectedProfile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Initializing WhatsApp AI Learning Agent...</p>
        </div>
      </div>
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
        profiles={profiles}
        selectedProfile={selectedProfile}
        onSelectProfile={(p) => setSelectedProfile(p)}
        isWhatsAppConfigured={isWhatsAppConfigured}
        currentUser={currentUser}
        onSignInWithGoogle={handleSignInWithGoogle}
        onSignOut={handleSignOut}
        isFirebaseConnected={isFirebaseConnected}
        focusMode={focusMode}
        onToggleFocusMode={handleToggleFocusMode}
        onOpenFaceAuth={() => setIsFaceAuthModalOpen(true)}
      />

      <FaceAuthLoginModal
        isOpen={isFaceAuthModalOpen}
        onClose={() => setIsFaceAuthModalOpen(false)}
        profiles={profiles}
        selectedProfile={selectedProfile}
        onFaceAuthSuccess={(authenticatedProfile) => {
          handleProfileUpdate(authenticatedProfile);
        }}
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
            onOpenFaceAuth={() => setIsFaceAuthModalOpen(true)}
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
            WhatsApp AI Learning Agent • Official WhatsApp Cloud API & Socratic Pedagogical Engine
          </span>
          <span className="text-slate-500">
            Powered by Google Gemini 3.8, Gemini 3.5 Transcribe & Firebase Firestore
          </span>
        </div>
      </footer>
      <OfflineIndicator />
    </div>
  );
}
