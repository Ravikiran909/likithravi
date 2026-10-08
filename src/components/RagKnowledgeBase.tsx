import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  FileCode,
  Search,
  Check,
  Trash2,
  Sparkles,
  BookOpen,
  Layers,
  Bot,
  AlertCircle,
  RefreshCw,
  Eye,
  X,
  FileUp,
  Cpu,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { DocumentRecord, DocumentChunk } from '../types/index.ts';
import { extractTextFromPdfFile, extractTextFromGenericFile } from '../utils/pdfExtractor.ts';
import { db, doc, setDoc, deleteDoc } from '../firebase.ts';

interface RagKnowledgeBaseProps {
  onDocumentAdded?: () => void;
}

export const RagKnowledgeBase: React.FC<RagKnowledgeBaseProps> = ({ onDocumentAdded }) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'explorer' | 'tester'>('upload');

  // Ingestion Mode: 'pdf_upload' | 'paste'
  const [ingestMode, setIngestMode] = useState<'pdf_upload' | 'paste'>('pdf_upload');

  // Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Python');
  const [category, setCategory] = useState('Textbook Extract');
  const [content, setContent] = useState('');
  const [tutorDirective, setTutorDirective] = useState('');
  const [originalFilename, setOriginalFilename] = useState('');
  const [extractedFileStats, setExtractedFileStats] = useState<{
    filename: string;
    sizeKb: number;
    numPages?: number;
    wordCount: number;
  } | null>(null);

  // File parsing states
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Chunk Preview
  const [previewChunks, setPreviewChunks] = useState<string[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Search & Test State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentChunk[]>([]);
  const [searching, setSearching] = useState(false);

  // Tutor Simulator State
  const [testQuestion, setTestQuestion] = useState('How does Python GIL affect multithreading?');
  const [testSubject, setTestSubject] = useState('Python');
  const [tutorResponse, setTutorResponse] = useState<string | null>(null);
  const [testingTutor, setTestingTutor] = useState(false);
  const [matchedTestChunks, setMatchedTestChunks] = useState<DocumentChunk[]>([]);

  // Explorer State
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('All');
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setTotalChunks(data.totalChunks || 0);
      }
    } catch (err) {
      console.error('Failed to load knowledge base documents', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractError(null);
    setExtractedFileStats(null);

    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

      let extractedText = '';
      let pages = 1;
      let sizeKb = Math.max(1, Math.round(file.size / 1024));

      if (isPdf) {
        const result = await extractTextFromPdfFile(file);
        extractedText = result.text;
        pages = result.numPages;
        sizeKb = result.sizeKb;
      } else {
        const result = await extractTextFromGenericFile(file);
        extractedText = result.text;
        sizeKb = result.sizeKb;
      }

      if (!extractedText.trim()) {
        throw new Error('No readable text found in document. Please try pasting the text manually.');
      }

      // Auto populate fields
      setContent(extractedText);
      setOriginalFilename(file.name);
      if (!title) {
        const cleanName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setTitle(cleanName);
      }

      const words = extractedText.trim().split(/\s+/).length;
      setExtractedFileStats({
        filename: file.name,
        sizeKb,
        numPages: isPdf ? pages : undefined,
        wordCount: words,
      });

      // Automatically generate chunk preview
      triggerChunkPreview(extractedText);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setExtractError(err.message || 'Failed to extract text from file.');
    } finally {
      setIsExtracting(false);
    }
  };

  const triggerChunkPreview = async (textToChunk: string) => {
    if (!textToChunk.trim()) {
      setPreviewChunks([]);
      return;
    }
    setIsPreviewing(true);
    try {
      const res = await fetch('/api/documents/preview-chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textToChunk }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewChunks(data.chunks || []);
      }
    } catch (e) {
      console.error('Failed to preview chunks', e);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleApplySampleTemplate = (type: 'python' | 'calculus' | 'dsa' | 'java') => {
    if (type === 'python') {
      setTitle('Python Memory Model & GIL Architecture');
      setSubject('Python');
      setCategory('Course Notes');
      setTutorDirective('Emphasize that the Global Interpreter Lock (GIL) limits true multi-core CPU parallelism in CPython.');
      const sample = `Python Global Interpreter Lock (GIL) and Concurrency Notes:
In CPython, the Global Interpreter Lock (GIL) is a mutex that protects access to Python objects, preventing multiple threads from executing Python bytecodes at once.

Key Rules for Students:
1. I/O-bound tasks (network requests, disk reading) release the GIL while waiting, so multi-threading works efficiently.
2. CPU-bound calculations (number crunching, image processing) cannot run on multiple CPU cores via threading; use the multiprocessing module or ProcessPoolExecutor instead.
3. Memory Management: Python uses reference counting combined with a cyclic garbage collector. When reference count drops to 0, memory is immediately deallocated.

Common Exam Trap:
Using ThreadPoolExecutor for heavy sorting or matrix multiplication will NOT speed up execution in standard Python due to GIL contention.`;
      setContent(sample);
      triggerChunkPreview(sample);
      setExtractedFileStats({
        filename: 'python_gil_guide.pdf',
        sizeKb: 3,
        wordCount: sample.split(/\s+/).length,
      });
    } else if (type === 'calculus') {
      setTitle('Definite & Indefinite Integration Mastery');
      setSubject('Calculus');
      setCategory('Formula Sheet');
      setTutorDirective('Always remind student to verify integration bounds and remember the +C constant for indefinite integrals.');
      const sample = `Calculus Theorem & Integration Patterns:
Fundamental Theorem of Calculus (FTC):
If f is continuous on [a, b] and F is an antiderivative of f, then Integral from a to b of f(x) dx = F(b) - F(a).

Integration by Parts Formula:
Integral of u dv = u*v - Integral of v du.
Mnemonic Rule (LIATE):
L - Logarithmic functions (ln x)
I - Inverse trigonometric functions (arctan x)
A - Algebraic functions (x^2, 3x)
T - Trigonometric functions (sin x, cos x)
E - Exponential functions (e^x)

Standard Limits:
lim(x->0) [sin(x) / x] = 1.
lim(x->0) [(e^x - 1) / x] = 1.`;
      setContent(sample);
      triggerChunkPreview(sample);
      setExtractedFileStats({
        filename: 'calculus_integration_theorems.pdf',
        sizeKb: 2,
        wordCount: sample.split(/\s+/).length,
      });
    } else if (type === 'dsa') {
      setTitle('Binary Search Invariants & Tree Traversals');
      setSubject('DSA');
      setCategory('Textbook Extract');
      setTutorDirective('Ensure the student uses mid = low + (high - low) / 2 to prevent integer overflow.');
      const sample = `Binary Search Algorithm Invariant & Correctness:
Algorithm:
Given a sorted array A[0...n-1] and key K:
low = 0, high = n - 1
while low <= high:
    mid = low + ((high - low) >> 1)
    if A[mid] == K: return mid
    elif A[mid] < K: low = mid + 1
    else: high = mid - 1
return -1

Binary Tree Traversals:
- Inorder: Left -> Root -> Right (Yields sorted order in a Binary Search Tree)
- Preorder: Root -> Left -> Right (Used for serialization and tree cloning)
- Postorder: Left -> Right -> Root (Used for tree deletion and bottom-up dynamic programming on trees)`;
      setContent(sample);
      triggerChunkPreview(sample);
      setExtractedFileStats({
        filename: 'dsa_binary_search_trees.pdf',
        sizeKb: 3,
        wordCount: sample.split(/\s+/).length,
      });
    } else {
      setTitle('Java Memory Model & OOP Polymorphism');
      setSubject('Java');
      setCategory('Course Notes');
      setTutorDirective('Explain that method overriding is dynamic runtime polymorphism while overloading is compile-time static polymorphism.');
      const sample = `Java OOP Architecture & JVM Memory:
1. Polymorphism:
- Compile-time (Static): Method Overloading (same name, different parameter signature in same class).
- Runtime (Dynamic): Method Overriding (@Override annotation, resolved via virtual method tables in JVM).

2. JVM Memory Segments:
- Stack: Stores primitive local variables and method call stack frames. Fast allocation, thread-private.
- Heap: Stores all object instances and class member fields. Shared across threads, managed by Garbage Collector.
- Metaspace: Stores class definitions, method metadata, and bytecodes.`;
      setContent(sample);
      triggerChunkPreview(sample);
      setExtractedFileStats({
        filename: 'java_jvm_memory_oop.pdf',
        sizeKb: 2,
        wordCount: sample.split(/\s+/).length,
      });
    }
  };

  const handleIngestDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      // Append tutor directive to content if provided
      let finalContent = content;
      if (tutorDirective.trim()) {
        finalContent = `[TUTOR INSTRUCTION & CITATION DIRECTIVE: ${tutorDirective.trim()}]\n\n${content}`;
      }

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          subject,
          category,
          originalFilename: originalFilename || `${title.toLowerCase().replace(/\s+/g, '_')}.txt`,
          content: finalContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const uploadedDoc: DocumentRecord = data.document;

        // Persist RAG document metadata in Firestore database
        if (db && uploadedDoc?.id) {
          await setDoc(
            doc(db, 'documents', uploadedDoc.id),
            {
              id: uploadedDoc.id,
              title: String(uploadedDoc.title || title).slice(0, 195),
              subject: String(uploadedDoc.subject || subject).slice(0, 95),
              category: String(uploadedDoc.category || category).slice(0, 95),
              originalFilename: String(uploadedDoc.originalFilename || 'notes.txt').slice(0, 195),
              fileSizeKb: Number(uploadedDoc.fileSizeKb) || 1,
              uploadedAt: uploadedDoc.uploadedAt || new Date().toISOString(),
              chunkCount: Number(uploadedDoc.chunkCount) || 1,
              summary: String(uploadedDoc.summary || content.slice(0, 180)).slice(0, 1900),
            },
            { merge: true }
          ).catch(() => {});
        }

        setSuccessMessage(
          `Document "${uploadedDoc.title}" successfully indexed into ${uploadedDoc.chunkCount} semantic chunks and stored in database!`
        );
        setTitle('');
        setContent('');
        setTutorDirective('');
        setOriginalFilename('');
        setExtractedFileStats(null);
        setPreviewChunks([]);
        fetchDocuments();
        if (onDocumentAdded) onDocumentAdded();
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setExtractError(errData.error || 'Failed to ingest document');
      }
    } catch (err: any) {
      setExtractError(err.message || 'Ingestion request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocument = async (docId: string, _docTitle: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        if (db && docId) {
          await deleteDoc(doc(db, 'documents', docId)).catch(() => {});
        }
        fetchDocuments();
        if (onDocumentAdded) onDocumentAdded();
      }
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  };

  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch('/api/documents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.chunks || []);
      }
    } catch (err) {
      console.error('Knowledge base search failed', err);
    } finally {
      setSearching(false);
    }
  };

  const handleTestTutorResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuestion.trim()) return;

    setTestingTutor(true);
    setTutorResponse(null);
    setMatchedTestChunks([]);

    try {
      const res = await fetch('/api/documents/test-tutor-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: testQuestion,
          subject: testSubject,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTutorResponse(data.tutorAnswer);
        setMatchedTestChunks(data.matchedChunks || []);
      } else {
        setTutorResponse('Error running tutor simulator.');
      }
    } catch (err: any) {
      setTutorResponse(`Simulation error: ${err.message}`);
    } finally {
      setTestingTutor(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    if (selectedSubjectFilter === 'All') return true;
    return doc.subject.toLowerCase() === selectedSubjectFilter.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats Overview */}
      <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-indigo-950/40 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span>RAG Knowledge Base & Curriculum Ingestion</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              AI Tutor Context & Study Materials Engine
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Upload PDF textbooks, lecture slides, or syllabus notes to ground the WhatsApp AI Tutor with your institution's verified course content.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center space-x-4 bg-slate-950/60 p-3 rounded-2xl border border-slate-800 self-stretch md:self-auto justify-around">
            <div className="text-center px-3">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Documents
              </span>
              <span className="text-xl font-bold text-white">{documents.length}</span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center px-3">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Semantic Chunks
              </span>
              <span className="text-xl font-bold text-emerald-400">{totalChunks}</span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center px-3">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Status
              </span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Live RAG</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveSubTab('upload')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 ${
              activeSubTab === 'upload'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Ingest Document (PDF / Text)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('explorer')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 ${
              activeSubTab === 'explorer'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Indexed Documents ({documents.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('tester')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 ${
              activeSubTab === 'tester'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Test Tutor Context Response</span>
          </button>
        </div>
      </div>

      {/* TAB 1: UPLOAD & INGESTION */}
      {activeSubTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Ingestion Form (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-white text-base flex items-center space-x-2">
                  <FileUp className="w-5 h-5 text-emerald-400" />
                  <span>Educational Document Ingestion</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Upload PDF or paste course material to customize the AI tutor's answers.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setIngestMode('pdf_upload')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    ingestMode === 'pdf_upload'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  PDF / File Upload
                </button>
                <button
                  type="button"
                  onClick={() => setIngestMode('paste')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    ingestMode === 'paste'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Paste Notes
                </button>
              </div>
            </div>

            {/* Quick Template Fill Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">Quick Curriculum Templates:</span>
              <button
                type="button"
                onClick={() => handleApplySampleTemplate('python')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs border border-slate-700 transition"
              >
                🐍 Python GIL & Scope
              </button>
              <button
                type="button"
                onClick={() => handleApplySampleTemplate('calculus')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs border border-slate-700 transition"
              >
                ∫ Calculus Integration
              </button>
              <button
                type="button"
                onClick={() => handleApplySampleTemplate('dsa')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs border border-slate-700 transition"
              >
                🌲 DSA Binary Search
              </button>
              <button
                type="button"
                onClick={() => handleApplySampleTemplate('java')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs border border-slate-700 transition"
              >
                ☕ Java Memory Model
              </button>
            </div>

            <form onSubmit={handleIngestDocument} className="space-y-4">
              {/* PDF Dropzone if in Upload Mode */}
              {ingestMode === 'pdf_upload' && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.txt,.md,.json,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-950/40 hover:bg-slate-950/80 group"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl group-hover:scale-110 transition border border-emerald-500/20">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-semibold text-white">
                        Click to upload or drag & drop PDF, TXT, or MD
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Automatic text extraction extracts paragraphs, theorems, and definitions into semantic chunks.
                      </p>
                    </div>
                  </div>

                  {isExtracting && (
                    <div className="mt-2 p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center space-x-2 text-xs text-indigo-300">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting text from PDF file...</span>
                    </div>
                  )}

                  {extractError && (
                    <div className="mt-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center space-x-2 text-xs text-rose-300">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{extractError}</span>
                    </div>
                  )}

                  {extractedFileStats && (
                    <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold">{extractedFileStats.filename}</span>
                        <span className="text-[11px] text-emerald-400/70">({extractedFileStats.sizeKb} KB)</span>
                      </div>
                      <div className="text-[11px] text-emerald-200">
                        {extractedFileStats.numPages ? `${extractedFileStats.numPages} pages • ` : ''}
                        {extractedFileStats.wordCount} words extracted
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Title & Subject Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Chapter 4: Integration by Parts & Theorems"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Subject *
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="Python">Python</option>
                    <option value="Calculus">Calculus</option>
                    <option value="DSA">DSA</option>
                    <option value="Java">Java</option>
                    <option value="Machine Learning">Machine Learning</option>
                    <option value="Physics">Physics</option>
                    <option value="General">General Curriculum</option>
                  </select>
                </div>
              </div>

              {/* Category & Tutor Directive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Document Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="Textbook Extract">Textbook Extract</option>
                    <option value="Course Notes">Course Notes</option>
                    <option value="Formula Sheet">Formula Sheet</option>
                    <option value="Cheatsheet">Cheatsheet</option>
                    <option value="Exam Reference">Past Exam Reference</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    AI Tutor Citation Directive (Optional)
                  </label>
                  <input
                    type="text"
                    value={tutorDirective}
                    onChange={(e) => setTutorDirective(e.target.value)}
                    placeholder="e.g. Always cite LIATE rule when explaining"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Document Content Textarea */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Document Text & Content *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {content.length} characters • {content ? content.trim().split(/\s+/).length : 0} words
                  </span>
                </div>
                <textarea
                  required
                  rows={8}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    triggerChunkPreview(e.target.value);
                  }}
                  placeholder="Paste educational material, key formulas, theorems, code snippets, or extracted PDF notes here..."
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !title || !content}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition active:scale-95 flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Chunking & Indexing into RAG Database...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ingest Document & Build Semantic Index</span>
                  </>
                )}
              </button>

              {successMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-xs text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}
            </form>
          </div>

          {/* Right Panel: Live Chunk Preview & RAG Index Status (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="font-semibold text-white text-xs flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>Live Semantic Chunker Preview</span>
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 font-bold">
                  {previewChunks.length} Chunks Generated
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Text is split into sliding window passages with contextual overlap. When students message the WhatsApp bot, relevant chunks are matched and provided to the Gemini tutor agent.
              </p>

              {isPreviewing ? (
                <div className="p-4 bg-slate-950/60 rounded-xl text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Calculating chunk boundaries...</span>
                </div>
              ) : previewChunks.length > 0 ? (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {previewChunks.map((chunk, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 text-xs space-y-1"
                    >
                      <div className="flex justify-between items-center text-[10px] text-sky-400 font-semibold">
                        <span>Chunk #{idx + 1}</span>
                        <span>{chunk.length} chars</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-3">
                        {chunk}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  Upload a PDF or paste notes to preview how the text will be partitioned into semantic chunks.
                </div>
              )}
            </div>

            {/* Quick Guidance Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <h4 className="font-semibold text-white text-xs flex items-center space-x-1.5">
                <Bot className="w-4 h-4 text-emerald-400" />
                <span>How This Affects the AI Tutor</span>
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                When a student asks a doubt on WhatsApp (e.g. <em>"Explain the LIATE rule in integration"</em>), the RAG pipeline automatically retrieves these chunks and instructs Gemini:
              </p>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-emerald-300 font-mono">
                "Ground your answer in verified course notes. Cite official theorems and warn the student of common pitfalls."
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INDEXED DOCUMENTS EXPLORER */}
      {activeSubTab === 'explorer' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">Filter by Subject:</span>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Python', 'Calculus', 'DSA', 'Java', 'Machine Learning'].map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubjectFilter(sub)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      selectedSubjectFilter === sub
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={fetchDocuments}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium border border-slate-700 flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Index</span>
            </button>
          </div>

          {/* Documents Grid */}
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading documents...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-white">No documents found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No educational material has been indexed under this filter yet. Ingest your first PDF textbook or lecture notes!
              </p>
              <button
                onClick={() => setActiveSubTab('upload')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
              >
                Ingest Material Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-3 transition shadow-lg group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {doc.subject}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition leading-snug">
                      {doc.title}
                    </h4>

                    <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                      {doc.summary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Layers className="w-3.5 h-3.5 text-sky-400" />
                        <span>{doc.chunkCount} Chunks</span>
                      </span>
                      <span>{doc.fileSizeKb} KB</span>
                      <span className="text-slate-500">{doc.category}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-medium border border-slate-700 transition flex items-center justify-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                        <span>View Details</span>
                      </button>

                      <button
                        onClick={() => handleDeleteDocument(doc.id, doc.title)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 transition"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TESTER & TUTOR SIMULATOR */}
      {activeSubTab === 'tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Test Query & Tutor Simulator Form (6 cols) */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-white text-base flex items-center space-x-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <span>Test Contextual AI Tutor Response</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate a WhatsApp student question to verify how the tutor incorporates your uploaded course notes.
              </p>
            </div>

            <form onSubmit={handleTestTutorResponse} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Subject Context
                </label>
                <select
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="Python">Python</option>
                  <option value="Calculus">Calculus</option>
                  <option value="DSA">DSA</option>
                  <option value="Java">Java</option>
                  <option value="Machine Learning">Machine Learning</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Student Question / Query
                </label>
                <textarea
                  rows={3}
                  required
                  value={testQuestion}
                  onChange={(e) => setTestQuestion(e.target.value)}
                  placeholder="e.g. Can you explain how the GIL works in Python multithreading?"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={testingTutor || !testQuestion}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow transition flex items-center justify-center space-x-2"
              >
                {testingTutor ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying RAG & Generating Tutor Response...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5" />
                    <span>Run AI Tutor Simulator</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Semantic Search Tester */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Search className="w-3.5 h-3.5 text-sky-400" />
                <span>Raw Vector / Semantic Search Tester</span>
              </h4>
              <form onSubmit={handleTestSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. integration by parts, call stack..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl border border-slate-700 transition"
                >
                  Search
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-2 mt-2">
                  <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                    Search Results ({searchResults.length}):
                  </span>
                  {searchResults.map((c, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="font-semibold text-white text-[11px] mb-0.5">
                        {c.documentTitle} ({c.subject})
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Simulated WhatsApp AI Tutor Output (6 cols) */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="font-semibold text-white text-xs flex items-center space-x-2">
                <Bot className="w-4 h-4 text-emerald-400" />
                <span>Simulated WhatsApp Output</span>
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                WhatsApp Cloud API Format
              </span>
            </div>

            {tutorResponse ? (
              <div className="space-y-4">
                {/* Chat Bubble Presentation */}
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-slate-100 whitespace-pre-wrap font-sans leading-relaxed shadow-lg">
                  {tutorResponse}
                </div>

                {/* Grounding Source Info */}
                {matchedTestChunks.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Retrieved RAG Sources Cited by Agent:</span>
                    </div>
                    {matchedTestChunks.map((chunk, idx) => (
                      <div key={idx} className="text-[11px] text-slate-300 flex items-center space-x-1.5">
                        <span className="text-emerald-400">•</span>
                        <span className="font-medium text-white">{chunk.documentTitle}</span>
                        <span className="text-slate-500">({chunk.subject})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center space-y-2">
                <Bot className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  Run the tutor simulator to preview how the WhatsApp AI tutor answers questions with your custom RAG knowledge base.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Details Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {viewingDoc.subject}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{viewingDoc.title}</h3>
              </div>
              <button onClick={() => setViewingDoc(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Category</span>
                <span className="font-semibold text-white">{viewingDoc.category}</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Chunks</span>
                <span className="font-semibold text-emerald-400">{viewingDoc.chunkCount} Chunks</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Size</span>
                <span className="font-semibold text-white">{viewingDoc.fileSizeKb} KB</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300">Document Summary & Notes:</span>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono">
                {viewingDoc.summary}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
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
