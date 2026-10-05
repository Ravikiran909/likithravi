import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  MessageSquare,
  Plus,
  Send,
  Share2,
  CheckCircle2,
  Sparkles,
  BookOpen,
  ThumbsUp,
  Radio,
  Hash,
  UserPlus,
  UserCheck,
  ExternalLink,
  HelpCircle,
  FileText,
  Lightbulb,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface StudyCirclesProps {
  profile: StudentProfile;
  onNavigateToChat?: (prefilledText?: string) => void;
  onLogStudyMinutes?: (mins: number, label?: string) => void;
}

interface StudyCircleMessage {
  id: string;
  circleId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'peer_mentor' | 'ai_moderator';
  content: string;
  tag?: 'question' | 'note' | 'resource' | 'solution';
  timestamp: string;
  whatsappBridged: boolean;
  upvotes: number;
}

interface StudyCircleMember {
  userId: string;
  name: string;
  avatarInitials: string;
  role: 'founder' | 'member' | 'mentor';
  whatsappSynced: boolean;
}

interface StudyCircleGroup {
  id: string;
  name: string;
  subject: string;
  topic: string;
  description: string;
  whatsappInviteCode: string;
  activeNowCount: number;
  createdAt: string;
  members: StudyCircleMember[];
  messages: StudyCircleMessage[];
}

export const StudyCircles: React.FC<StudyCirclesProps> = ({
  profile,
  onNavigateToChat,
  onLogStudyMinutes,
}) => {
  const [circles, setCircles] = useState<StudyCircleGroup[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<string>('circle_python_recursion');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // New message state
  const [messageInput, setMessageInput] = useState<string>('');
  const [messageTag, setMessageTag] = useState<'note' | 'question' | 'resource' | 'solution'>('note');
  const [forwardToWhatsApp, setForwardToWhatsApp] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [bridgeToast, setBridgeToast] = useState<string | null>(null);

  // Create new Study Circle modal/drawer state
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newCircleName, setNewCircleName] = useState<string>('');
  const [newCircleSubject, setNewCircleSubject] = useState<string>(profile.subjects[0] || 'Python');
  const [newCircleTopic, setNewCircleTopic] = useState<string>(
    profile.weakTopics?.[0] || 'Recursion & Dynamic Programming'
  );
  const [newCircleDesc, setNewCircleDesc] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  useEffect(() => {
    fetchStudyCircles();
  }, [profile.userId]);

  const fetchStudyCircles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/study-circles');
      if (res.ok) {
        const data = await res.json();
        if (data.circles && data.circles.length > 0) {
          setCircles(data.circles);
          if (!data.circles.some((c: StudyCircleGroup) => c.id === selectedCircleId)) {
            setSelectedCircleId(data.circles[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch study circles:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCircles = useMemo(() => {
    if (subjectFilter === 'all') return circles;
    return circles.filter((c) => c.subject.toLowerCase() === subjectFilter.toLowerCase());
  }, [circles, subjectFilter]);

  const activeCircle = useMemo(
    () => circles.find((c) => c.id === selectedCircleId) || circles[0],
    [circles, selectedCircleId]
  );

  const isMemberOfActive = useMemo(() => {
    if (!activeCircle) return false;
    return activeCircle.members.some((m) => m.userId === profile.userId);
  }, [activeCircle, profile.userId]);

  const handleToggleJoinCircle = async (circleId: string) => {
    try {
      const res = await fetch(`/api/study-circles/${circleId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          userName: profile.name,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCircles(data.circles || []);
        setBridgeToast(
          data.joined
            ? `✓ Joined "${data.circle.name}" & linked WhatsApp bridge (${data.circle.whatsappInviteCode})!`
            : `Left "${data.circle.name}".`
        );
        setTimeout(() => setBridgeToast(null), 4000);
      }
    } catch (err) {
      console.warn('Error toggling circle membership:', err);
    }
  };

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCircleName.trim() || !newCircleTopic.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/study-circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCircleName.trim(),
          subject: newCircleSubject,
          topic: newCircleTopic.trim(),
          description: newCircleDesc.trim(),
          userId: profile.userId,
          userName: profile.name,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCircles(data.circles || []);
        if (data.circle) {
          setSelectedCircleId(data.circle.id);
        }
        setShowCreateForm(false);
        setNewCircleName('');
        setNewCircleDesc('');
        setBridgeToast(
          `🎉 Created "${data.circle.name}"! Confirmation sent to WhatsApp (${profile.whatsappNumber}).`
        );
        setTimeout(() => setBridgeToast(null), 4500);
      }
    } catch (err) {
      console.warn('Failed to create study circle:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendCircleMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCircle || !messageInput.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/study-circles/${activeCircle.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          userName: profile.name,
          content: messageInput.trim(),
          tag: messageTag,
          forwardToWhatsApp,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCircles((prev) =>
          prev.map((c) => (c.id === activeCircle.id ? data.circle : c))
        );
        setMessageInput('');
        if (onLogStudyMinutes) {
          onLogStudyMinutes(5, `Peer Study Circle (${activeCircle.subject})`);
        }
        if (forwardToWhatsApp) {
          setBridgeToast(
            `📲 Message broadcasted to "${activeCircle.name}" & bridged to WhatsApp (${activeCircle.whatsappInviteCode})!`
          );
          setTimeout(() => setBridgeToast(null), 3500);
        }
      }
    } catch (err) {
      console.warn('Error posting message to Study Circle:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Peer-to-Peer Study Circles
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>WhatsApp Cloud Bridge Active</span>
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-white mt-0.5">
              Topic-Specific Peer Knowledge Sharing & WhatsApp Study Groups
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Join or create topic-focused study circles to exchange RAG summaries, code snippets, and exam strategies. Every circle is bridged with your WhatsApp learning companion ({profile.whatsappNumber}).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{showCreateForm ? 'Close Creator' : 'Create Study Circle'}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification for WhatsApp Bridge */}
      {bridgeToast && (
        <div className="relative z-10 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
          <span className="font-semibold">{bridgeToast}</span>
          <button
            type="button"
            onClick={() => setBridgeToast(null)}
            className="text-emerald-300 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Create New Study Circle Drawer */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateCircle}
          className="relative z-10 bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Create a New Topic-Specific Study Circle</span>
            </h4>
            <span className="text-[11px] text-emerald-400 font-mono">
              Auto-generates WhatsApp Invite Bridge Code
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Study Circle Name *
              </label>
              <input
                type="text"
                required
                value={newCircleName}
                onChange={(e) => setNewCircleName(e.target.value)}
                placeholder="e.g., System Design & Scalability Circle"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Subject *
              </label>
              <select
                value={newCircleSubject}
                onChange={(e) => setNewCircleSubject(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {Array.from(
                  new Set([...profile.subjects, 'Python', 'Calculus', 'DSA', 'Generative AI', 'Java'])
                ).map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Target Topic / Weak Area *
              </label>
              <input
                type="text"
                required
                value={newCircleTopic}
                onChange={(e) => setNewCircleTopic(e.target.value)}
                placeholder="e.g., Graph Shortest Paths"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <input
              type="text"
              value={newCircleDesc}
              onChange={(e) => setNewCircleDesc(e.target.value)}
              placeholder="Optional description: Goals, study schedule, or exam target..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer shrink-0"
            >
              {isCreating ? 'Launching Circle...' : 'Launch & Sync with WhatsApp'}
            </button>
          </div>
        </form>
      )}

      {/* Main Two-Column Layout: Circle Directory (Left) + Live Peer Group Chat (Right) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Topic-Specific Circles List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Topic Circles ({filteredCircles.length})
            </span>
            <div className="flex items-center space-x-1">
              {['all', 'Python', 'Calculus', 'DSA'].map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSubjectFilter(sub)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    subjectFilter === sub
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  {sub === 'all' ? 'All' : sub}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredCircles.map((circle) => {
              const isSelected = activeCircle?.id === circle.id;
              const isJoined = circle.members.some((m) => m.userId === profile.userId);
              return (
                <div
                  key={circle.id}
                  onClick={() => setSelectedCircleId(circle.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-slate-950 border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                          {circle.subject}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400">
                          #{circle.whatsappInviteCode}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1 leading-snug">
                        {circle.name}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleJoinCircle(circle.id);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition flex items-center space-x-1 shrink-0 cursor-pointer ${
                        isJoined
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      }`}
                    >
                      {isJoined ? (
                        <>
                          <UserCheck className="w-3 h-3" />
                          <span>Joined</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          <span>Join Circle</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2">{circle.description}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/70">
                    <span className="text-amber-300 font-medium truncate max-w-[180px]">
                      🎯 {circle.topic}
                    </span>
                    <span className="flex items-center space-x-2 shrink-0">
                      <span>{circle.members.length} peers</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">
                        {circle.messages.length} notes
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Study Circle Peer Chat & WhatsApp Bridge */}
        <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between min-h-[460px]">
          {activeCircle ? (
            <>
              {/* Circle Chat Header */}
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <Hash className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-black text-white">{activeCircle.name}</h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>Topic: <strong className="text-slate-200">{activeCircle.topic}</strong></span>
                    <span>•</span>
                    <span className="text-emerald-400 font-mono">
                      WhatsApp Bridge: {activeCircle.whatsappInviteCode}
                    </span>
                  </div>
                </div>

                {onNavigateToChat && (
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateToChat(
                        `👥 [Study Circle ${activeCircle.whatsappInviteCode}] Let's practice ${activeCircle.topic} in ${activeCircle.subject} with my study circle!`
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in WhatsApp Simulator</span>
                  </button>
                )}
              </div>

              {/* Messages Feed */}
              <div className="flex-1 my-3 space-y-3 max-h-[290px] overflow-y-auto pr-1">
                {activeCircle.messages.map((msg) => {
                  const isMine = msg.senderId === profile.userId;
                  return (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-2xl border ${
                        isMine
                          ? 'bg-emerald-950/30 border-emerald-500/40 ml-6'
                          : msg.senderRole === 'peer_mentor'
                          ? 'bg-indigo-950/30 border-indigo-500/40 mr-4'
                          : 'bg-slate-900/90 border-slate-800 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{msg.senderName}</span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                              msg.tag === 'question'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : msg.tag === 'solution'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}
                          >
                            {msg.tag || 'note'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {msg.whatsappBridged ? '📲 Synced with WhatsApp' : 'Web Only'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 mt-1.5 whitespace-pre-line leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Compose Peer Note / Question with WhatsApp Bridge Toggle */}
              <form onSubmit={handleSendCircleMessage} className="pt-3 border-t border-slate-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] text-slate-400 font-semibold">Post Type:</span>
                    {(['note', 'question', 'solution', 'resource'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMessageTag(t)}
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                          messageTag === t
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center space-x-1.5 text-[11px] text-emerald-400 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forwardToWhatsApp}
                      onChange={(e) => setForwardToWhatsApp(e.target.checked)}
                      className="accent-emerald-500 rounded cursor-pointer"
                    />
                    <span>Bridge to WhatsApp ({profile.whatsappNumber})</span>
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={`Share a note or ask a question in ${activeCircle.name}...`}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !messageInput.trim()}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSending ? 'Sending...' : 'Post to Circle'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
