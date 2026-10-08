import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Star,
  MessageSquare,
  Search,
  Youtube,
  Mic,
  BookOpen,
  UploadCloud,
  Layers,
  Sparkles,
  Play,
  ExternalLink,
  Clock,
  X,
  Cpu,
  Zap,
  CheckCircle2,
  SlidersHorizontal,
  ArrowUpRight,
  Brain,
} from 'lucide-react';
import { RagKnowledgeBase } from './RagKnowledgeBase.tsx';
import { MaterialReviewModal } from './MaterialReviewModal.tsx';
import {
  DocumentRecord,
  DocumentChunk,
  LearningResource,
  StudentProfile,
} from '../types/index.ts';
import {
  saveOfflineDocuments,
  getOfflineDocuments,
  saveOfflineCourses,
  getOfflineCourses,
} from '../utils/offlineDb.ts';
import { db, collection, getDocs, doc, setDoc } from '../firebase.ts';

interface StudyDocumentsProps {
  onNavigateToVoice?: (docId?: string) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  profile?: StudentProfile;
}

interface VectorChunkMatchItem {
  chunk: DocumentChunk;
  document?: DocumentRecord;
  similarity: number;
  matchedConcepts: string[];
  highlightSnippet: string;
}

interface VectorDocumentMatchItem {
  document: DocumentRecord;
  maxSimilarity: number;
  avgSimilarity: number;
  matchingChunksCount: number;
  topChunk: DocumentChunk;
  matchedConcepts: string[];
}

interface VectorCourseMatchItem {
  course: LearningResource;
  similarity: number;
  matchedConcepts: string[];
}

interface SemanticSearchPayload {
  query: string;
  embeddingModel: string;
  vectorDimension: number;
  searchLatencyMs: number;
  totalChunksScanned: number;
  totalDocumentsScanned: number;
  matchedChunks: VectorChunkMatchItem[];
  matchedDocuments: VectorDocumentMatchItem[];
  matchedCourses: VectorCourseMatchItem[];
  aiSynthesis?: string | null;
}

const SAMPLE_SEMANTIC_QUERIES = [
  {
    label: 'Prevent stack overflow in recursion',
    query: 'How to prevent stack overflow and infinite loops in recursive functions?',
    subject: 'all',
  },
  {
    label: 'C++ Smart Pointers & RAII memory safety',
    query: 'Automatic memory management without leaks using unique_ptr, shared_ptr and RAII',
    subject: 'all',
  },
  {
    label: 'RAG Vector Embeddings & Hallucinations',
    query: 'How do vector embeddings and cosine similarity ground LLMs in RAG pipelines?',
    subject: 'all',
  },
  {
    label: 'Calculus Integration by Parts (LIATE)',
    query: 'How to choose u and dv when integrating products of functions in calculus?',
    subject: 'all',
  },
  {
    label: 'Binary Search O(log n) & overflow',
    query: 'Finding an element in a sorted array in logarithmic time without integer overflow',
    subject: 'all',
  },
  {
    label: 'JVM Heap vs Stack & Concurrency',
    query: 'How Java manages object memory on the heap vs stack frames and thread visibility',
    subject: 'all',
  },
];

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

  // Filters, Search Mode & Sorting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchMode, setSearchMode] = useState<'semantic' | 'keyword'>('semantic');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [sortBy, setSortBy] = useState<
    'semantic_relevance' | 'highest_rated' | 'most_reviewed' | 'newest'
  >('highest_rated');
  const [minSimilarityThreshold, setMinSimilarityThreshold] = useState<number>(0.22);
  const [includeAiSynthesis, setIncludeAiSynthesis] = useState<boolean>(true);

  // Vector Search State
  const [vectorSearchLoading, setVectorSearchLoading] = useState<boolean>(false);
  const [vectorResults, setVectorResults] = useState<SemanticSearchPayload | null>(null);
  const [showAllVectorChunks, setShowAllVectorChunks] = useState<boolean>(false);
  const searchDebounceRef = useRef<number | null>(null);

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
  const [previewChunks, setPreviewChunks] = useState<DocumentChunk[]>([]);
  const [highlightedChunkIndex, setHighlightedChunkIndex] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  // Fetch initial documents, courses, and reviews summary (with IndexedDB rural offline support)
  const loadData = async () => {
    try {
      setLoading(true);
      const [docsRes, coursesRes, summaryRes] = await Promise.all([
        fetch('/api/documents')
          .then((r) => (r.ok ? r.json() : { documents: [] }))
          .catch(() => ({ documents: [] })),
        fetch('/api/learning-resources')
          .then((r) => (r.ok ? r.json() : { resources: [] }))
          .catch(() => ({ resources: [] })),
        fetch('/api/reviews/summary')
          .then((r) => (r.ok ? r.json() : { summaries: {} }))
          .catch(() => ({ summaries: {} })),
      ]);

      let docsList: DocumentRecord[] = docsRes.documents || [];
      let coursesList = coursesRes.resources || [];

      // Sync with Firestore documents collection so all RAG documents persist in database
      if (db) {
        try {
          const fsSnap = await getDocs(collection(db, 'documents'));
          const fsDocs: DocumentRecord[] = [];
          fsSnap.forEach((docSnap) => {
            const d = docSnap.data() as DocumentRecord;
            if (d && d.id && d.title) {
              fsDocs.push(d);
            }
          });

          const mergedMap = new Map<string, DocumentRecord>();
          docsList.forEach((d) => mergedMap.set(d.id, d));
          fsDocs.forEach((d) => {
            if (!mergedMap.has(d.id)) {
              mergedMap.set(d.id, d);
            }
          });
          docsList = Array.from(mergedMap.values());

          // Ensure seeded documents are also persisted into Firestore if collection was empty
          if (fsDocs.length === 0 && docsList.length > 0) {
            docsList.slice(0, 8).forEach((d) => {
              setDoc(
                doc(db, 'documents', d.id),
                {
                  id: d.id,
                  title: String(d.title || 'Course Document').slice(0, 195),
                  subject: String(d.subject || 'Python').slice(0, 95),
                  category: String(d.category || 'Course Notes').slice(0, 95),
                  originalFilename: String(d.originalFilename || 'notes.txt').slice(0, 195),
                  fileSizeKb: Number(d.fileSizeKb) || 2,
                  uploadedAt: d.uploadedAt || new Date().toISOString(),
                  chunkCount: Number(d.chunkCount) || 2,
                  summary: String(d.summary || '').slice(0, 1900),
                },
                { merge: true }
              ).catch(() => {});
            });
          }
        } catch {
          // Fallback to server/offline list if Firestore is temporarily unreachable
        }
      }

      if (docsList.length > 0) {
        saveOfflineDocuments(docsList);
      } else {
        docsList = await getOfflineDocuments();
      }

      if (coursesList.length > 0) {
        saveOfflineCourses(coursesList);
      } else {
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

  // Execute RAG Vector Search against `/api/documents/semantic-search`
  const runSemanticVectorSearch = async (
    rawQuery: string,
    subjectFilter: string,
    minSim: number,
    withSynthesis: boolean
  ) => {
    const cleanQ = rawQuery.trim();
    if (!cleanQ) {
      setVectorResults(null);
      setVectorSearchLoading(false);
      return;
    }

    setVectorSearchLoading(true);
    try {
      const res = await fetch('/api/documents/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: cleanQ,
          subject: subjectFilter,
          limit: 10,
          minSimilarity: minSim,
          includeSynthesis: withSynthesis,
        }),
      });

      if (res.ok) {
        const data: SemanticSearchPayload = await res.json();
        setVectorResults(data);
        setSortBy('semantic_relevance');
      } else {
        setVectorResults(null);
      }
    } catch (err) {
      console.warn('Semantic vector search fallback to local filter:', err);
      setVectorResults(null);
    } finally {
      setVectorSearchLoading(false);
    }
  };

  // Trigger debounced vector search when searchQuery, selectedSubject, or threshold changes
  useEffect(() => {
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
    }

    if (searchMode !== 'semantic' || !searchQuery.trim()) {
      setVectorResults(null);
      setVectorSearchLoading(false);
      return;
    }

    setVectorSearchLoading(true);
    searchDebounceRef.current = window.setTimeout(() => {
      runSemanticVectorSearch(
        searchQuery,
        selectedSubject,
        minSimilarityThreshold,
        includeAiSynthesis
      );
    }, 260);

    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, searchMode, selectedSubject, minSimilarityThreshold, includeAiSynthesis]);

  const subjectsList = [
    'all',
    'Generative AI',
    'AI Agents',
    'Python',
    'Java',
    'C',
    'C++',
    'C#',
    'R',
    'DSA',
    'Mathematics',
  ];

  // Helper to get rating info
  const getRatingInfo = (id: string) => {
    const info = ratingsSummary[id];
    if (info && info.totalRatings > 0) {
      return { rating: info.averageRating, count: info.totalRatings };
    }
    return { rating: 5.0, count: 0 };
  };

  // Map documentId -> VectorDocumentMatchItem for quick lookup
  const vectorDocMatchMap = useMemo(() => {
    const map = new Map<string, VectorDocumentMatchItem>();
    if (vectorResults?.matchedDocuments) {
      for (const item of vectorResults.matchedDocuments) {
        map.set(item.document.id, item);
      }
    }
    return map;
  }, [vectorResults]);

  // Map courseId -> VectorCourseMatchItem for quick lookup
  const vectorCourseMatchMap = useMemo(() => {
    const map = new Map<string, VectorCourseMatchItem>();
    if (vectorResults?.matchedCourses) {
      for (const item of vectorResults.matchedCourses) {
        map.set(item.course.id, item);
      }
    }
    return map;
  }, [vectorResults]);

  // Filtered & Sorted Documents (Supports both Semantic Vector Search & Keyword Filter)
  const filteredDocuments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // If Semantic Search is active and we have vector results from the RAG knowledge base
    if (searchMode === 'semantic' && q && vectorResults) {
      let semanticDocs = documents.filter((doc) => {
        const matchesSubject =
          selectedSubject === 'all' ||
          doc.subject.toLowerCase() === selectedSubject.toLowerCase();
        const vecMatch = vectorDocMatchMap.get(doc.id);
        return matchesSubject && Boolean(vecMatch && vecMatch.maxSimilarity >= minSimilarityThreshold);
      });

      semanticDocs.sort((a, b) => {
        if (sortBy === 'semantic_relevance') {
          const simA = vectorDocMatchMap.get(a.id)?.maxSimilarity || 0;
          const simB = vectorDocMatchMap.get(b.id)?.maxSimilarity || 0;
          return simB - simA;
        }
        if (sortBy === 'highest_rated') {
          return getRatingInfo(b.id).rating - getRatingInfo(a.id).rating;
        }
        if (sortBy === 'most_reviewed') {
          return getRatingInfo(b.id).count - getRatingInfo(a.id).count;
        }
        return (
          new Date(b.uploadedAt || '').getTime() - new Date(a.uploadedAt || '').getTime()
        );
      });

      return semanticDocs;
    }

    // Standard Keyword Filter or Empty Query
    let list = documents.filter((doc) => {
      const matchesSubject =
        selectedSubject === 'all' || doc.subject.toLowerCase() === selectedSubject.toLowerCase();
      const matchesSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.subject.toLowerCase().includes(q) ||
        (doc.category && doc.category.toLowerCase().includes(q)) ||
        (doc.summary && doc.summary.toLowerCase().includes(q));

      return matchesSubject && matchesSearch;
    });

    if (sortBy === 'highest_rated' || sortBy === 'semantic_relevance') {
      list.sort((a, b) => getRatingInfo(b.id).rating - getRatingInfo(a.id).rating);
    } else if (sortBy === 'most_reviewed') {
      list.sort((a, b) => getRatingInfo(b.id).count - getRatingInfo(a.id).count);
    } else if (sortBy === 'newest') {
      list.sort(
        (a, b) => new Date(b.uploadedAt || '').getTime() - new Date(a.uploadedAt || '').getTime()
      );
    }

    return list;
  }, [
    documents,
    searchQuery,
    searchMode,
    selectedSubject,
    sortBy,
    ratingsSummary,
    vectorResults,
    vectorDocMatchMap,
    minSimilarityThreshold,
  ]);

  // Filtered & Sorted Courses (Supports both Semantic Vector Search & Keyword Filter)
  const filteredCourses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    if (searchMode === 'semantic' && q && vectorResults && vectorResults.matchedCourses.length > 0) {
      let semanticCourses = courses.filter((course) => {
        const matchesSubject =
          selectedSubject === 'all' ||
          course.subject.toLowerCase() === selectedSubject.toLowerCase();
        const vecMatch = vectorCourseMatchMap.get(course.id);
        return matchesSubject && Boolean(vecMatch && vecMatch.similarity >= minSimilarityThreshold);
      });

      semanticCourses.sort((a, b) => {
        if (sortBy === 'semantic_relevance') {
          const simA = vectorCourseMatchMap.get(a.id)?.similarity || 0;
          const simB = vectorCourseMatchMap.get(b.id)?.similarity || 0;
          return simB - simA;
        }
        if (sortBy === 'highest_rated') {
          return getRatingInfo(b.id).rating - getRatingInfo(a.id).rating;
        }
        return getRatingInfo(b.id).count - getRatingInfo(a.id).count;
      });

      return semanticCourses;
    }

    let list = courses.filter((course) => {
      const matchesSubject =
        selectedSubject === 'all' || course.subject.toLowerCase() === selectedSubject.toLowerCase();
      const matchesSearch =
        !q ||
        course.title.toLowerCase().includes(q) ||
        course.subject.toLowerCase().includes(q) ||
        course.provider.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q) ||
        course.keyTopics.some((t) => t.toLowerCase().includes(q));

      return matchesSubject && matchesSearch;
    });

    if (sortBy === 'highest_rated' || sortBy === 'semantic_relevance') {
      list.sort((a, b) => getRatingInfo(b.id).rating - getRatingInfo(a.id).rating);
    } else if (sortBy === 'most_reviewed') {
      list.sort((a, b) => getRatingInfo(b.id).count - getRatingInfo(a.id).count);
    }

    return list;
  }, [
    courses,
    searchQuery,
    searchMode,
    selectedSubject,
    sortBy,
    ratingsSummary,
    vectorResults,
    vectorCourseMatchMap,
    minSimilarityThreshold,
  ]);

  // Preview Chunks for Document (optionally highlighting a specific chunk index from vector search)
  const handleOpenDocPreview = async (doc: DocumentRecord, targetChunkIndex?: number) => {
    setPreviewDoc(doc);
    setHighlightedChunkIndex(targetChunkIndex ?? null);
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
  const handleAskTutor = (title: string, subject: string, customChunkContext?: string) => {
    if (onNavigateToChat) {
      if (customChunkContext) {
        onNavigateToChat(
          `Hey Tutor! I found this in "${title}" (${subject}) via RAG vector search: "${customChunkContext.slice(
            0,
            160
          )}...". Can you explain this concept with an example and quiz me on it?`
        );
      } else {
        onNavigateToChat(
          `Hey Tutor! I am studying the verified materials for "${title}" (${subject}). Can you explain the core concepts and test me with a problem?`
        );
      }
    }
  };

  // Format similarity score color
  const getSimilarityBadgeStyle = (similarity: number) => {
    const pct = Math.round(similarity * 100);
    if (pct >= 75) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
    if (pct >= 45) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
    return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
  };

  const visibleVectorChunks = useMemo(() => {
    if (!vectorResults?.matchedChunks) return [];
    return showAllVectorChunks
      ? vectorResults.matchedChunks
      : vectorResults.matchedChunks.slice(0, 3);
  }, [vectorResults, showAllVectorChunks]);

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
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Study Documents & Verified Learning Materials
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <Cpu className="w-2.5 h-2.5" />
                  <span>RAG Vector Search Enabled</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                  <Star className="w-2.5 h-2.5 fill-amber-300" />
                  <span>Student Rated</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Search conceptually across our indexed RAG knowledge base using dense vector embeddings and cosine similarity, or browse student-rated programming handbooks and courses.
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
              <option value="semantic_relevance">Vector Relevance 🧠</option>
              <option value="highest_rated">Highest Rated ⭐</option>
              <option value="most_reviewed">Most Reviewed 💬</option>
              <option value="newest">Newest Added 🕒</option>
            </select>
          </div>
        )}
      </div>

      {/* SEMANTIC VECTOR SEARCH BAR & LANGUAGE FILTER (For documents and courses tabs) */}
      {activeTab !== 'upload' && (
        <div className="bg-slate-900/95 border border-emerald-500/30 rounded-3xl p-5 space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          {/* Header Row: Search Mode Toggle + Vector Engine Telemetry */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    RAG Knowledge Base Semantic Search
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
                    Cosine Similarity • Dense Embeddings
                  </span>
                </div>
              </div>
            </div>

            {/* Mode Switcher: Semantic Vector Search vs Keyword Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSearchMode('semantic')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 transition cursor-pointer ${
                  searchMode === 'semantic'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Vector Semantic Search</span>
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('keyword')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 transition cursor-pointer ${
                  searchMode === 'keyword'
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Search className="w-3 h-3" />
                <span>Exact Keyword</span>
              </button>
            </div>
          </div>

          {/* Semantic Search Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchMode === 'semantic' && searchQuery.trim()) {
                runSemanticVectorSearch(
                  searchQuery,
                  selectedSubject,
                  minSimilarityThreshold,
                  includeAiSynthesis
                );
              }
            }}
            className="relative flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <Search
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                  searchMode === 'semantic' ? 'text-emerald-400' : 'text-slate-400'
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchMode === 'semantic'
                    ? 'Ask a conceptual question or describe a topic (e.g., "how to prevent stack overflow in recursive calls" or "memory leaks in C++")...'
                    : 'Filter by exact document title, subject, or keyword...'
                }
                aria-label="Semantic search across RAG knowledge base"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-400 text-white text-xs sm:text-sm rounded-2xl pl-10 pr-10 py-3 outline-none transition shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setVectorResults(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {searchMode === 'semantic' && (
              <button
                type="submit"
                disabled={vectorSearchLoading || !searchQuery.trim()}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer shrink-0"
              >
                {vectorSearchLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Searching Vectors...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Vector Search</span>
                  </>
                )}
              </button>
            )}
          </form>

          {/* 1-Click Sample Semantic Concept Queries + Similarity Controls */}
          {searchMode === 'semantic' && (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Try Vector Query:</span>
                </span>
                {SAMPLE_SEMANTIC_QUERIES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchMode('semantic');
                      setSearchQuery(sample.query);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                      searchQuery === sample.query
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-950/90 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>

              {/* Minimum Cosine Similarity Filter & AI Synthesis Toggle */}
              <div className="flex items-center space-x-3 shrink-0 text-[11px]">
                <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl">
                  <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
                  <span className="text-slate-400 font-semibold">Min Match:</span>
                  <select
                    value={minSimilarityThreshold}
                    onChange={(e) => setMinSimilarityThreshold(Number(e.target.value))}
                    className="bg-transparent text-emerald-300 font-bold outline-none cursor-pointer"
                  >
                    <option value={0.18} className="bg-slate-900">
                      18% (Broad)
                    </option>
                    <option value={0.22} className="bg-slate-900">
                      22% (Balanced)
                    </option>
                    <option value={0.4} className="bg-slate-900">
                      40% (High Precision)
                    </option>
                    <option value={0.6} className="bg-slate-900">
                      60% (Strict Match)
                    </option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setIncludeAiSynthesis((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-xl border font-bold flex items-center space-x-1 transition cursor-pointer ${
                    includeAiSynthesis
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                  title="Synthesize a quick direct answer from the top vector-matched RAG chunks"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI RAG Summary: {includeAiSynthesis ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Subject / Language Filter Pills */}
          <div className="flex items-center space-x-2 pt-3 border-t border-slate-800/90 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 text-xs font-bold mr-1 shrink-0">Subject Scope:</span>
            {subjectsList.map((sub) => (
              <button
                key={sub}
                type="button"
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
                <span>{sub === 'all' ? 'All Subjects' : sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LIVE RAG VECTOR SEARCH RESULTS PANEL (Top Semantic Knowledge Base Chunks & Synthesis) */}
      {activeTab !== 'upload' &&
        searchMode === 'semantic' &&
        searchQuery.trim() &&
        vectorResults && (
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
            {/* Vector Telemetry Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <h3 className="text-sm sm:text-base font-black text-white">
                      RAG Vector Search Matches for "{vectorResults.query}"
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {vectorResults.matchedChunks.length} Chunks •{' '}
                      {vectorResults.matchedDocuments.length} Documents Matched
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Index: <span className="text-slate-300 font-semibold">{vectorResults.embeddingModel}</span> • Scanned{' '}
                    <span className="text-emerald-400 font-bold">{vectorResults.totalChunksScanned}</span> semantic chunks across{' '}
                    <span className="text-emerald-400 font-bold">{vectorResults.totalDocumentsScanned}</span> documents in{' '}
                    <span className="text-amber-300 font-mono">{vectorResults.searchLatencyMs}ms</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-start md:self-auto">
                {vectorResults.matchedChunks.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllVectorChunks((prev) => !prev)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition cursor-pointer"
                  >
                    {showAllVectorChunks
                      ? 'Show Top 3 Chunks'
                      : `Show All ${vectorResults.matchedChunks.length} Matched Chunks`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setVectorResults(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Clear Results
                </button>
              </div>
            </div>

            {/* AI Grounded Quick Answer Synthesis */}
            {vectorResults.aiSynthesis && (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      RAG Grounded Vector Synthesis
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleAskTutor(
                          vectorResults.matchedChunks[0]?.chunk.documentTitle || 'RAG Knowledge Base',
                          vectorResults.matchedChunks[0]?.chunk.subject || 'General',
                          vectorResults.aiSynthesis || ''
                        )
                      }
                      className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Continue in AI Tutor Chat</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
                    {vectorResults.aiSynthesis}
                  </p>
                </div>
              </div>
            )}

            {/* Matched RAG Knowledge Base Chunks */}
            {visibleVectorChunks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {visibleVectorChunks.map((match, idx) => {
                  const similarityPct = Math.round(match.similarity * 100);
                  const parentDoc =
                    match.document || documents.find((d) => d.id === match.chunk.documentId);

                  return (
                    <div
                      key={match.chunk.id}
                      className="bg-slate-950/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all shadow-lg"
                    >
                      <div className="space-y-2.5">
                        {/* Top Row: Rank, Subject & Cosine Similarity Score */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-black text-slate-300">
                              #{idx + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                              {match.chunk.subject}
                            </span>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border flex items-center space-x-1 ${getSimilarityBadgeStyle(
                              match.similarity
                            )}`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{similarityPct}% Vector Match</span>
                          </span>
                        </div>

                        {/* Cosine Similarity Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(15, similarityPct))}%` }}
                          />
                        </div>

                        {/* Document Title & Chunk Number */}
                        <div>
                          <div className="text-xs font-bold text-white line-clamp-1">
                            {match.chunk.documentTitle}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Knowledge Chunk #{match.chunk.chunkIndex}
                          </div>
                        </div>

                        {/* Grounded Passage Content */}
                        <p className="text-xs text-slate-300 leading-relaxed line-clamp-4 bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 font-sans">
                          {match.chunk.content}
                        </p>

                        {/* Matched Semantic Concepts */}
                        {match.matchedConcepts && match.matchedConcepts.length > 0 && (
                          <div className="flex items-center flex-wrap gap-1 pt-0.5">
                            {match.matchedConcepts.map((concept, cIdx) => (
                              <span
                                key={cIdx}
                                className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-amber-300 font-medium"
                              >
                                {concept}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Chunk Action Buttons */}
                      <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        {parentDoc && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenDocPreview(parentDoc, match.chunk.chunkIndex)
                            }
                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition cursor-pointer text-center"
                          >
                            Inspect Chunk #{match.chunk.chunkIndex}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            handleAskTutor(
                              match.chunk.documentTitle,
                              match.chunk.subject,
                              match.chunk.content
                            )
                          }
                          className="py-1.5 px-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-bold transition cursor-pointer flex items-center space-x-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Ask Tutor</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-slate-300 font-semibold">
                  No knowledge chunks exceeded the {Math.round(minSimilarityThreshold * 100)}% cosine similarity threshold.
                </p>
                <button
                  type="button"
                  onClick={() => setMinSimilarityThreshold(0.18)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer"
                >
                  Lower Threshold to 18% (Broad Recall)
                </button>
              </div>
            )}
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>
                {searchMode === 'semantic' && searchQuery.trim()
                  ? `Vector-Ranked Study Documents (${filteredDocuments.length})`
                  : `Indexed Study Documents (${filteredDocuments.length})`}
              </span>
            </h3>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <Search className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">
                No study documents matched your current filter
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Try broadening your subject filter to "All Subjects", lowering the minimum vector match threshold, or clearing the search query.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSubject('all');
                  setMinSimilarityThreshold(0.18);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Reset Search & Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDocuments.map((docItem) => {
                const ratingInfo = getRatingInfo(docItem.id);
                const vecDocMatch =
                  searchMode === 'semantic' && searchQuery.trim()
                    ? vectorDocMatchMap.get(docItem.id)
                    : undefined;

                return (
                  <div
                    key={docItem.id}
                    className={`bg-slate-900 border rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all group hover:-translate-y-0.5 ${
                      vecDocMatch
                        ? 'border-emerald-500/40 hover:border-emerald-400'
                        : 'border-slate-800 hover:border-amber-500/40'
                    }`}
                  >
                    <div>
                      {/* Header: Subject, Vector Similarity Badge & Rating Badge */}
                      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                            {docItem.subject}
                          </span>

                          {vecDocMatch && (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border flex items-center space-x-1 ${getSimilarityBadgeStyle(
                                vecDocMatch.maxSimilarity
                              )}`}
                              title={`Matched ${vecDocMatch.matchingChunksCount} RAG chunks via cosine similarity`}
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{Math.round(vecDocMatch.maxSimilarity * 100)}% Vector Match</span>
                            </span>
                          )}
                        </div>

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
                          <span>
                            {ratingInfo.rating > 0 ? ratingInfo.rating.toFixed(1) : '5.0'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({ratingInfo.count})
                          </span>
                        </button>
                      </div>

                      <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition line-clamp-2 leading-snug">
                        {docItem.title}
                      </h4>

                      {vecDocMatch ? (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/90 border border-emerald-500/25 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-emerald-400">
                              Best Match: Chunk #{vecDocMatch.topChunk.chunkIndex}
                            </span>
                            <span className="text-slate-400">
                              {vecDocMatch.matchingChunksCount} matching chunk
                              {vecDocMatch.matchingChunksCount > 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                            {vecDocMatch.topChunk.content}
                          </p>
                          {vecDocMatch.matchedConcepts.length > 0 && (
                            <div className="flex items-center flex-wrap gap-1 pt-0.5">
                              {vecDocMatch.matchedConcepts.slice(0, 3).map((concept, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded bg-slate-900 text-[9px] text-amber-300 border border-slate-800"
                                >
                                  {concept}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                          {docItem.summary || 'Verified syllabus notes grounded in RAG pipeline.'}
                        </p>
                      )}

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
                        onClick={() =>
                          handleAskTutor(
                            docItem.title,
                            docItem.subject,
                            vecDocMatch?.topChunk.content
                          )
                        }
                        className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer border border-slate-700 hover:border-emerald-500"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Ask Tutor</span>
                      </button>

                      <button
                        onClick={() =>
                          handleOpenDocPreview(docItem, vecDocMatch?.topChunk.chunkIndex)
                        }
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
          )}
        </div>
      )}

      {/* 2. VIDEO COURSES & TUTORIALS VIEW */}
      {!loading && activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCourses.map((course) => {
              const ratingInfo = getRatingInfo(course.id);
              const vecCourseMatch =
                searchMode === 'semantic' && searchQuery.trim()
                  ? vectorCourseMatchMap.get(course.id)
                  : undefined;

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
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/80">
                          {course.subject}
                        </span>
                        {vecCourseMatch && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                            {Math.round(vecCourseMatch.similarity * 100)}% Match
                          </span>
                        )}
                      </div>

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
      {activeTab === 'upload' && (
        <RagKnowledgeBase
          onDocumentAdded={() => {
            loadData();
          }}
        />
      )}

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
                  {highlightedChunkIndex
                    ? ` • Highlighted Vector Match: Chunk #${highlightedChunkIndex}`
                    : ''}
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
                  onClick={() => {
                    setPreviewDoc(null);
                    setHighlightedChunkIndex(null);
                  }}
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
                previewChunks.map((chunk, idx) => {
                  const isHighlighted =
                    highlightedChunkIndex !== null && chunk.chunkIndex === highlightedChunkIndex;
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border space-y-1.5 transition-all ${
                        isHighlighted
                          ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                          Chunk #{chunk.chunkIndex || idx + 1}
                        </span>
                        {isHighlighted && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                            Top Vector Search Match
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans">
                        {chunk.content}
                      </p>
                      {chunk.keywords && chunk.keywords.length > 0 && (
                        <div className="flex items-center flex-wrap gap-1 pt-1">
                          {chunk.keywords.map((kw, kIdx) => (
                            <span
                              key={kIdx}
                              className="px-2 py-0.5 rounded bg-slate-900 text-[10px] text-slate-400 border border-slate-800"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Ready for AI Tutor RAG retrieval.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => {
                  setPreviewDoc(null);
                  setHighlightedChunkIndex(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl cursor-pointer"
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
