import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Star,
  MessageSquare,
  Search,
  Filter,
  Youtube,
  Mic,
  BookOpen,
  UploadCloud,
  Layers,
  Sparkles,
  ChevronRight,
  Play,
  ExternalLink,
  Award,
  Clock,
  ThumbsUp,
  X,
  CheckCircle2,
} from 'lucide-react';
import { RagKnowledgeBase } from './RagKnowledgeBase.tsx';
import { MaterialReviewModal } from './MaterialReviewModal.tsx';
import { DocumentRecord, LearningResource, StudentProfile } from '../types/index.ts';
import {
  saveOfflineDocuments,
  getOfflineDocuments,
  saveOfflineCourses,
  getOfflineCourses,
} from '../utils/offlineDb.ts';

interface StudyDocumentsProps {
  onNavigateToVoice?: (docId?: string) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  profile?: StudentProfile;
}

export const StudyDocuments: React.FC<StudyDocumentsProps> = ({
  onNavigateToVoice,
  onNavigateToChat,
  profile,
}) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'courses' | 'upload'>('documents');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [courses, setCourses] = useState<LearningResource[]>([]);
  const [ratingsSummary, setRatingsSummary] = useState<
    Record<string, { averageRating: number; totalRatings: number }>
  >({});
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'highest_rated' | 'most_reviewed' | 'newest'>('highest_rated');

  // Review Modal state
  const [reviewModalTarget, setReviewModalTarget] = useState<{
    id: string;
    title: string;
    type: 'document' | 'course';
    subject: string;
  } | null>(null);

  // Video Player Modal state
  const [activeVideo, setActiveVideo] = useState<LearningResource | null>(null);

  // Document Chunks Preview Modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [previewChunks, setPreviewChunks] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  // Fetch initial documents, courses, and reviews summary (with IndexedDB rural offline support)
  const loadData = async () => {
    try {
      setLoading(true);
      const [docsRes, coursesRes, summaryRes] = await Promise.all([
        fetch('/api/documents').then((r) => (r.ok ? r.json() : { documents: [] })).catch(() => ({ documents: [] })),
        fetch('/api/learning-resources').then((r) => (r.ok ? r.json() : { resources: [] })).catch(() => ({ resources: [] })),
        fetch('/api/reviews/summary').then((r) => (r.ok ? r.json() : { summaries: {} })).catch(() => ({ summaries: {} })),
      ]);

      let docsList = docsRes.documents || [];
      let coursesList = coursesRes.resources || [];

      // If network provided data, update IndexedDB cache
      if (docsList.length > 0) {
        saveOfflineDocuments(docsList);
      } else {
        // Fallback to IndexedDB offline cache
        docsList = await getOfflineDocuments();
      }

      if (coursesList.length > 0) {
        saveOfflineCourses(coursesList);
      } else {
        // Fallback to IndexedDB offline cache
        coursesList = await getOfflineCourses();
      }

      setDocuments(docsList);
      setCourses(coursesList);
      setRatingsSummary(summaryRes.summaries || {});
    } catch (err) {
      console.warn('Network failed, switching to IndexedDB offline cache:', err);
      const [cachedDocs, cachedCourses] = await Promise.all([
        getOfflineDocuments(),
        getOfflineCourses(),
      ]);
      setDocuments(cachedDocs);
      setCourses(cachedCourses);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const subjectsList = ['all', 'Generative AI', 'AI Agents', 'Python', 'Java', 'C', 'C++', 'C#', 'R', 'DSA', 'Mathematics'];

  // Helper to get rating info
  const getRatingInfo = (id: string) => {
    const info = ratingsSummary[id];
    if (info && info.totalRatings > 0) {
      return { rating: info.averageRating, count: info.totalRatings };
    }
    return { rating: 5.0, count: 0 };
  };

  // Filtered & Sorted Documents
  const filteredDocuments = useMemo(() => {
    let list = documents.filter((doc) => {
      const matchesSubject =
        selectedSubject === 'all' || doc.subject.toLowerCase() === selectedSubject.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.subject.toLowerCase().includes(q) ||
        (doc.category && doc.category.toLowerCase().includes(q)) ||
        (doc.summary && doc.summary.toLowerCase().includes(q));

      return matchesSubject && matchesSearch;
    });

    if (sortBy === 'highest_rated') {
      list.sort((a, b) => getRatingInfo(b.id).rating - getRatingInfo(a.id).rating);
    } else if (sortBy === 'most_reviewed') {
      list.sort((a, b) => getRatingInfo(b.id).count - getRatingInfo(a.id).count);
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.uploadedAt || '').getTime() - new Date(a.uploadedAt || '').getTime());
    }

    return list;
  }, [documents, searchQuery, selectedSubject, sortBy, ratingsSummary]);

  // Filtered & Sorted Courses
  const filteredCourses = useMemo(() => {
    let list = courses.filter((course) => {
      const matchesSubject =
        selectedSubject === 'all' || course.subject.toLowerCase() === selectedSubject.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        course.title.toLowerCase().includes(q) ||
        course.subject.toLowerCase().includes(q) ||
        course.provider.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q) ||
        course.keyTopics.some((t) => t.toLowerCase().includes(q));

      return matchesSubject && matchesSearch;
    });

    if (sortBy === 'highest_rated') {
      list.sort((a, b) => getRatingInfo(b.id).rating - getRatingInfo(a.id).rating);
    } else if (sortBy === 'most_reviewed') {
      list.sort((a, b) => getRatingInfo(b.id).count - getRatingInfo(a.id).count);
    }

    return list;
  }, [courses, searchQuery, selectedSubject, sortBy, ratingsSummary]);

  // Preview Chunks for Document
  const handleOpenDocPreview = async (doc: DocumentRecord) => {
    setPreviewDoc(doc);
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewChunks(data.chunks || []);
      } else {
        setPreviewChunks([]);
      }
    } catch {
      setPreviewChunks([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Launch chat with tutor
  const handleAskTutor = (title: string, subject: string) => {
    if (onNavigateToChat) {
      onNavigateToChat(
        `Hey Tutor! I am studying the verified materials for "${title}" (${subject}). Can you explain the core concepts and test me with a problem?`
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner connecting Documents to Voice AI & Rating System */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-amber-950/40 border border-emerald-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Study Documents & Verified Learning Materials
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                  <Star className="w-2.5 h-2.5 fill-amber-300" />
                  <span>Student Rated</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Explore shared programming documents, cheatsheets, and free courses for Python, Java, C, C++, C#, R, DSA, and Calculus. Leave star ratings and comments to help fellow students find top-tier study guides!
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {onNavigateToVoice && (
              <button
                onClick={() => onNavigateToVoice()}
                className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>Launch Voice AI Agent</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Shared Documents ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'courses'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>Free Video Courses ({courses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload New & Pipeline</span>
          </button>
        </div>

        {activeTab !== 'upload' && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-semibold">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 text-amber-300 font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="highest_rated">Highest Rated ⭐</option>
              <option value="most_reviewed">Most Reviewed 💬</option>
              <option value="newest">Newest Added 🕒</option>
            </select>
          </div>
        )}
      </div>

      {/* Search and Language Selector Filter (For documents and courses tabs) */}
      {activeTab !== 'upload' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keywords, language, instructor, formulas, or concepts..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 text-white text-xs sm:text-sm rounded-xl pl-10 pr-9 py-2.5 outline-none transition"
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

          <div className="flex items-center space-x-2 pt-2 border-t border-slate-800 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 text-xs font-bold mr-1 shrink-0">Language:</span>
            {subjectsList.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                  selectedSubject.toLowerCase() === sub.toLowerCase()
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
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
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading verified materials & student ratings...</p>
        </div>
      )}

      {/* 1. SHARED PROGRAMMING DOCUMENTS VIEW */}
      {!loading && activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocuments.map((docItem) => {
              const ratingInfo = getRatingInfo(docItem.id);

              return (
                <div
                  key={docItem.id}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all group hover:-translate-y-0.5"
                >
                  <div>
                    {/* Header: Subject & Rating Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                        {docItem.subject}
                      </span>

                      {/* Interactive Rating Badge */}
                      <button
                        onClick={() =>
                          setReviewModalTarget({
                            id: docItem.id,
                            title: docItem.title,
                            type: 'document',
                            subject: docItem.subject,
                          })
                        }
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition cursor-pointer text-xs font-bold"
                        title="View ratings & comments"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{ratingInfo.rating > 0 ? ratingInfo.rating.toFixed(1) : '5.0'}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({ratingInfo.count})
                        </span>
                      </button>
                    </div>

                    <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition line-clamp-2 leading-snug">
                      {docItem.title}
                    </h4>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {docItem.summary || 'Verified syllabus notes grounded in RAG pipeline.'}
                    </p>

                    <div className="flex items-center space-x-3 text-xs text-slate-400 mt-3">
                      <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                        <Layers className="w-3.5 h-3.5" />
                        <span>{docItem.chunkCount} Chunks</span>
                      </span>
                      {docItem.fileSizeKb && <span>{docItem.fileSizeKb} KB</span>}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleAskTutor(docItem.title, docItem.subject)}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer border border-slate-700 hover:border-emerald-500"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Ask Tutor</span>
                    </button>

                    <button
                      onClick={() => handleOpenDocPreview(docItem)}
                      className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition cursor-pointer"
                    >
                      Preview
                    </button>

                    <button
                      onClick={() =>
                        setReviewModalTarget({
                          id: docItem.id,
                          title: docItem.title,
                          type: 'document',
                          subject: docItem.subject,
                        })
                      }
                      className="py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 transition cursor-pointer flex items-center space-x-1"
                      title="Leave a star rating or comment"
                    >
                      <Star className="w-3 h-3 fill-amber-300" />
                      <span>Rate</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. VIDEO COURSES & TUTORIALS VIEW */}
      {!loading && activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCourses.map((course) => {
              const ratingInfo = getRatingInfo(course.id);

              return (
                <div
                  key={course.id}
                  className="bg-slate-900 border border-slate-800 hover:border-red-500/40 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between transition-all group hover:-translate-y-1"
                >
                  {/* Thumbnail & Badges */}
                  <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85 group-hover:opacity-100"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700">
                        <Youtube className="w-12 h-12" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

                    {/* Play Button Overlay */}
                    {course.embedUrl && (
                      <button
                        onClick={() => setActiveVideo(course)}
                        className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl hover:scale-110 transition cursor-pointer"
                      >
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </button>
                    )}

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/80">
                        {course.subject}
                      </span>

                      {/* Rating pill on thumbnail */}
                      <button
                        onClick={() =>
                          setReviewModalTarget({
                            id: course.id,
                            title: course.title,
                            type: 'course',
                            subject: course.subject,
                          })
                        }
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-black/80 hover:bg-black text-amber-300 backdrop-blur-md border border-amber-500/30 text-[11px] font-bold transition cursor-pointer"
                      >
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{ratingInfo.rating > 0 ? ratingInfo.rating.toFixed(1) : '5.0'}</span>
                        <span className="text-[9px] text-slate-400">({ratingInfo.count})</span>
                      </button>
                    </div>

                    <div className="absolute bottom-2.5 right-3 flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-black/80 text-[10px] font-mono text-slate-300">
                      <Clock className="w-3 h-3 text-red-400" />
                      <span>{course.duration}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mb-1">
                        <span className="font-bold text-red-400">{course.provider}</span>
                        <span>•</span>
                        <span className="text-slate-400">{course.difficulty}</span>
                      </div>

                      <h4 className="text-base font-bold text-white group-hover:text-red-300 transition line-clamp-2 leading-snug">
                        {course.title}
                      </h4>

                      <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    </div>

                    {/* Actions Bar */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleAskTutor(course.title, course.subject)}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer border border-slate-700 hover:border-emerald-500"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Ask Tutor</span>
                      </button>

                      {course.embedUrl ? (
                        <button
                          onClick={() => setActiveVideo(course)}
                          className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Watch</span>
                        </button>
                      ) : (
                        <a
                          href={course.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      <button
                        onClick={() =>
                          setReviewModalTarget({
                            id: course.id,
                            title: course.title,
                            type: 'course',
                            subject: course.subject,
                          })
                        }
                        className="py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 transition cursor-pointer flex items-center space-x-1"
                        title="Leave rating or review"
                      >
                        <Star className="w-3 h-3 fill-amber-300" />
                        <span>Rate</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. UPLOAD & RAG PIPELINE MANAGEMENT VIEW */}
      {activeTab === 'upload' && <RagKnowledgeBase />}

      {/* STAR RATING & COMMENTS MODAL */}
      {reviewModalTarget && (
        <MaterialReviewModal
          isOpen={!!reviewModalTarget}
          materialId={reviewModalTarget.id}
          materialTitle={reviewModalTarget.title}
          materialType={reviewModalTarget.type}
          materialSubject={reviewModalTarget.subject}
          profile={profile}
          onClose={() => setReviewModalTarget(null)}
          onReviewSubmitted={() => {
            loadData();
          }}
        />
      )}

      {/* EMBEDDED VIDEO PLAYER MODAL */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                  <Youtube className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                    {activeVideo.title}
                  </h4>
                  <div className="text-xs text-slate-400">
                    {activeVideo.provider} • {activeVideo.subject}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setReviewModalTarget({
                      id: activeVideo.id,
                      title: activeVideo.title,
                      type: 'course',
                      subject: activeVideo.subject,
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-300" />
                  <span>Rate Course</span>
                </button>

                <button
                  onClick={() => setActiveVideo(null)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative aspect-video w-full bg-black">
              {activeVideo.embedUrl && (
                <iframe
                  src={activeVideo.embedUrl}
                  title={activeVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Discuss doubts on this video lecture with the AI Tutor in WhatsApp.
              </span>
              <button
                onClick={() => {
                  handleAskTutor(activeVideo.title, activeVideo.subject);
                  setActiveVideo(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask Doubt in WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {previewDoc.subject}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{previewDoc.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {previewDoc.chunkCount} Verified Grounding Chunks
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const docToReview = previewDoc;
                    setPreviewDoc(null);
                    setReviewModalTarget({
                      id: docToReview.id,
                      title: docToReview.title,
                      type: 'document',
                      subject: docToReview.subject,
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-300" />
                  <span>Rate</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {loadingPreview ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading chunks...</div>
              ) : previewChunks.length > 0 ? (
                previewChunks.map((chunk, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      Chunk #{idx + 1}
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">{chunk.content}</p>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Ready for AI Tutor RAG retrieval.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
