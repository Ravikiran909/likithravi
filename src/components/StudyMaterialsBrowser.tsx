import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Pin,
  PinOff,
  MessageSquare,
  Brain,
  FileText,
  ExternalLink,
  Layers,
  Sparkles,
  Calendar,
  X,
  ChevronRight,
  Database,
  Tag,
  CheckCircle2,
  FileCheck,
  Youtube,
  GraduationCap,
  Star,
} from 'lucide-react';
import { DocumentRecord, StudentProfile } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';
import { FreeCoursesAndVideos } from './FreeCoursesAndVideos.tsx';
import { MaterialReviewModal } from './MaterialReviewModal.tsx';

interface StudyMaterialsBrowserProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
  onNavigateToQuiz?: (subject?: string) => void;
}

export const StudyMaterialsBrowser: React.FC<StudyMaterialsBrowserProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'documents' | 'courses'>('documents');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [ratingsSummary, setRatingsSummary] = useState<Record<string, { averageRating: number; totalRatings: number }>>({});
  const [reviewModalTarget, setReviewModalTarget] = useState<DocumentRecord | null>(null);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [previewChunks, setPreviewChunks] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  // Pinned document IDs stored in profile
  const pinnedIds = useMemo(() => {
    return new Set(profile.pinnedDocumentIds || []);
  }, [profile.pinnedDocumentIds]);

  // Fetch all documents from RAG knowledge base & reviews summary
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const [docsRes, summaryRes] = await Promise.all([
        fetch('/api/documents').then(r => r.ok ? r.json() : { documents: [], totalChunks: 0 }),
        fetch('/api/reviews/summary').then(r => r.ok ? r.json() : { summaries: {} }),
      ]);
      setDocuments(docsRes.documents || []);
      setTotalChunks(docsRes.totalChunks || 0);
      setRatingsSummary(summaryRes.summaries || {});
    } catch (err) {
      console.error('Failed to fetch knowledge base documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Toggle pin state
  const handleTogglePin = async (docId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const currentPins = profile.pinnedDocumentIds || [];
    let updatedPins: string[];

    if (currentPins.includes(docId)) {
      updatedPins = currentPins.filter((id) => id !== docId);
    } else {
      updatedPins = [...currentPins, docId];
    }

    const updatedProfile: StudentProfile = {
      ...profile,
      pinnedDocumentIds: updatedPins,
    };

    onProfileUpdate(updatedProfile);

    // Persist to Firestore
    try {
      if (db && profile.userId) {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          { pinnedDocumentIds: updatedPins },
          { merge: true }
        );
      }
      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinnedDocumentIds: updatedPins }),
      });
    } catch (err) {
      console.warn('Failed to sync pinned documents to Firestore:', err);
    }
  };

  // Open preview modal with chunks
  const handleOpenPreview = async (document: DocumentRecord) => {
    setPreviewDoc(document);
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/documents/${document.id}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewChunks(data.chunks || []);
      } else {
        setPreviewChunks([]);
      }
    } catch (err) {
      console.warn('Failed to load chunks for preview:', err);
      setPreviewChunks([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Launch WhatsApp chat with prefilled tutor prompt grounded in this doc
  const handleAskTutor = (doc: DocumentRecord) => {
    const prompt = `Hey Tutor! I am studying the verified notes for "${doc.title}" (${doc.subject}). Can you explain the core concepts with an intuitive real-world analogy and test my understanding?`;
    onNavigateToChat(prompt);
  };

  // Launch quiz with prefilled prompt
  const handleStartQuiz = (doc: DocumentRecord) => {
    if (onNavigateToQuiz) {
      onNavigateToQuiz(doc.subject);
    } else {
      onNavigateToChat(`/quiz ${doc.subject}`);
    }
  };

  // Extract unique subjects and categories
  const subjects = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.subject) set.add(d.subject);
    });
    return Array.from(set);
  }, [documents]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set);
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        !searchQuery.trim() ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.category && doc.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.originalFilename && doc.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSubject = selectedSubject === 'all' || doc.subject === selectedSubject;
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;

      return matchesSearch && matchesSubject && matchesCategory;
    });
  }, [documents, searchQuery, selectedSubject, selectedCategory]);

  // Separate pinned vs non-pinned among filtered
  const pinnedDocs = useMemo(() => {
    return filteredDocuments.filter((d) => pinnedIds.has(d.id));
  }, [filteredDocuments, pinnedIds]);

  const unpinnedDocs = useMemo(() => {
    return filteredDocuments.filter((d) => !pinnedIds.has(d.id));
  }, [filteredDocuments, pinnedIds]);

  return (
    <div className="space-y-6">
      {/* Primary Sub-Tab Switcher: Documents vs Free Courses & YouTube */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('documents')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'documents'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Curriculum Documents ({documents.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('courses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'courses'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>YouTube Videos & Free Courses</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 hidden sm:block">
          {activeSubTab === 'documents'
            ? 'Grounds the Socratic AI Tutor & WhatsApp chat with verified notes'
            : 'Curated university courses & YouTube tutorials for all programming languages'}
        </div>
      </div>

      {/* Render Free Courses & Videos View when active */}
      {activeSubTab === 'courses' ? (
        <FreeCoursesAndVideos profile={profile} onNavigateToChat={onNavigateToChat} />
      ) : (
        <>
          {/* Top Banner / Knowledge Base Header */}
          <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  RAG Curriculum Library
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {documents.length} Indexed Materials
                </span>
              </div>
              <h2 className="text-xl font-black text-white mt-0.5 tracking-tight">
                Study Materials & Knowledge Base
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Search verified curriculum notes, textbook chapters, and cheatsheets. Pin your essential materials for one-tap access in WhatsApp tutor discussions!
              </p>
            </div>
          </div>

          {/* Quick Counter Badges */}
          <div className="flex items-center space-x-3 self-start md:self-auto shrink-0">
            <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Chunks</span>
              <span className="text-lg font-black text-emerald-400">{totalChunks}</span>
            </div>
            <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pinned Docs</span>
              <span className="text-lg font-black text-amber-400">{pinnedIds.size}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, subject, formula, keyword, or filename..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-xs sm:text-sm rounded-xl pl-10 pr-9 py-2.5 outline-none transition"
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

          {/* Subject Filter Pills */}
          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedSubject('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedSubject === 'all'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Subjects
            </button>
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedSubject === sub
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Chips if available */}
        {categories.length > 1 && (
          <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80 text-xs">
            <span className="text-slate-500 text-[11px] font-medium flex items-center space-x-1">
              <Tag className="w-3 h-3" />
              <span>Category:</span>
            </span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                selectedCategory === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                  selectedCategory === cat ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading knowledge base materials...</p>
        </div>
      )}

      {/* PINNED STUDY MATERIALS SECTION */}
      {!loading && pinnedDocs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Pin className="w-4 h-4 text-amber-400 fill-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Pinned Study Materials ({pinnedDocs.length})
              </h3>
            </div>
            <span className="text-[11px] text-amber-400/80 font-medium">
              Quick access in WhatsApp tutor discussions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedDocs.map((docItem) => (
              <div
                key={docItem.id}
                className="bg-gradient-to-br from-slate-900 to-amber-950/20 border-2 border-amber-500/40 hover:border-amber-400 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group relative"
              >
                {/* Pin Action Button */}
                <button
                  onClick={(e) => handleTogglePin(docItem.id, e)}
                  title="Unpin document"
                  className="absolute top-4 right-4 p-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition cursor-pointer"
                >
                  <Pin className="w-4 h-4 fill-amber-400" />
                </button>

                <div>
                  <div className="flex items-center space-x-2 mb-2 pr-10">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {docItem.subject}
                    </span>
                    <button
                      onClick={() => setReviewModalTarget(docItem)}
                      className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-pointer"
                      title="View reviews & star ratings"
                    >
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      <span>{ratingsSummary[docItem.id]?.averageRating ? ratingsSummary[docItem.id].averageRating.toFixed(1) : '5.0'}</span>
                      <span className="text-[9px] text-slate-400 font-normal">
                        ({ratingsSummary[docItem.id]?.totalRatings || 0})
                      </span>
                    </button>
                    {docItem.category && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {docItem.category}
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition line-clamp-2">
                    {docItem.title}
                  </h4>

                  <div className="flex items-center space-x-3 text-xs text-slate-400 mt-2.5">
                    <span className="flex items-center space-x-1">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{docItem.chunkCount} Chunks</span>
                    </span>
                    {(docItem.fileSizeKb || (docItem as any).filesizeBytes) && (
                      <span>
                        {docItem.fileSizeKb
                          ? `${docItem.fileSizeKb} KB`
                          : `${((docItem as any).filesizeBytes / 1024).toFixed(1)} KB`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleAskTutor(docItem)}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                    title="Send query to WhatsApp AI Tutor"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask Tutor</span>
                  </button>

                  <button
                    onClick={() => handleOpenPreview(docItem)}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition cursor-pointer"
                    title="Preview Chunks & Notes"
                  >
                    Preview
                  </button>

                  <button
                    onClick={() => setReviewModalTarget(docItem)}
                    className="py-2 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 transition cursor-pointer flex items-center space-x-1"
                    title="Leave star rating or comment"
                  >
                    <Star className="w-3 h-3 fill-amber-300" />
                    <span>Rate</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL STUDY MATERIALS GRID */}
      {!loading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>
                {pinnedDocs.length > 0 ? 'Other Curriculum Materials' : 'Curriculum Materials'} (
                {unpinnedDocs.length})
              </span>
            </h3>

            {searchQuery && (
              <span className="text-xs text-slate-400">
                Filtered by "{searchQuery}"
              </span>
            )}
          </div>

          {unpinnedDocs.length === 0 && pinnedDocs.length === 0 ? (
            <div className="py-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-white">No matching documents found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try searching for a different keyword, or clear your subject and category filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSubject('all');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unpinnedDocs.map((docItem) => (
                <div
                  key={docItem.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group relative"
                >
                  {/* Pin Action Button */}
                  <button
                    onClick={(e) => handleTogglePin(docItem.id, e)}
                    title="Pin for quick access"
                    className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition cursor-pointer"
                  >
                    <Pin className="w-4 h-4" />
                  </button>

                  <div>
                    <div className="flex items-center space-x-2 mb-2 pr-10">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                        {docItem.subject}
                      </span>
                      <button
                        onClick={() => setReviewModalTarget(docItem)}
                        className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-pointer"
                        title="View reviews & star ratings"
                      >
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        <span>{ratingsSummary[docItem.id]?.averageRating ? ratingsSummary[docItem.id].averageRating.toFixed(1) : '5.0'}</span>
                        <span className="text-[9px] text-slate-400 font-normal">
                          ({ratingsSummary[docItem.id]?.totalRatings || 0})
                        </span>
                      </button>
                      {docItem.category && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/60">
                          {docItem.category}
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition line-clamp-2">
                      {docItem.title}
                    </h4>

                    <div className="flex items-center space-x-3 text-xs text-slate-400 mt-2.5">
                      <span className="flex items-center space-x-1">
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{docItem.chunkCount} Chunks</span>
                      </span>
                      {docItem.originalFilename && (
                        <span className="truncate max-w-[140px] text-slate-500 font-mono text-[11px]">
                          {docItem.originalFilename}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleAskTutor(docItem)}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer border border-slate-700 hover:border-emerald-500"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Ask Tutor</span>
                    </button>

                    <button
                      onClick={() => handleOpenPreview(docItem)}
                      className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white font-semibold text-xs border border-slate-700 transition cursor-pointer"
                    >
                      Preview
                    </button>

                    <button
                      onClick={() => setReviewModalTarget(docItem)}
                      className="py-2 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 transition cursor-pointer flex items-center space-x-1"
                      title="Leave star rating or comment"
                    >
                      <Star className="w-3 h-3 fill-amber-300" />
                      <span>Rate</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {previewDoc.subject}
                  </span>
                  <span className="text-xs text-slate-400">{previewDoc.chunkCount} Semantic Chunks</span>
                  {pinnedIds.has(previewDoc.id) && (
                    <span className="text-xs text-amber-400 font-bold flex items-center space-x-1">
                      <Pin className="w-3 h-3 fill-amber-400" />
                      <span>Pinned</span>
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white mt-1">{previewDoc.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  File: <span className="font-mono text-slate-300">{previewDoc.originalFilename || 'Document'}</span>
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleTogglePin(previewDoc.id)}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    pinnedIds.has(previewDoc.id)
                      ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title={pinnedIds.has(previewDoc.id) ? 'Unpin' : 'Pin'}
                >
                  <Pin className={`w-4 h-4 ${pinnedIds.has(previewDoc.id) ? 'fill-amber-400' : ''}`} />
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Verified Semantic Chunks */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {loadingPreview ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Loading verified semantic chunks...</p>
                </div>
              ) : previewChunks.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Indexed Semantic Text Chunks (Grounding Corpus)</span>
                  </div>
                  {previewChunks.map((chunk, idx) => (
                    <div
                      key={chunk.id || idx}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span className="font-bold text-emerald-400">Chunk #{idx + 1}</span>
                        <span>{chunk.content ? `${chunk.content.length} chars` : ''}</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                        {chunk.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Document metadata loaded. Semantic chunks are ready for tutor retrieval.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
              <button
                onClick={() => handleStartQuiz(previewDoc)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs border border-amber-500/20 flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Quiz Me on This</span>
              </button>

              <button
                onClick={() => {
                  handleAskTutor(previewDoc);
                  setPreviewDoc(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-1.5 transition cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Discuss with Tutor in WhatsApp</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Review Modal for Documents */}
      {reviewModalTarget && (
        <MaterialReviewModal
          isOpen={!!reviewModalTarget}
          materialId={reviewModalTarget.id}
          materialTitle={reviewModalTarget.title}
          materialType="document"
          materialSubject={reviewModalTarget.subject}
          profile={profile}
          onClose={() => setReviewModalTarget(null)}
          onReviewSubmitted={() => {
            fetchDocuments();
          }}
        />
      )}
    </div>
  );
};
