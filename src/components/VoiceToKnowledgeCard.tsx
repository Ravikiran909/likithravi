import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  FileText,
  Search,
  CheckCircle2,
  BookOpen,
  Pin,
  Volume2,
  RefreshCw,
  Layers,
  Wand2,
  Radio,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { StudentProfile, DocumentRecord, DocumentChunk } from '../types/index.ts';

interface VoiceToKnowledgeCardProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  onNavigateToMaterials?: () => void;
  onLogStudyMinutes?: (mins: number, label?: string) => void;
}

const SAMPLE_VERBAL_SUMMARIES: Record<string, { topic: string; text: string }> = {
  Python: {
    topic: 'Recursion Call Stack & Memoization',
    text: 'In today’s study session on Python recursion, I learned that every recursive function requires a strict base case to terminate unwinding and prevent a RecursionError stack overflow. When solving overlapping subproblems like Fibonacci orclimbing stairs, adding functools.lru_cache memoizes previously computed states and reduces time complexity from exponential O(2^n) down to linear O(n) time.',
  },
  Calculus: {
    topic: 'Integration by Parts & LIATE Rule',
    text: 'Today I practiced Integration by Parts using the formula integral of u dv equals u times v minus the integral of v du. To choose u effectively, we follow the LIATE priority hierarchy: Logarithmic, Inverse trigonometric, Algebraic, Trigonometric, and Exponential functions.',
  },
  DSA: {
    topic: 'Binary Search Invariants & Monotonicity',
    text: 'During my Data Structures session on Binary Search, I summarized that the search space must maintain a monotonic predicate. Using mid equals low plus high minus low divided by 2 prevents integer overflow, and we must carefully update high to mid minus 1 or low to mid plus 1 to avoid infinite loops on two-element boundary arrays.',
  },
};

export const VoiceToKnowledgeCard: React.FC<VoiceToKnowledgeCardProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToMaterials,
  onLogStudyMinutes,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>(
    profile.subjects[0] || 'Python'
  );
  const [topicInput, setTopicInput] = useState<string>(
    profile.weakTopics?.[0] || 'Recursion Call Stack & Memoization'
  );
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');
  const [pinAutomatically, setPinAutomatically] = useState<boolean>(true);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedResult, setSavedResult] = useState<{
    document: DocumentRecord;
    chunks: DocumentChunk[];
    structuredNote: string;
  } | null>(null);

  // Instant RAG Search verification state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<DocumentChunk[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    setSavedResult(null);
    setRecordingSeconds(0);
    chunksRef.current = [];

    // 1. Start Web Speech API live speech recognition if supported in browser
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
          if (finalTranscript.trim()) {
            setTranscript(finalTranscript.trim());
          }
        };
        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        // Fallback to MediaRecorder audio capture
      }
    }

    // 2. Start MediaRecorder microphone stream if available
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        setAudioMimeType(recorder.mimeType || 'audio/webm');

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          if (chunksRef.current.length > 0) {
            const blob = new Blob(chunksRef.current, {
              type: recorder.mimeType || 'audio/webm',
            });
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = String(reader.result || '');
              const rawBase64 = base64data.includes(',')
                ? base64data.split(',')[1]
                : base64data;
              setAudioBase64(rawBase64);
            };
            reader.readAsDataURL(blob);
          }
        };

        recorder.start();
      }
    } catch {
      // If hardware mic permission is denied in iframe preview, allow live dictation/simulated voice capture
      if (!transcript.trim()) {
        const preset =
          SAMPLE_VERBAL_SUMMARIES[selectedSubject] || SAMPLE_VERBAL_SUMMARIES.Python;
        setTopicInput(preset.topic);
        setTranscript(preset.text);
      }
    }

    setIsRecording(true);
    timerRef.current = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  };

  const handleLoadSampleVerbalSummary = () => {
    const sample =
      SAMPLE_VERBAL_SUMMARIES[selectedSubject] || SAMPLE_VERBAL_SUMMARIES.Python;
    setTopicInput(sample.topic);
    setNoteTitle(`Voice Summary: ${sample.topic}`);
    setTranscript(sample.text);
    setErrorMsg(null);
  };

  const handleProcessAndSaveToRag = async () => {
    if (!transcript.trim() && !audioBase64) {
      setErrorMsg('Please record a verbal summary or click "Load Sample Voice Summary" first.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/voice-to-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType: audioMimeType,
          transcript: transcript.trim(),
          title:
            noteTitle.trim() ||
            `Voice Study Note: ${topicInput.trim() || selectedSubject}`,
          subject: selectedSubject,
          topic: topicInput.trim() || selectedSubject,
          userId: profile.userId,
          pinToProfile: pinAutomatically,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save voice note to RAG knowledge base.');
      } else {
        setSavedResult({
          document: data.document,
          chunks: data.chunks || [],
          structuredNote: data.structuredNote,
        });
        if (data.rawTranscript && !transcript.trim()) {
          setTranscript(data.rawTranscript);
        }
        if (data.updatedProfile) {
          onProfileUpdate(data.updatedProfile);
        }
        if (onLogStudyMinutes) {
          onLogStudyMinutes(10, `Voice-to-Knowledge Summary (${selectedSubject})`);
        }
        setSearchQuery(topicInput.split(' ')[0] || selectedSubject);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while saving voice note to RAG.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearchRagNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/documents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          limit: 3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.chunks || []);
      }
    } catch {
      // Ignore search error
    } finally {
      setIsSearching(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start space-x-3.5">
          <div
            className={`p-3 rounded-2xl border shrink-0 transition ${
              isRecording
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-500/30'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
            }`}
          >
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Voice-to-Knowledge RAG Synthesizer
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                AI Audio-to-RAG Indexing
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-white mt-0.5">
              Record Verbal Study Summaries → Searchable RAG Knowledge Notes
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Speak what you learned after a study session using your microphone. The AI structures your verbal summary into key concepts, formulas, and active recall questions, then indexes it into your searchable RAG knowledge base.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLoadSampleVerbalSummary}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Load Sample Voice Summary
          </button>
          {onNavigateToMaterials && (
            <button
              type="button"
              onClick={onNavigateToMaterials}
              className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
            >
              Browse RAG Library →
            </button>
          )}
        </div>
      </div>

      {/* Main Recording & AI Processing Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Microphone Recorder & Transcript Editor */}
        <div className="lg:col-span-7 space-y-4 bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Study Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
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
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Session Topic / Concept
              </label>
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g., Recursion Call Stack & Memoization"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Microphone Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center space-x-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/25 flex items-center space-x-2 transition cursor-pointer active:scale-95"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Microphone Recording</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center space-x-2 transition cursor-pointer active:scale-95"
                >
                  <Square className="w-4 h-4 fill-slate-950" />
                  <span>Stop Recording ({formatTimer(recordingSeconds)})</span>
                </button>
              )}

              <div className="text-xs">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRecording ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
                    }`}
                  />
                  <span>
                    {isRecording
                      ? 'Listening & transcribing verbal summary...'
                      : 'Microphone Ready'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Supports live voice dictation + AI semantic structuring
                </div>
              </div>
            </div>

            <label className="flex items-center space-x-1.5 text-[11px] text-amber-300 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={pinAutomatically}
                onChange={(e) => setPinAutomatically(e.target.checked)}
                className="accent-amber-500 rounded cursor-pointer"
              />
              <span>Pin to My Study Materials</span>
            </label>
          </div>

          {/* Verbal Summary Transcript Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-300">
                Recorded Verbal Summary Transcript (Editable before AI indexing)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {transcript.length} chars
              </span>
            </div>
            <textarea
              rows={4}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Click 'Start Microphone Recording' and summarize what you just studied in your own words, or type/paste your verbal takeaways here..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder={`Optional Custom Note Title (Default: Voice Study Note: ${topicInput})`}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />

            <button
              type="button"
              onClick={handleProcessAndSaveToRag}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center space-x-2 transition cursor-pointer shrink-0 active:scale-95"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing & Indexing in RAG...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Process with AI & Save to RAG</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: AI-Processed RAG Note Preview & Instant Search Verification */}
        <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
          {savedResult ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                    Saved & Indexed in RAG Knowledge Base!
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                  {savedResult.chunks.length} Semantic Chunk(s)
                </span>
              </div>

              <div className="text-xs font-bold text-white">
                📄 {savedResult.document.title} ({savedResult.document.subject})
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 max-h-[190px] overflow-y-auto text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                {savedResult.structuredNote}
              </div>

              {onNavigateToChat && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigateToChat(
                      `Quiz me on my newly recorded Voice-to-Knowledge RAG note "${savedResult.document.title}"!`
                    )
                  }
                  className="w-full py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition cursor-pointer"
                >
                  Practice This Voice Note in WhatsApp Simulator →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>How Voice-to-Knowledge Works</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                1. Record a 30–60 second verbal summary of what you just learned (Feynman technique).
                <br />
                2. Our AI extracts definitions, formulas, and self-check questions.
                <br />
                3. The note is chunked and indexed into the RAG vector store so you can search it below or use it in Leitner flashcards.
              </p>
            </div>
          )}

          {/* Instant Search Across Saved RAG Knowledge Base Notes */}
          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            <form onSubmit={handleSearchRagNotes} className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search RAG knowledge base notes..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 text-xs font-bold transition cursor-pointer"
              >
                {isSearching ? '...' : 'Search RAG'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-1.5 max-h-[130px] overflow-y-auto pr-1">
                {searchResults.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px]"
                  >
                    <div className="font-bold text-indigo-300">
                      📄 {chunk.documentTitle} ({chunk.subject})
                    </div>
                    <p className="text-slate-300 line-clamp-2 mt-0.5">{chunk.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
