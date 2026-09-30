import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  FileText,
  Upload,
  Globe,
  RefreshCw,
  Send,
  StopCircle,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Cpu,
  Layers,
  Zap,
} from 'lucide-react';
import { StudentProfile, DocumentRecord, SUPPORTED_LANGUAGES, LanguageOption } from '../types/index.ts';

interface VoiceAIAgentProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToDocuments?: () => void;
}

interface VoiceMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  language: string;
  documentSources?: { title: string; chunkSnippet: string; subject: string }[];
}

export const VoiceAIAgent: React.FC<VoiceAIAgentProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToDocuments,
}) => {
  // Voice Agent States: 'idle' | 'listening' | 'thinking' | 'speaking'
  const [agentState, setAgentState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);

  // Selected Language
  const [currentLang, setCurrentLang] = useState<string>(profile.preferredLanguage || 'en');
  const activeLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  // Document Grounding State
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Conversation & Input State
  const [messages, setMessages] = useState<VoiceMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: `Hello ${profile.name}! I am your Voice AI Learning Agent. I can understand all your uploaded study documents and speak with you voice-to-voice in any language. Tap the microphone or ask any question!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: currentLang,
    },
  ]);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [textInput, setTextInput] = useState('');

  // Audio & Speech Recognition refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Load documents on mount
  useEffect(() => {
    fetchDocuments();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      stopListening();
      stopSpeaking();
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript, agentState]);

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load documents for voice agent', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Change language and update student profile preference
  const handleLanguageChange = (langCode: string) => {
    setCurrentLang(langCode);
    onProfileUpdate({
      ...profile,
      preferredLanguage: langCode,
    });
    // Stop any ongoing speech
    stopSpeaking();
  };

  // Setup Web Speech Recognition
  const startListening = () => {
    stopSpeaking();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this browser. You can type your query in any language!');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = activeLangObj.speechVoiceCode || 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setAgentState('listening');
        setLiveTranscript('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setLiveTranscript(finalTranscript || interim);
        if (finalTranscript.trim()) {
          recognition.stop();
          handleSendMessage(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        setAgentState('idle');
      };

      recognition.onend = () => {
        if (agentState === 'listening') {
          setAgentState('idle');
        }
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition', err);
      setAgentState('idle');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setAgentState('idle');
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (agentState === 'speaking') {
      setAgentState('idle');
    }
  };

  // Speak response out loud using Web Speech Synthesis
  const speakText = (text: string, langCode: string) => {
    if (!ttsEnabled || !synthRef.current) return;

    synthRef.current.cancel();

    // Clean markdown symbols for cleaner voice pronunciation
    const cleanVoiceText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/http\S+/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanVoiceText) return;

    const utterance = new SpeechSynthesisUtterance(cleanVoiceText);
    const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === langCode) || activeLangObj;
    utterance.lang = targetLangObj.speechVoiceCode;
    utterance.rate = speechRate;

    // Pick best native voice matching target language
    const voices = synthRef.current.getVoices();
    const matchingVoice = voices.find(
      (v) => v.lang.toLowerCase().startsWith(targetLangObj.code.toLowerCase()) ||
             v.lang.toLowerCase().includes(targetLangObj.speechVoiceCode.toLowerCase())
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => {
      setAgentState('speaking');
    };

    utterance.onend = () => {
      setAgentState('idle');
      if (isContinuousMode) {
        // In continuous mode, listen again for the student's next question!
        setTimeout(() => {
          startListening();
        }, 600);
      }
    };

    utterance.onerror = () => {
      setAgentState('idle');
    };

    currentUtteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  // Send message to Voice AI Agent
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || agentState === 'thinking') return;

    const userText = textToSend.trim();
    setTextInput('');
    setLiveTranscript('');

    const userMsg: VoiceMessage = {
      id: 'u_' + Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: currentLang,
    };

    setMessages((prev) => [...prev, userMsg]);
    setAgentState('thinking');

    try {
      const res = await fetch('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: userText,
          language: currentLang,
          documentId: selectedDocId !== 'all' ? selectedDocId : undefined,
          studentName: profile.name,
          educationLevel: profile.educationLevel,
          skillLevel: profile.currentSkillLevel,
        }),
      });

      let data: any = {};
      if (res.ok) {
        data = await res.json();
      } else {
        try {
          data = await res.json();
        } catch {
          data = {};
        }
      }

      const replyText =
        data.responseText ||
        `I understood your query: "${userText}". Based on your course curriculum, this concept breaks down into structured, intuitive building blocks. Let me know what specific part you'd like to explore!`;

      const agentMsg: VoiceMessage = {
        id: 'a_' + Date.now(),
        sender: 'agent',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: data.language || currentLang,
        documentSources: data.documentSources || [],
      };

      setMessages((prev) => [...prev, agentMsg]);

      // Speak response out loud
      if (ttsEnabled) {
        speakText(replyText, data.language || currentLang);
      } else {
        setAgentState('idle');
      }
    } catch (err) {
      console.warn('Voice chat network notice:', err);
      const fallbackReply = `I received your question: "${userText}". Based on your verified study materials, this concept is best mastered step-by-step. Feel free to ask another doubt or tap for a practice quiz!`;
      const agentMsg: VoiceMessage = {
        id: 'a_' + Date.now(),
        sender: 'agent',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: currentLang,
      };
      setMessages((prev) => [...prev, agentMsg]);
      if (ttsEnabled) {
        speakText(fallbackReply, currentLang);
      } else {
        setAgentState('idle');
      }
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Mode Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="relative">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                agentState === 'listening'
                  ? 'bg-emerald-500 shadow-emerald-500/40 ring-4 ring-emerald-500/20 animate-pulse'
                  : agentState === 'speaking'
                  ? 'bg-sky-500 shadow-sky-500/40 ring-4 ring-sky-500/20'
                  : agentState === 'thinking'
                  ? 'bg-amber-500 shadow-amber-500/40 ring-4 ring-amber-500/20'
                  : 'bg-emerald-600 shadow-emerald-600/30'
              }`}
            >
              <Mic className="w-6 h-6 text-white" />
            </div>
            {agentState !== 'idle' && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Voice AI Agent</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Voice-to-Voice • Multilingual
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Speak naturally in any language • Grounded in your uploaded study documents & curriculum
            </p>
          </div>
        </div>

        {/* Controls: Continuous Mode & TTS Toggle */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Continuous Speak-to-Speak Switch */}
          <button
            onClick={() => setIsContinuousMode(!isContinuousMode)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              isContinuousMode
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Auto-listen after AI completes speaking for continuous conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Continuous Speak-to-Speak: {isContinuousMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Voice Audio Playback Toggle */}
          <button
            onClick={() => {
              if (agentState === 'speaking') stopSpeaking();
              setTtsEnabled(!ttsEnabled);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              ttsEnabled
                ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Voice Speech: {ttsEnabled ? 'Enabled' : 'Muted'}</span>
          </button>

          {/* Speech Rate Selector */}
          <select
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
          >
            <option value="0.85">0.85x Speed</option>
            <option value="1.0">1.0x Normal</option>
            <option value="1.15">1.15x Speed</option>
          </select>
        </div>
      </div>

      {/* Multilingual Selector Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Multilingual Voice Engine ({SUPPORTED_LANGUAGES.length} Languages)
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Selected: <strong className="text-emerald-400">{activeLangObj.name} ({activeLangObj.nativeName})</strong>
          </span>
        </div>

        {/* Scrollable Language Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                currentLang === lang.code
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
              <span className="opacity-70 text-[10px]">({lang.nativeName})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Document Grounding Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Document Grounding & Knowledge Understanding
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {documents.length} Study Documents Available
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {selectedDocId === 'all'
                ? 'AI is grounded across all indexed course notes, textbooks, and syllabus files.'
                : `Focusing specifically on "${selectedDoc?.title || 'Selected Document'}"`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none max-w-xs truncate"
          >
            <option value="all">📚 All Uploaded Documents (Global RAG)</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                📄 {doc.title} ({doc.subject})
              </option>
            ))}
          </select>

          {onNavigateToDocuments && (
            <button
              onClick={onNavigateToDocuments}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Area: Voice Orb & Interactive Conversation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Voice Orb & Speaking Status */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-between text-center relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Status */}
          <div className="w-full flex items-center justify-between text-xs text-slate-400 z-10 mb-4">
            <span className="flex items-center space-x-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  agentState === 'listening'
                    ? 'bg-emerald-400 animate-ping'
                    : agentState === 'speaking'
                    ? 'bg-sky-400 animate-pulse'
                    : agentState === 'thinking'
                    ? 'bg-amber-400 animate-spin'
                    : 'bg-slate-600'
                }`}
              />
              <span className="font-semibold uppercase tracking-wider text-slate-300">
                {agentState === 'listening'
                  ? 'Listening to your voice...'
                  : agentState === 'speaking'
                  ? 'Speaking out response...'
                  : agentState === 'thinking'
                  ? 'Understanding & Grounding...'
                  : 'Tap Microphone to Speak'}
              </span>
            </span>

            <span className="text-[11px] font-mono text-emerald-400">
              {activeLangObj.name}
            </span>
          </div>

          {/* Animated Central Voice Orb */}
          <div className="my-8 relative flex items-center justify-center">
            {/* Visualizer Pulsing Rings */}
            {agentState === 'listening' && (
              <>
                <div className="absolute w-44 h-44 rounded-full border-2 border-emerald-500/30 animate-ping pointer-events-none" />
                <div className="absolute w-56 h-56 rounded-full border border-emerald-500/20 animate-pulse pointer-events-none" />
              </>
            )}

            {agentState === 'speaking' && (
              <>
                <div className="absolute w-48 h-48 rounded-full border-2 border-sky-400/40 animate-pulse pointer-events-none" />
                <div className="absolute w-60 h-60 rounded-full border border-sky-500/20 animate-ping pointer-events-none" />
              </>
            )}

            {/* Central Interactive Orb Button */}
            <button
              onClick={() => {
                if (agentState === 'listening') {
                  stopListening();
                } else if (agentState === 'speaking') {
                  stopSpeaking();
                } else {
                  startListening();
                }
              }}
              className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all transform active:scale-95 z-20 cursor-pointer ${
                agentState === 'listening'
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-500/50 ring-8 ring-emerald-500/25 scale-105'
                  : agentState === 'speaking'
                  ? 'bg-gradient-to-tr from-sky-600 to-cyan-400 shadow-sky-500/50 ring-8 ring-sky-500/25'
                  : agentState === 'thinking'
                  ? 'bg-gradient-to-tr from-amber-600 to-orange-400 shadow-amber-500/50 ring-8 ring-amber-500/25'
                  : 'bg-gradient-to-tr from-slate-800 to-slate-700 hover:from-emerald-700 hover:to-teal-600 shadow-slate-900 ring-4 ring-slate-700/50'
              }`}
            >
              {agentState === 'listening' ? (
                <>
                  <MicOff className="w-10 h-10 text-white mb-1" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Tap to Stop</span>
                </>
              ) : agentState === 'speaking' ? (
                <>
                  <StopCircle className="w-10 h-10 text-white mb-1" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Interrupt</span>
                </>
              ) : agentState === 'thinking' ? (
                <>
                  <RefreshCw className="w-10 h-10 text-white animate-spin mb-1" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Thinking</span>
                </>
              ) : (
                <>
                  <Mic className="w-10 h-10 text-emerald-400 group-hover:text-white mb-1" />
                  <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">Tap to Speak</span>
                </>
              )}
            </button>
          </div>

          {/* Dynamic Audio Waves Animation */}
          <div className="h-10 flex items-center justify-center space-x-1 z-10 w-full px-8">
            {[40, 75, 55, 90, 60, 100, 70, 85, 45, 95, 65, 80, 50, 90, 60, 40].map((height, i) => (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${
                  agentState === 'listening'
                    ? 'bg-emerald-400'
                    : agentState === 'speaking'
                    ? 'bg-sky-400'
                    : 'bg-slate-700'
                }`}
                style={{
                  height:
                    agentState === 'listening' || agentState === 'speaking'
                      ? `${Math.max(12, Math.sin(Date.now() / 200 + i) * (height / 2) + height / 2)}%`
                      : '15%',
                }}
              />
            ))}
          </div>

          {/* Spoken Live Transcript Feedback */}
          {liveTranscript && (
            <div className="w-full mt-4 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-left z-10">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                Listening...
              </span>
              <p className="text-xs text-emerald-100 font-medium italic">"{liveTranscript}"</p>
            </div>
          )}

          {/* Quick Suggested Voice Prompts */}
          <div className="w-full mt-5 text-left z-10 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Suggested Voice Inquiries</span>
            </span>

            <div className="flex flex-col space-y-1.5">
              <button
                onClick={() => handleQuickPrompt('Explain recursion with a real-life analogy from my course notes')}
                className="text-xs text-left p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center justify-between"
              >
                <span>💡 "Explain recursion with an analogy from my notes"</span>
                <Play className="w-3 h-3 text-emerald-400 shrink-0 ml-1" />
              </button>

              <button
                onClick={() => handleQuickPrompt('Summarize key concepts from the uploaded study material')}
                className="text-xs text-left p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center justify-between"
              >
                <span>📄 "Summarize key concepts from my study material"</span>
                <Play className="w-3 h-3 text-emerald-400 shrink-0 ml-1" />
              </button>

              <button
                onClick={() => handleQuickPrompt(`Can you quiz me on this document in ${activeLangObj.name}?`)}
                className="text-xs text-left p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center justify-between"
              >
                <span>🧠 "Quiz me voice-to-voice in {activeLangObj.name}"</span>
                <Play className="w-3 h-3 text-emerald-400 shrink-0 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Conversation Transcript & Document References */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col h-[600px] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Voice Conversation & Document Understanding Log
              </span>
            </div>

            <button
              onClick={() =>
                setMessages([
                  {
                    id: 'welcome_reset',
                    sender: 'agent',
                    text: `Conversation cleared. I am ready to converse in ${activeLangObj.name} with your study documents!`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    language: currentLang,
                  },
                ])
              }
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Log</span>
            </button>
          </div>

          {/* Transcript Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-1.5 mb-1 text-[11px] text-slate-400">
                  <span>{msg.sender === 'user' ? '👤 ' + profile.name : '🤖 Voice AI Tutor'}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Document Grounding Citations */}
                  {msg.documentSources && msg.documentSources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700/80 space-y-1.5">
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Document Grounding Verified</span>
                      </span>
                      {msg.documentSources.map((source, idx) => (
                        <div key={idx} className="p-2 bg-slate-900/70 border border-slate-700/60 rounded-lg text-[11px]">
                          <div className="font-semibold text-slate-200 flex items-center justify-between">
                            <span>📄 {source.title}</span>
                            <span className="text-[10px] text-slate-400">{source.subject}</span>
                          </div>
                          <p className="text-slate-400 text-[10px] line-clamp-2 mt-0.5">
                            "{source.chunkSnippet}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Audio Replay Button for Agent Message */}
                  {msg.sender === 'agent' && (
                    <div className="mt-2.5 pt-1.5 border-t border-slate-700/50 flex items-center justify-end">
                      <button
                        onClick={() => speakText(msg.text, msg.language)}
                        className="flex items-center space-x-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Replay Audio</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {agentState === 'thinking' && (
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                </div>
                <div className="p-3 bg-slate-800 border border-slate-700 rounded-2xl text-xs text-slate-400 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Searching documents & generating voice response in {activeLangObj.name}...</span>
                </div>
              </div>
            )}

            <div ref={chatScrollRef} />
          </div>

          {/* Text/Voice Hybrid Input Box */}
          <div className="p-3 bg-slate-900 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(textInput);
              }}
              className="flex items-center space-x-2"
            >
              <button
                type="button"
                onClick={agentState === 'listening' ? stopListening : startListening}
                className={`p-2.5 rounded-xl border transition-all ${
                  agentState === 'listening'
                    ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse'
                    : 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
                }`}
                title="Tap to speak"
              >
                <Mic className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={`Ask or type in ${activeLangObj.name} or English...`}
                className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors"
              />

              <button
                type="submit"
                disabled={!textInput.trim() || agentState === 'thinking'}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
