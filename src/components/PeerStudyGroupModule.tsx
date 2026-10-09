import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  FileText,
  Plus,
  Send,
  Sparkles,
  CheckCircle2,
  Radio,
  BookOpen,
  Share2,
  Pin,
  Save,
  Headphones,
  PhoneCall,
  PhoneOff,
  Award,
  Layers,
  Filter,
  Check,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { doc, setDoc } from 'firebase/firestore';

interface PeerStudyGroupModuleProps {
  profile: StudentProfile;
  onProfileUpdate?: (updated: StudentProfile) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  onLogStudyMinutes?: (mins: number, label?: string) => void;
}

interface PeerRoomResource {
  id: string;
  title: string;
  subject: string;
  type: 'rag_doc' | 'cheatsheet' | 'code_template';
  summary: string;
  pinnedBy: string;
  pinnedAt: string;
}

interface PeerRoomParticipant {
  userId: string;
  name: string;
  avatarInitials: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  inVoiceChannel: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  role: 'host' | 'peer_mentor' | 'member';
}

interface PeerStudyRoomState {
  id: string;
  name: string;
  subject: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  topic: string;
  description: string;
  whatsappRoomCode: string;
  sharedDocumentTitle: string;
  sharedDocumentContent: string;
  lastEditedBy: string;
  lastEditedAt: string;
  pinnedResources: PeerRoomResource[];
  participants: PeerRoomParticipant[];
  voiceTranscriptNotes: {
    id: string;
    speakerName: string;
    text: string;
    timestamp: string;
  }[];
  chatMessages: {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: string;
    type: 'chat' | 'doc_update' | 'voice_note';
  }[];
}

export const PeerStudyGroupModule: React.FC<PeerStudyGroupModuleProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onLogStudyMinutes,
}) => {
  const [rooms, setRooms] = useState<PeerStudyRoomState[]>([]);
  const [ragDocs, setRagDocs] = useState<{ id: string; title: string; subject: string; summary: string }[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('room_dsa_inter');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [skillFilter, setSkillFilter] = useState<string>('all');
  const [matchMyProfileOnly, setMatchMyProfileOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Voice Chat State
  const [inVoiceChat, setInVoiceChat] = useState<boolean>(true);
  const [micMuted, setMicMuted] = useState<boolean>(false);
  const [speakerAudioOn, setSpeakerAudioOn] = useState<boolean>(true);
  const [isDictatingVoiceNote, setIsDictatingVoiceNote] = useState<boolean>(false);
  const [voiceInputText, setVoiceInputText] = useState<string>('');
  const [isSendingVoice, setIsSendingVoice] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Shared Document Editor State
  const [docContentDraft, setDocContentDraft] = useState<string>('');
  const [docTitleDraft, setDocTitleDraft] = useState<string>('');
  const [isSavingDoc, setIsSavingDoc] = useState<boolean>(false);
  const [selectedRagDocToPin, setSelectedRagDocToPin] = useState<string>('');
  const [roomToast, setRoomToast] = useState<string | null>(null);

  // Create New Study Room Modal State
  const [showCreateRoom, setShowCreateRoom] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>('');
  const [newRoomSubject, setNewRoomSubject] = useState<string>(profile.subjects?.[0] || 'DSA');
  const [newRoomSkill, setNewRoomSkill] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>(
    profile.currentSkillLevel || 'intermediate'
  );
  const [newRoomTopic, setNewRoomTopic] = useState<string>(
    profile.weakTopics?.[0] || 'Dynamic Programming & Graph Traversal'
  );

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/peer-study-rooms');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rooms) && data.rooms.length > 0) {
          setRooms(data.rooms);
        }
        if (Array.isArray(data.ragDocs)) {
          setRagDocs(data.ragDocs);
        }
      }
    } catch (err) {
      console.warn('Error fetching peer study rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (subjectFilter !== 'all' && r.subject.toLowerCase() !== subjectFilter.toLowerCase()) {
        return false;
      }
      if (skillFilter !== 'all' && r.skillLevel !== skillFilter) {
        return false;
      }
      if (matchMyProfileOnly) {
        const subjectMatches = (profile.subjects || []).some(
          (s) => s.toLowerCase() === r.subject.toLowerCase()
        );
        const skillMatches = r.skillLevel === profile.currentSkillLevel;
        return subjectMatches || skillMatches;
      }
      return true;
    });
  }, [rooms, subjectFilter, skillFilter, matchMyProfileOnly, profile.subjects, profile.currentSkillLevel]);

  const activeRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || filteredRooms[0] || rooms[0],
    [rooms, selectedRoomId, filteredRooms]
  );

  useEffect(() => {
    if (activeRoom) {
      setDocContentDraft(activeRoom.sharedDocumentContent);
      setDocTitleDraft(activeRoom.sharedDocumentTitle);
    }
  }, [activeRoom?.id, activeRoom?.sharedDocumentContent, activeRoom?.sharedDocumentTitle]);

  const speakPeerVoice = (text: string) => {
    if (!speakerAudioOn || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.03;
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  const handleJoinRoomAndVoice = async (roomId: string, joinVoice = true) => {
    setSelectedRoomId(roomId);
    setInVoiceChat(joinVoice);
    try {
      const res = await fetch(`/api/peer-study-rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          userName: profile.name,
          skillLevel: profile.currentSkillLevel,
          joinVoice,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rooms)) {
          setRooms(data.rooms);
        }
        const joinedIds = Array.from(new Set([...(profile.joinedPeerRoomIds || []), roomId]));
        if (onProfileUpdate) {
          onProfileUpdate({ ...profile, joinedPeerRoomIds: joinedIds });
        }
        try {
          await setDoc(
            doc(db, 'peer_study_rooms', roomId),
            {
              id: data.room.id,
              name: data.room.name,
              subject: data.room.subject,
              skillLevel: data.room.skillLevel,
              topic: data.room.topic,
              sharedNoteContent: data.room.sharedDocumentContent.slice(0, 4900),
              activeVoiceCount: data.room.participants.filter((p: any) => p.inVoiceChannel).length,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.WRITE, `peer_study_rooms/${roomId}`);
        }
        setRoomToast(
          `🎙️ Connected to "${data.room?.name}" (${data.room?.subject} • ${data.room?.skillLevel.toUpperCase()}) with Shared Document & Voice Chat!`
        );
        setTimeout(() => setRoomToast(null), 4000);
      }
    } catch (err) {
      console.warn('Failed to join peer study room:', err);
    }
  };

  const handleSaveSharedDocument = async () => {
    if (!activeRoom) return;
    setIsSavingDoc(true);
    try {
      const res = await fetch(`/api/peer-study-rooms/${activeRoom.id}/document`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitleDraft,
          content: docContentDraft,
          userName: profile.name,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rooms)) {
          setRooms(data.rooms);
        }
        if (onLogStudyMinutes) {
          onLogStudyMinutes(10, `Shared Document Collaboration: ${activeRoom.name}`);
        }
        try {
          await setDoc(
            doc(db, 'peer_study_rooms', activeRoom.id),
            {
              id: activeRoom.id,
              name: activeRoom.name,
              subject: activeRoom.subject,
              skillLevel: activeRoom.skillLevel,
              topic: activeRoom.topic,
              sharedNoteContent: docContentDraft.slice(0, 4900),
              activeVoiceCount: activeRoom.participants.filter((p) => p.inVoiceChannel).length,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.WRITE, `peer_study_rooms/${activeRoom.id}`);
        }
        setRoomToast(`✅ Shared Document synced for all peers in "${activeRoom.name}"!`);
        setTimeout(() => setRoomToast(null), 3500);
      }
    } catch (err) {
      console.warn('Error saving shared document:', err);
    } finally {
      setIsSavingDoc(false);
    }
  };

  const handlePinRagDocToRoom = async () => {
    if (!activeRoom || !selectedRagDocToPin) return;
    const foundDoc = ragDocs.find((d) => d.id === selectedRagDocToPin);
    if (!foundDoc) return;

    try {
      const res = await fetch(`/api/peer-study-rooms/${activeRoom.id}/document`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: profile.name,
          pinResource: {
            id: foundDoc.id,
            title: foundDoc.title,
            subject: foundDoc.subject,
            type: 'rag_doc',
            summary: foundDoc.summary,
          },
          content:
            docContentDraft +
            `\n\n## 📌 Pinned Course Document: ${foundDoc.title} (${foundDoc.subject})\n> ${foundDoc.summary}\n`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rooms)) {
          setRooms(data.rooms);
        }
        setSelectedRagDocToPin('');
        setRoomToast(`📌 Pinned "${foundDoc.title}" to shared room documents!`);
        setTimeout(() => setRoomToast(null), 3500);
      }
    } catch {}
  };

  const handleStartVoiceDictation = () => {
    if (isDictatingVoiceNote) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsDictatingVoiceNote(false);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceInputText(
        `Let's trace the base case and time complexity for ${activeRoom?.topic || 'this problem'} on our shared document.`
      );
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'en-IN';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onstart = () => setIsDictatingVoiceNote(true);
      rec.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setVoiceInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      rec.onerror = () => setIsDictatingVoiceNote(false);
      rec.onend = () => setIsDictatingVoiceNote(false);
      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsDictatingVoiceNote(false);
    }
  };

  const handleBroadcastVoiceNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !voiceInputText.trim()) return;
    setIsSendingVoice(true);

    try {
      const res = await fetch(`/api/peer-study-rooms/${activeRoom.id}/voice-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          userName: profile.name,
          transcript: voiceInputText.trim(),
          appendToDoc: true,
          askAiPeerFacilitator: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rooms)) {
          setRooms(data.rooms);
        }
        setVoiceInputText('');
        if (data.facilitatorReply && speakerAudioOn) {
          speakPeerVoice(data.facilitatorReply);
        }
        if (onLogStudyMinutes) {
          onLogStudyMinutes(5, `Peer Voice Study Session (${activeRoom.subject})`);
        }
      }
    } catch (err) {
      console.warn('Error broadcasting voice note:', err);
    } finally {
      setIsSendingVoice(false);
    }
  };

  const handleCreateNewRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      const res = await fetch('/api/peer-study-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName.trim(),
          subject: newRoomSubject,
          skillLevel: newRoomSkill,
          topic: newRoomTopic.trim(),
          userId: profile.userId,
          userName: profile.name,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rooms)) {
          setRooms(data.rooms);
        }
        if (data.room) {
          setSelectedRoomId(data.room.id);
        }
        setShowCreateRoom(false);
        setNewRoomName('');
        setRoomToast(`🎉 Virtual Study Room "${data.room.name}" created with Shared Doc & Voice Chat!`);
        setTimeout(() => setRoomToast(null), 4000);
      }
    } catch {}
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 bg-indigo-500/15 border border-indigo-500/40 rounded-2xl text-indigo-400 shrink-0">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-400">
                Virtual Peer Study Rooms
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>Live Voice Chat + Shared Document Co-Editing</span>
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-1">
              Peer Study Group & Virtual Rooms Hub
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Find and join virtual study rooms matched to your subjects ({(profile.subjects || ['Python', 'DSA']).join(', ')}) and skill level (<strong className="text-emerald-300 capitalize">{profile.currentSkillLevel}</strong>), co-edit shared study documents in real time, and collaborate over live voice chat.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMatchMyProfileOnly(!matchMyProfileOnly)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center space-x-1.5 cursor-pointer ${
              matchMyProfileOnly
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/25'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Match My Skill & Subjects ({profile.currentSkillLevel})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateRoom(!showCreateRoom)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/25 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Study Room</span>
          </button>
        </div>
      </div>

      {roomToast && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl px-4 py-3 text-xs text-emerald-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{roomToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setRoomToast(null)}
            className="text-[11px] text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create New Virtual Room Drawer */}
      {showCreateRoom && (
        <form
          onSubmit={handleCreateNewRoom}
          className="bg-slate-950 border border-indigo-500/40 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Room Name (e.g., Graph Algorithms Sprint)"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            required
          />
          <select
            value={newRoomSubject}
            onChange={(e) => setNewRoomSubject(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            {Array.from(new Set([...(profile.subjects || []), 'DSA', 'Python', 'Calculus', 'Java'])).map(
              (sub) => (
                <option key={sub} value={sub}>
                  Subject: {sub}
                </option>
              )
            )}
          </select>
          <select
            value={newRoomSkill}
            onChange={(e: any) => setNewRoomSkill(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="beginner">Skill: Beginner</option>
            <option value="intermediate">Skill: Intermediate</option>
            <option value="advanced">Skill: Advanced</option>
            <option value="expert">Skill: Expert</option>
          </select>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newRoomTopic}
              onChange={(e) => setNewRoomTopic(e.target.value)}
              placeholder="Focus Topic"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 cursor-pointer"
            >
              Launch
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar: Subject & Skill Level */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span>Subject:</span>
          </span>
          {['all', 'DSA', 'Python', 'Calculus', 'Java'].map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSubjectFilter(sub)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                subjectFilter === sub
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {sub === 'all' ? 'All Subjects' : sub}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Skill Level:</span>
          {['all', 'beginner', 'intermediate', 'advanced'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSkillFilter(lvl)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                skillFilter === lvl
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {lvl === 'all' ? 'All Levels' : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Main 12-Col Grid: Room Selector + Voice Lounge on Left, Shared Document & Pinned RAG Docs on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Columns: Study Rooms List + Live Voice Channel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Virtual Study Rooms ({filteredRooms.length})
            </div>
            <div className="space-y-2.5">
              {filteredRooms.map((room) => {
                const isSelected = activeRoom?.id === room.id;
                const isRecommended =
                  room.skillLevel === profile.currentSkillLevel ||
                  (profile.subjects || []).some(
                    (s) => s.toLowerCase() === room.subject.toLowerCase()
                  );
                const voiceCount = room.participants.filter((p) => p.inVoiceChannel).length;

                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`p-4 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border-indigo-500/60 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {room.subject}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {room.skillLevel}
                          </span>
                          {isRecommended && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Matched for You
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1.5">{room.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{room.topic}</p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinRoomAndVoice(room.id, true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 cursor-pointer"
                      >
                        Join Room
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                        <Mic className="w-3.5 h-3.5" />
                        <span>{voiceCount} in Voice Chat</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{room.pinnedResources.length + 1} Shared Docs</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Voice Chat Channel Panel */}
          {activeRoom && (
            <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-4 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`p-2 rounded-xl ${
                      inVoiceChat
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white flex items-center space-x-1.5">
                      <span>Voice Chat Channel</span>
                      {inVoiceChat && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {inVoiceChat ? `Connected • ${activeRoom.name}` : 'Voice Disconnected'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setMicMuted(!micMuted)}
                    className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                      micMuted
                        ? 'bg-red-500/20 border-red-500/40 text-red-300'
                        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    }`}
                    title={micMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                  >
                    {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpeakerAudioOn(!speakerAudioOn)}
                    className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                      speakerAudioOn
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                    title="Toggle Peer Voice Audio Output"
                  >
                    {speakerAudioOn ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInVoiceChat(!inVoiceChat)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      inVoiceChat
                        ? 'bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {inVoiceChat ? 'Leave Voice' : 'Join Voice'}
                  </button>
                </div>
              </div>

              {/* Active Voice Participants Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeRoom.participants.map((p) => (
                  <div
                    key={p.userId}
                    onClick={() =>
                      speakPeerVoice(
                        `Hi ${profile.name}, this is ${p.name}. Let's review ${activeRoom.topic} on our shared document.`
                      )
                    }
                    className={`p-2.5 rounded-xl border flex items-center space-x-2 cursor-pointer transition ${
                      p.isSpeaking && inVoiceChat
                        ? 'bg-emerald-950/50 border-emerald-500/50'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                    title="Click to hear peer audio summary"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-xs font-black text-indigo-300 shrink-0">
                      {p.avatarInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{p.name}</div>
                      <div className="text-[10px] text-emerald-400 capitalize">{p.skillLevel}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Speak / Dictate to Voice Channel & Auto-Sync to Shared Doc */}
              <form onSubmit={handleBroadcastVoiceNote} className="space-y-2 pt-1">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleStartVoiceDictation}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                      isDictatingVoiceNote
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{isDictatingVoiceNote ? 'Listening...' : 'Push-to-Talk'}</span>
                  </button>
                  <input
                    type="text"
                    value={voiceInputText}
                    onChange={(e) => setVoiceInputText(e.target.value)}
                    placeholder="Speak or type voice note to room & shared doc..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isSendingVoice || !voiceInputText.trim()}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Live Voice Transcript Feed */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {activeRoom.voiceTranscriptNotes.slice(0, 4).map((vt) => (
                  <div
                    key={vt.id}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-start justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-emerald-400">{vt.speakerName}: </span>
                      <span className="text-slate-200">{vt.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakPeerVoice(vt.text)}
                      className="text-slate-400 hover:text-white shrink-0"
                      title="Play voice note"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 7 Columns: Real-Time Shared Document Access & Pinned Course Materials */}
        {activeRoom && (
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                      Real-Time Shared Study Document
                    </span>
                  </div>
                  <input
                    type="text"
                    value={docTitleDraft}
                    onChange={(e) => setDocTitleDraft(e.target.value)}
                    className="text-base font-black text-white bg-transparent border-b border-transparent focus:border-emerald-500 focus:outline-none mt-0.5 w-full"
                  />
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Last updated by <strong className="text-slate-200">{activeRoom.lastEditedBy}</strong>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSaveSharedDocument}
                    disabled={isSavingDoc}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingDoc ? 'Syncing...' : 'Sync Shared Doc'}</span>
                  </button>
                </div>
              </div>

              {/* Collaborative Markdown / Code Canvas */}
              <textarea
                rows={12}
                value={docContentDraft}
                onChange={(e) => setDocContentDraft(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 leading-relaxed"
              />

              {/* Pin Verified RAG Course Document into Room */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Pin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Shared Course Documents & Pinned Cheat-Sheets ({activeRoom.pinnedResources.length})</span>
                  </span>

                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedRagDocToPin}
                      onChange={(e) => setSelectedRagDocToPin(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">+ Pin Course Document to Room...</option>
                      {ragDocs.map((d) => (
                        <option key={d.id} value={d.id}>
                          [{d.subject}] {d.title}
                        </option>
                      ))}
                    </select>
                    {selectedRagDocToPin && (
                      <button
                        type="button"
                        onClick={handlePinRagDocToRoom}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        Pin & Insert
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {activeRoom.pinnedResources.map((res) => (
                    <div
                      key={res.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{res.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-semibold">
                          {res.subject}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{res.summary}</p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                        <span>Pinned by {res.pinnedBy}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDocContentDraft(
                              (prev) =>
                                `${prev}\n\n### Reference: ${res.title}\n- ${res.summary}`
                            )
                          }
                          className="text-emerald-400 hover:underline font-semibold cursor-pointer"
                        >
                          Insert into Editor
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
