import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { WhatsAppSimulator } from './components/WhatsAppSimulator.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { VoiceAIAgent } from './components/VoiceAIAgent.tsx';
import { StudyDocuments } from './components/StudyDocuments.tsx';
import { StudentProfile } from './types/index.ts';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  testConnection,
  handleFirestoreError,
  OperationType,
  FirebaseUser,
} from './firebase.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'voice' | 'documents' | 'student' | 'admin'>('simulator');
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<StudentProfile | null>(null);
  const [isWhatsAppConfigured, setIsWhatsAppConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);

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
        }
      }

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

    // Persist to Firestore if user is authenticated
    if (currentUser && currentUser.uid === updated.userId) {
      try {
        await setDoc(doc(db, 'profiles', updated.userId), updated, { merge: true });
      } catch (err) {
        console.warn('Failed to sync updated profile to Firestore:', err);
      }
    }
  };

  const handleSignInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
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
      />

      <main className="flex-1">
        {activeTab === 'simulator' && (
          <WhatsAppSimulator
            selectedProfile={selectedProfile}
            onProfileUpdate={handleProfileUpdate}
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
              setActiveTab('simulator');
            }}
          />
        )}

        {activeTab === 'student' && (
          <StudentDashboard
            profile={selectedProfile}
            onProfileUpdate={handleProfileUpdate}
            onNavigateToChat={(text) => {
              setActiveTab('simulator');
            }}
          />
        )}

        {activeTab === 'admin' && <AdminDashboard />}
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-4 px-4 text-center text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            WhatsApp AI Learning Agent • Official WhatsApp Cloud API & Socratic Pedagogical Engine
          </span>
          <span className="text-slate-500">
            Powered by Google Gemini 3.8, Gemini 3.5 Transcribe & Firebase Firestore
          </span>
        </div>
      </footer>
    </div>
  );
}
