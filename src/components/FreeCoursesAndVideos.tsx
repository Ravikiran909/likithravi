import React, { useState, useEffect, useMemo } from 'react';
import {
  Youtube,
  GraduationCap,
  Play,
  ExternalLink,
  Search,
  Tag,
  Clock,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  X,
  BookOpen,
  Filter,
  Flame,
  Award,
  Star,
} from 'lucide-react';
import { LearningResource, StudentProfile } from '../types/index.ts';
import { MaterialReviewModal } from './MaterialReviewModal.tsx';

interface FreeCoursesAndVideosProps {
  profile: StudentProfile;
  onNavigateToChat: (prefilledText?: string) => void;
  initialSubject?: string;
  onProfileUpdate?: (updated: StudentProfile) => void;
}

export const FreeCoursesAndVideos: React.FC<FreeCoursesAndVideosProps> = ({
  profile,
  onNavigateToChat,
  initialSubject = 'all',
  onProfileUpdate,
}) => {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [ratingsSummary, setRatingsSummary] = useState<Record<string, { averageRating: number; totalRatings: number }>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [togglingCourseId, setTogglingCourseId] = useState<string | null>(null);

  const handleToggleCourseCompletion = async (courseId: string) => {
    setTogglingCourseId(courseId);
    const currentCompleted = profile.completedCourseIds || [];
    const isAlready = currentCompleted.includes(courseId);
    const nextList = isAlready
      ? currentCompleted.filter((id) => id !== courseId)
      : [...currentCompleted, courseId];

    try {
      const res = await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedCourseIds: nextList }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (onProfileUpdate) onProfileUpdate(updated);
      }
    } catch (e) {
      console.error('Failed to toggle course completion:', e);
    } finally {
      setTogglingCourseId(null);
    }
  };

  // Video Player Modal state
  const [activeVideo, setActiveVideo] = useState<LearningResource | null>(null);

  // Review Modal state
  const [reviewModalTarget, setReviewModalTarget] = useState<LearningResource | null>(null);

  // Fetch learning resources and reviews from API
  const fetchResourcesAndRatings = async () => {
    try {
      setLoading(true);
      const [resData, sumData] = await Promise.all([
        fetch('/api/learning-resources').then(r => r.ok ? r.json() : { resources: [] }),
        fetch('/api/reviews/summary').then(r => r.ok ? r.json() : { summaries: {} }),
      ]);
      setResources(resData.resources || []);
      setRatingsSummary(sumData.summaries || {});
    } catch (err) {
      console.warn('Failed to load curated courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResourcesAndRatings();
  }, []);

  const subjectsList = ['all', 'Generative AI', 'AI Agents', 'Python', 'Java', 'C', 'C++', 'C#', 'R', 'DSA', 'Mathematics'];

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const matchesSubject =
        selectedSubject === 'all' ||
        item.subject.toLowerCase() === selectedSubject.toLowerCase();

      const matchesType = selectedType === 'all' || item.type === selectedType;

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.provider.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.keyTopics.some((t) => t.toLowerCase().includes(q));

      return matchesSubject && matchesType && matchesQuery;
    });
  }, [resources, selectedSubject, selectedType, searchQuery]);

  // Ask tutor about this video/course
  const handleAskTutor = (resource: LearningResource) => {
    const prompt = `Hey Tutor! I am learning from "${resource.title}" (${resource.provider}) on ${resource.subject}. Can you give me a quick conceptual summary of the key topics (${resource.keyTopics.slice(0, 3).join(', ')}) and test my understanding?`;
    onNavigateToChat(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-red-950/60 via-slate-900 to-indigo-950/60 border border-red-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <Youtube className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  Verified Free Education
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>100% Free & No Paywalls</span>
                </span>
              </div>
              <h3 className="text-xl font-black text-white mt-0.5 tracking-tight">
                Curated YouTube Videos & Free University Courses
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Master Python, Java, C, C++, C#, R, DSA, and Calculus with world-class free courses from Harvard CS50, MIT OpenCourseWare, freeCodeCamp, Bro Code, The Cherno, and StatQuest.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-center min-w-[100px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Courses</span>
              <span className="text-lg font-black text-red-400">{resources.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Language & Subject Selector Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
        {/* Search Input and Type Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses, YouTube lectures, instructors, or concepts..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 text-white text-xs sm:text-sm rounded-xl pl-10 pr-9 py-2.5 outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Selector Pills */}
          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedType === 'all'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setSelectedType('youtube_video')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedType === 'youtube_video'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Videos
            </button>
            <button
              onClick={() => setSelectedType('free_course')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedType === 'free_course'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Courses
            </button>
            <button
              onClick={() => setSelectedType('youtube_playlist')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedType === 'youtube_playlist'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Playlists
            </button>
          </div>
        </div>

        {/* Programming Languages Subject Strip */}
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-800 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-xs font-bold mr-1 shrink-0">Topic:</span>
          {subjectsList.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                selectedSubject.toLowerCase() === sub.toLowerCase()
                  ? 'bg-slate-100 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {sub === 'Generative AI' && <span>✨</span>}
              {sub === 'AI Agents' && <span>🤖</span>}
              {sub === 'Python' && <span>🐍</span>}
              {sub === 'Java' && <span>☕</span>}
              {sub === 'C' && <span>⚡</span>}
              {sub === 'C++' && <span>🚀</span>}
              {sub === 'C#' && <span>🔷</span>}
              {sub === 'R' && <span>📊</span>}
              {sub === 'DSA' && <span>🌳</span>}
              {sub === 'Mathematics' && <span>📐</span>}
              <span>{sub === 'all' ? 'All Languages' : sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading free learning courses and tutorials...</p>
        </div>
      )}

      {/* Course Cards Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between transition-all group hover:-translate-y-1"
            >
              {/* Media Thumbnail & Badges */}
              <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-700">
                    <Youtube className="w-12 h-12" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none" />

                {/* Play Button Overlay */}
                {item.embedUrl && (
                  <button
                    onClick={() => setActiveVideo(item)}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl hover:scale-110 transition cursor-pointer backdrop-blur-sm"
                    title="Watch Video"
                  >
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </button>
                )}

                {/* Top Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/80">
                    {item.subject}
                  </span>

                  <div className="flex items-center space-x-1.5">
                    {/* Interactive Rating Badge */}
                    <button
                      onClick={() => setReviewModalTarget(item)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-black/80 hover:bg-black text-amber-300 backdrop-blur-md border border-amber-500/40 text-[10px] font-bold transition cursor-pointer shadow-sm"
                      title="View reviews and star ratings"
                    >
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      <span>{ratingsSummary[item.id]?.averageRating ? ratingsSummary[item.id].averageRating.toFixed(1) : '5.0'}</span>
                      <span className="text-[9px] text-slate-400 font-normal">
                        ({ratingsSummary[item.id]?.totalRatings || 0})
                      </span>
                    </button>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-slate-950 backdrop-blur-md shadow-sm">
                      FREE
                    </span>
                  </div>
                </div>

                {/* Bottom Duration Badge */}
                <div className="absolute bottom-2.5 right-3 flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-black/80 text-[10px] font-mono text-slate-300 backdrop-blur-sm">
                  <Clock className="w-3 h-3 text-red-400" />
                  <span>{item.duration}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 mb-1">
                    <span className="font-bold text-red-400">{item.provider}</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                      {item.difficulty}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white group-hover:text-red-300 transition line-clamp-2 leading-snug">
                    {item.title}
                  </h4>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Key Topics Tags */}
                  {item.keyTopics && item.keyTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {item.keyTopics.slice(0, 3).map((topic) => (
                        <span
                          key={topic}
                          className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-950 text-slate-300 border border-slate-800 font-mono"
                        >
                          {topic}
                        </span>
                      ))}
                      {item.keyTopics.length > 3 && (
                        <span className="text-[10px] text-slate-500 self-center">
                          +{item.keyTopics.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleAskTutor(item)}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer border border-slate-700 hover:border-emerald-500 shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask Tutor</span>
                  </button>

                  {item.embedUrl ? (
                    <button
                      onClick={() => setActiveVideo(item)}
                      className="py-2 px-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-red-600/30 transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Watch</span>
                    </button>
                  ) : (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-red-600/30 transition cursor-pointer"
                    >
                      <span>Open Course</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={() => setReviewModalTarget(item)}
                    className="py-2 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 transition cursor-pointer flex items-center space-x-1"
                    title="Leave a star rating or comment"
                  >
                    <Star className="w-3 h-3 fill-amber-300" />
                    <span>Rate</span>
                  </button>

                  <button
                    onClick={() => handleToggleCourseCompletion(item.id)}
                    disabled={togglingCourseId === item.id}
                    className={`py-2 px-2.5 rounded-xl font-bold text-xs border transition cursor-pointer flex items-center space-x-1 ${
                      (profile.completedCourseIds || []).includes(item.id)
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                    title={
                      (profile.completedCourseIds || []).includes(item.id)
                        ? 'Course completed! Click to mark incomplete'
                        : 'Mark course as finished to earn Course Completion badges'
                    }
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        (profile.completedCourseIds || []).includes(item.id)
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    />
                    <span>
                      {(profile.completedCourseIds || []).includes(item.id) ? 'Completed' : 'Finish'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIDEO PLAYER MODAL */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                  <Youtube className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                    {activeVideo.title}
                  </h4>
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <span className="font-semibold text-red-400">{activeVideo.provider}</span>
                    <span>•</span>
                    <span>{activeVideo.subject}</span>
                    <span>•</span>
                    <span>{activeVideo.duration}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleToggleCourseCompletion(activeVideo.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer flex items-center space-x-1.5 ${
                    (profile.completedCourseIds || []).includes(activeVideo.id)
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      (profile.completedCourseIds || []).includes(activeVideo.id)
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    }`}
                  />
                  <span>
                    {(profile.completedCourseIds || []).includes(activeVideo.id)
                      ? 'Completed ✓'
                      : 'Mark Complete'}
                  </span>
                </button>

                <a
                  href={activeVideo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Open on YouTube / Platform"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setActiveVideo(null)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Video Player Embed */}
            <div className="relative aspect-video w-full bg-black">
              {activeVideo.embedUrl ? (
                <iframe
                  src={activeVideo.embedUrl}
                  title={activeVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <GraduationCap className="w-12 h-12 text-slate-500" />
                  <p className="text-sm font-semibold text-white">Interactive University Course</p>
                  <a
                    href={activeVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg"
                  >
                    <span>Open {activeVideo.provider} Course</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>

            {/* Modal Body & Quick Doubt Action */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                Have a doubt while watching? Ask the AI Tutor in WhatsApp for an instant explanation.
              </div>

              <button
                onClick={() => {
                  handleAskTutor(activeVideo);
                  setActiveVideo(null);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/30 transition cursor-pointer shrink-0"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Discuss with Tutor in WhatsApp</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review & Star Rating Modal */}
      {reviewModalTarget && (
        <MaterialReviewModal
          isOpen={!!reviewModalTarget}
          materialId={reviewModalTarget.id}
          materialTitle={reviewModalTarget.title}
          materialType="course"
          materialSubject={reviewModalTarget.subject}
          profile={profile}
          onClose={() => setReviewModalTarget(null)}
          onReviewSubmitted={() => {
            fetchResourcesAndRatings();
          }}
        />
      )}
    </div>
  );
};
