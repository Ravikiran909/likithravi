import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Image as ImageIcon,
  Mic,
  Square,
  Volume2,
  VolumeX,
  FileAudio,
  MoreVertical,
  Phone,
  Video,
  CheckCheck,
  Sparkles,
  Bot,
  Brain,
  Code2,
  Calendar,
  Flame,
  Award,
  Zap,
  Globe,
  Upload,
  RefreshCw,
  Clock,
  Terminal,
  Pin,
} from 'lucide-react';
import { StudentProfile, MessageRecord, DocumentRecord, SUPPORTED_LANGUAGES } from '../types/index.ts';

interface WhatsAppSimulatorProps {
  selectedProfile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  selectedProfile,
  onProfileUpdate,
}) => {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<DocumentRecord[]>([]);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState(false);
  const [liveVoiceTranscript, setLiveVoiceTranscript] = useState('');
  const speechRecognitionRef = useRef<any>(null);
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);

  const [lastAgentInfo, setLastAgentInfo] = useState<{
    intent: string;
    agentName: string;
    whatsappStatus: any;
    latencyMs?: number;
  }>({
    intent: 'READY',
    agentName: 'Orchestrator Agent',
    whatsappStatus: { mode: 'Cloud API Webhook' },
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Audio voice note recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  // Load initial message history for selected student and knowledge base documents
  useEffect(() => {
    fetchMessages();
    fetch('/api/documents')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.documents) setAvailableDocs(data.documents);
      })
      .catch(() => {});
  }, [selectedProfile.userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages?userId=${selectedProfile.userId}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setMessages(data);
        } else {
          // Default greeting
          setMessages([
            {
              id: 'init_greet',
              userId: selectedProfile.userId,
              whatsappNumber: selectedProfile.whatsappNumber,
              direction: 'outgoing',
              messageType: 'text',
              content: `Hey ${selectedProfile.name}! 👋 I'm your AI Learning Mentor on WhatsApp.\n\nWhat would you like to do today?\n📚 Learn a topic\n🧠 Take a quiz\n📝 Ask a doubt (text or photo 📸)\n📅 Create an exam study plan\n📊 Check progress (/progress)`,
              timestamp: new Date().toISOString(),
              agentName: 'Orchestrator Agent',
              intent: 'HELP',
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  const sendMessage = async (
    textToSend: string,
    mediaData?: { mediaType: 'image' | 'audio' | 'text'; mediaBase64?: string; mimeType?: string }
  ) => {
    if ((!textToSend.trim() && !mediaData?.mediaBase64) || loading) return;

    let outgoingContent = textToSend.trim();
    if (!outgoingContent) {
      if (mediaData?.mediaType === 'image') outgoingContent = '[Photo Upload]';
      else if (mediaData?.mediaType === 'audio') outgoingContent = '🎙️ [Voice Note Audio]';
    }

    const tempUserMsg: MessageRecord = {
      id: 'temp_' + Date.now(),
      userId: selectedProfile.userId,
      whatsappNumber: selectedProfile.whatsappNumber,
      direction: 'incoming', // From student to WhatsApp bot
      messageType: mediaData?.mediaType || 'text',
      content: outgoingContent,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputMessage('');
    setLoading(true);

    const startTime = Date.now();

    try {
      const res = await fetch('/api/simulate/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPhone: selectedProfile.whatsappNumber,
          senderName: selectedProfile.name,
          text: outgoingContent,
          mediaType: mediaData?.mediaType || 'text',
          mediaBase64: mediaData?.mediaBase64,
          mimeType: mediaData?.mimeType,
        }),
      });

      const data = await res.json();
      const latency = Date.now() - startTime;

      if (res.ok) {
        setLastAgentInfo({
          intent: data.intent,
          agentName: data.agentName,
          whatsappStatus: data.whatsappStatus,
          latencyMs: latency,
        });

        if (data.studentProfile) {
          onProfileUpdate(data.studentProfile);
        }

        const botReply: MessageRecord = {
          id: 'bot_' + Date.now(),
          userId: selectedProfile.userId,
          whatsappNumber: selectedProfile.whatsappNumber,
          direction: 'outgoing', // Bot replied
          messageType: 'text',
          content: data.responseText,
          timestamp: new Date().toISOString(),
          intent: data.intent,
          agentName: data.agentName,
        };
        setMessages((prev) => [...prev, botReply]);

        if (autoSpeechEnabled) {
          playBotSpeech(data.responseText, botReply.id);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: 'err_' + Date.now(),
            userId: selectedProfile.userId,
            whatsappNumber: selectedProfile.whatsappNumber,
            direction: 'outgoing',
            messageType: 'text',
            content: "⚠️ I'm having a brief processing delay. Please try sending your question again!",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

function createSampleVoiceWav(frequency = 440): string {
  const sampleRate = 8000;
  const duration = 0.5;
  const numSamples = Math.floor(sampleRate * duration);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt subchunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  // data subchunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const envelope = Math.sin((Math.PI * i) / numSamples);
    const sample = Math.sin(2 * Math.PI * frequency * (i / sampleRate)) * 10000 * envelope;
    view.setInt16(44 + i * 2, Math.floor(sample), true);
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      const cleanMime = (file.type || 'image/jpeg').split(';')[0];
      sendMessage('Solve this mathematics / programming question step-by-step', {
        mediaType: 'image',
        mediaBase64: base64Data,
        mimeType: cleanMime,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      const cleanMime = (file.type || 'audio/mp3').split(';')[0];
      sendMessage('🎙️ [Voice Note: ' + file.name + ']', {
        mediaType: 'audio',
        mediaBase64: base64Data,
        mimeType: cleanMime,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const playBotSpeech = (text: string, msgId: string) => {
    if (!speechSynthRef.current) return;

    if (speakingMsgId === msgId) {
      speechSynthRef.current.cancel();
      setSpeakingMsgId(null);
      return;
    }

    speechSynthRef.current.cancel();

    // Clean formatting symbols for natural TTS speech
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/http\S+/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const langObj =
      SUPPORTED_LANGUAGES.find((l) => l.code === selectedProfile.preferredLanguage) ||
      SUPPORTED_LANGUAGES[0];
    utterance.lang = langObj.speechVoiceCode;

    const voices = speechSynthRef.current.getVoices();
    const voice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith(langObj.code.toLowerCase()) ||
        v.lang.toLowerCase().includes(langObj.speechVoiceCode.toLowerCase())
    );
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setSpeakingMsgId(msgId);
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    speechSynthRef.current.speak(utterance);
  };

  const startRecording = async () => {
    try {
      setLiveVoiceTranscript('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Initialize Web Speech API SpeechRecognition for live transcription
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const recognition = new SpeechRec();
          const langObj =
            SUPPORTED_LANGUAGES.find((l) => l.code === selectedProfile.preferredLanguage) ||
            SUPPORTED_LANGUAGES[0];
          recognition.lang = langObj.speechVoiceCode;
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (ev: any) => {
            let str = '';
            for (let i = 0; i < ev.results.length; ++i) {
              str += ev.results[i][0].transcript;
            }
            if (str.trim()) {
              setLiveVoiceTranscript(str);
            }
          };
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (e) {
          console.warn('Speech recognition notice:', e);
        }
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch (e) {}
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          const cleanMime = (audioBlob.type || 'audio/webm').split(';')[0];
          const textNote = liveVoiceTranscript.trim()
            ? `🎙️ "${liveVoiceTranscript.trim()}"`
            : '🎙️ [Live Voice Note]';

          sendMessage(textNote, {
            mediaType: 'audio',
            mediaBase64: base64Data,
            mimeType: cleanMime,
          });
          setLiveVoiceTranscript('');
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone permission denied or unavailable, simulating sample voice query.', err);
      // Fallback: send a sample voice query to demonstrate transcription
      sendMessage('🎙️ [Simulated Voice Note]: "Can you explain recursion in Python with a real-life analogy?"', {
        mediaType: 'audio',
        mediaBase64: createSampleVoiceWav(440),
        mimeType: 'audio/wav',
      });
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Extract interactive choices (A, B, C, D) if present in bot message
  const extractQuickChoices = (content: string) => {
    if (content.includes('Reply with A, B, C, or D') || (content.includes('A)') && content.includes('B)'))) {
      return ['A', 'B', 'C', 'D'];
    }
    if (content.includes('1️⃣') && content.includes('2️⃣') && content.includes('3️⃣')) {
      return ['Beginner', 'Intermediate', 'Advanced'];
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Quick Info Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 text-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white">{selectedProfile.name}</span>
              <span className="text-xs text-slate-400">({selectedProfile.whatsappNumber})</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50 text-xs uppercase font-medium">
                {selectedProfile.currentSkillLevel}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Streak: <span className="text-amber-400 font-semibold">{selectedProfile.streak} days 🔥</span> |
              Accuracy: <span className="text-emerald-400 font-semibold">{selectedProfile.overallProgress}%</span> |
              Language: <span className="text-sky-300 uppercase">{selectedProfile.preferredLanguage}</span>
            </p>
          </div>
        </div>

        {/* Quick prompt shortcuts */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => sendMessage('Explain recursion')}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
          >
            Explain Recursion
          </button>
          <button
            onClick={() => sendMessage('/quiz Python')}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
          >
            /quiz Python
          </button>
          <button
            onClick={() => sendMessage('I have an exam in 15 days')}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
          >
            Exam in 15 Days
          </button>
          <button
            onClick={() => sendMessage('Today\'s study plan')}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
          >
            Daily Plan
          </button>
          <button
            onClick={() => sendMessage('/progress')}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
          >
            /progress
          </button>
          <button
            onClick={() => sendMessage('ನನಗೆ recursion explain ಮಾಡಿ')}
            className="px-2.5 py-1 text-xs bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 rounded-lg border border-amber-800/40 transition"
            title="Kannada prompt"
          >
            ಕನ್ನಡ (Recursion)
          </button>
          <button
            onClick={() => sendMessage('मुझे कैलकुलस में Limits समझाओ')}
            className="px-2.5 py-1 text-xs bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 rounded-lg border border-sky-800/40 transition"
            title="Hindi prompt"
          >
            हिंदी (Limits)
          </button>
        </div>
      </div>

      {/* Main Grid: Phone Mockup on Left, Real-time Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mobile Phone Mockup (7 cols) */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="w-full max-w-md bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl border-4 border-slate-800 flex flex-col h-[740px]">
            {/* Phone Top Speaker & Camera Notch */}
            <div className="flex items-center justify-between px-6 pt-1 pb-2">
              <span className="text-xs text-slate-400 font-medium">9:41</span>
              <div className="w-20 h-4 bg-slate-800 rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              </div>
              <div className="flex items-center space-x-1 text-xs text-slate-400">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>5G</span>
              </div>
            </div>

            {/* WhatsApp Emerald App Bar */}
            <div className="bg-[#075E54] text-white px-4 py-3 rounded-t-2xl flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white shadow-inner">
                    <Brain className="w-6 h-6 text-emerald-200" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#075E54] rounded-full" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-tight">AI Learning Mentor</h3>
                  <p className="text-[11px] text-emerald-100/80 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
                    <span>WhatsApp Verified Business</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-emerald-100">
                <button
                  type="button"
                  onClick={() => setAutoSpeechEnabled(!autoSpeechEnabled)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center space-x-1 border transition cursor-pointer ${
                    autoSpeechEnabled
                      ? 'bg-emerald-400 text-[#075E54] border-white'
                      : 'bg-emerald-900/60 text-emerald-200 border-emerald-400/30'
                  }`}
                  title="Toggle automatic speech synthesis for AI tutor responses"
                >
                  {autoSpeechEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                  <span>TTS {autoSpeechEnabled ? 'ON' : 'OFF'}</span>
                </button>
                <Video className="w-4 h-4 cursor-pointer hover:text-white" />
                <Phone className="w-4 h-4 cursor-pointer hover:text-white" />
                <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white" />
              </div>
            </div>

            {/* Chat Body with authentic WhatsApp doodle wallpaper */}
            <div className="flex-1 bg-[#efeae2] dark:bg-[#0b141a] overflow-y-auto p-4 space-y-3 relative font-sans text-sm">
              {/* Security Banner */}
              <div className="flex justify-center my-1">
                <span className="bg-[#ffeecd] dark:bg-[#182229] text-[#54656f] dark:text-[#8696a0] text-[11px] px-3 py-1 rounded-lg text-center shadow-xs max-w-xs">
                  🔒 Messages and calls are end-to-end encrypted. Connected via official WhatsApp Cloud API.
                </span>
              </div>

              {messages.map((m) => {
                const isStudent = m.direction === 'incoming';
                const quickChoices = !isStudent ? extractQuickChoices(m.content) : null;

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm text-sm relative break-words ${
                        isStudent
                          ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-xs'
                          : 'bg-white dark:bg-[#202c33] text-slate-900 dark:text-slate-100 rounded-tl-xs'
                      }`}
                    >
                      {/* Agent Badge for bot replies */}
                      {!isStudent && m.agentName && (
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1 flex items-center space-x-1">
                          <Sparkles className="w-3 h-3" />
                          <span>{m.agentName}</span>
                        </div>
                      )}

                      {/* Audio Voice Note Visualizer */}
                      {m.messageType === 'audio' && (
                        <div className="flex items-center space-x-2.5 py-1 px-1 mb-1.5 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 rounded-xl">
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Volume2 className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1 h-3">
                              <span className="w-1 h-2 bg-emerald-500 rounded-full animate-pulse" />
                              <span className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse delay-75" />
                              <span className="w-1 h-1.5 bg-emerald-500 rounded-full" />
                              <span className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse delay-150" />
                              <span className="w-1 h-2 bg-emerald-500 rounded-full" />
                              <span className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse delay-100" />
                              <span className="w-1 h-1.5 bg-emerald-500 rounded-full" />
                              <span className="w-1 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                            </div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Voice Note • Gemini 3.5 Transcribe
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Message Content with WhatsApp formatting */}
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {m.content.split('\n').map((line, idx) => {
                          // Simple bold replacement for *bold*
                          const formattedLine = line.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
                          return (
                            <span
                              key={idx}
                              className="block"
                              dangerouslySetInnerHTML={{ __html: formattedLine }}
                            />
                          );
                        })}
                      </div>

                      {/* Timestamp & Double Checkmarks & Speaker Button */}
                      <div className="flex items-center justify-end space-x-1.5 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        {!isStudent && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playBotSpeech(m.content, m.id);
                            }}
                            className={`p-1 rounded-full transition cursor-pointer ${
                              speakingMsgId === m.id
                                ? 'text-emerald-500 bg-emerald-500/20 animate-pulse'
                                : 'text-slate-400 hover:text-emerald-500 hover:bg-slate-700/30'
                            }`}
                            title="Listen to this explanation (Text-to-Speech)"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span>
                          {new Date(m.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isStudent && (
                          <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                        )}
                      </div>
                    </div>

                    {/* Interactive Button Replies under bot question */}
                    {!isStudent && quickChoices && (
                      <div className="flex flex-wrap gap-1.5 mt-2 ml-1 max-w-[85%]">
                        {quickChoices.map((choice) => (
                          <button
                            key={choice}
                            onClick={() => sendMessage(choice)}
                            className="bg-white dark:bg-[#202c33] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-[#2a3942] border border-emerald-500/30 font-medium px-3 py-1.5 rounded-full text-xs shadow-sm transition active:scale-95"
                          >
                            👉 {choice}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {loading && (
                <div className="flex items-center space-x-2 bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-xs px-4 py-2.5 w-24 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-100" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-200" />
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Toolbar */}
            <div className="p-2.5 bg-slate-900 rounded-b-2xl border-t border-slate-800">
              {/* Pinned Study Materials for Quick Access in Chat */}
              {selectedProfile.pinnedDocumentIds && selectedProfile.pinnedDocumentIds.length > 0 && (
                <div className="mb-2 px-1 flex items-center space-x-1.5 overflow-x-auto text-[11px] pb-1">
                  <span className="text-amber-400 font-bold flex items-center space-x-1 shrink-0">
                    <Pin className="w-3 h-3 fill-amber-400" />
                    <span>Pinned:</span>
                  </span>
                  {availableDocs
                    .filter((d) => selectedProfile.pinnedDocumentIds?.includes(d.id))
                    .map((pDoc) => (
                      <button
                        key={pDoc.id}
                        type="button"
                        onClick={() =>
                          sendMessage(
                            `Tutor, based on our verified course notes on "${pDoc.title}" (${pDoc.subject}), explain the key principles and test my understanding.`
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap transition cursor-pointer flex items-center space-x-1 shadow-sm shrink-0"
                        title={`Quick Ask: ${pDoc.title}`}
                      >
                        <span>📄 {pDoc.title}</span>
                      </button>
                    ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(inputMessage);
                }}
                className="flex items-center space-x-1.5"
              >
                {/* Image question upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-full transition"
                  title="Upload image / photo of a question"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>

                {/* Audio file upload */}
                <input
                  type="file"
                  ref={audioInputRef}
                  onChange={handleAudioUpload}
                  accept="audio/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-full transition"
                  title="Upload audio / voice note file"
                >
                  <FileAudio className="w-5 h-5" />
                </button>

                {/* Recording indicator vs Text input */}
                {isRecording ? (
                  <div className="flex-1 flex items-center justify-between bg-rose-950/40 border border-rose-800/60 rounded-full px-4 py-2 text-rose-300 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      <span className="font-semibold">Recording Voice Note...</span>
                    </div>
                    <span className="font-mono text-xs">{recordingSeconds}s</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type a message or /quiz, /plan..."
                    className="flex-1 bg-slate-800 text-white placeholder-slate-400 text-xs sm:text-sm px-4 py-2 rounded-full border border-slate-700 focus:outline-none focus:border-emerald-500 transition"
                  />
                )}

                {/* Live Mic Recording Button */}
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="p-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition shadow-md shadow-rose-600/30"
                    title="Stop recording and send voice note"
                  >
                    <Square className="w-4 h-4 fill-white" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-full transition"
                    title="Record voice note (Gemini 3.5 Transcribe)"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}

                {/* Send Button */}
                {!isRecording && (
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || loading}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-full transition shadow-md shadow-emerald-600/30"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </form>

              {/* Sample Photo Doubt & Voice Note Buttons */}
              <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-1 gap-1">
                <div className="flex items-center space-x-1.5">
                  <span>📸 Snapshots:</span>
                  <button
                    onClick={() =>
                      sendMessage('Solve this mathematics question: ∫ x·sin(x) dx using integration by parts.')
                    }
                    className="text-emerald-400 hover:underline"
                  >
                    Calculus
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    onClick={() =>
                      sendMessage('Explain this code bug: def append_to(element, target=[]): target.append(element)')
                    }
                    className="text-emerald-400 hover:underline"
                  >
                    Python Bug
                  </button>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span>🎙️ Voice Notes:</span>
                  <button
                    onClick={() =>
                      sendMessage('🎙️ [Voice Note Query]: "Teach me how recursion works with a simple example"', {
                        mediaType: 'audio',
                        mediaBase64: createSampleVoiceWav(440),
                        mimeType: 'audio/wav',
                      })
                    }
                    className="text-teal-400 hover:underline"
                  >
                    Recursion
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    onClick={() =>
                      sendMessage('🎙️ [Voice Note Query]: "Explain binary search and its time complexity"', {
                        mediaType: 'audio',
                        mediaBase64: createSampleVoiceWav(523),
                        mimeType: 'audio/wav',
                      })
                    }
                    className="text-teal-400 hover:underline"
                  >
                    DSA Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Agent Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active AI Agent & Intent Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-emerald-400" />
                <h4 className="font-semibold text-white text-sm">Agent Orchestrator Pipeline</h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                {lastAgentInfo.intent}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="text-slate-400 text-[11px] mb-1">Active Specialized Agent:</div>
                <div className="font-medium text-emerald-300 text-sm flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>{lastAgentInfo.agentName}</span>
                </div>
                {lastAgentInfo.latencyMs && (
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Inference & Dispatch Latency: {lastAgentInfo.latencyMs} ms</span>
                  </div>
                )}
              </div>

              {/* Student Context Profile Memory */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 space-y-2">
                <div className="text-slate-400 text-[11px]">Personalized Context Memory:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">Target Level: </span>
                    <span className="text-white font-medium capitalize">{selectedProfile.educationLevel}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Preferred Lang: </span>
                    <span className="text-sky-300 font-medium uppercase">{selectedProfile.preferredLanguage}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Study Streak: </span>
                    <span className="text-amber-400 font-medium">{selectedProfile.streak} Days 🔥</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Overall Accuracy: </span>
                    <span className="text-emerald-400 font-medium">{selectedProfile.overallProgress}%</span>
                  </div>
                </div>

                {selectedProfile.weakTopics.length > 0 && (
                  <div className="pt-1 border-t border-slate-700/60">
                    <span className="text-amber-400 text-[11px] font-medium">Flagged Weak Areas: </span>
                    <span className="text-slate-300 text-[11px]">{selectedProfile.weakTopics.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* WhatsApp Cloud API Payload */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="flex items-center space-x-1">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp Cloud API Dispatch Payload:</span>
                  </span>
                  <span className="text-[10px] text-emerald-400">v21.0</span>
                </div>
                <pre className="text-emerald-400/90 overflow-x-auto p-2 bg-slate-900/90 rounded border border-slate-800 max-h-40 leading-tight">
{JSON.stringify(
  {
    messaging_product: 'whatsapp',
    to: selectedProfile.whatsappNumber,
    type: 'text',
    agent: lastAgentInfo.agentName,
    intent: lastAgentInfo.intent,
    status: lastAgentInfo.whatsappStatus?.simulated ? 'SIMULATED_DISPATCH' : 'META_SENT',
  },
  null,
  2
)}
                </pre>
              </div>
            </div>
          </div>

          {/* Quick Learning Actions Card */}
          <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-800/40 rounded-2xl p-4">
            <h5 className="font-semibold text-white text-xs mb-2 flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Recommended Quick Actions</span>
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => sendMessage('/quiz Python')}
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-left transition"
              >
                <div className="font-medium text-xs text-white">Start Python Quiz</div>
                <div className="text-[10px] text-slate-400">3 adaptive MCQs</div>
              </button>
              <button
                onClick={() => sendMessage('I have an exam in 20 days')}
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-left transition"
              >
                <div className="font-medium text-xs text-white">Generate Exam Plan</div>
                <div className="text-[10px] text-slate-400">Day-by-day timetable</div>
              </button>
              <button
                onClick={() => sendMessage('Remind me to study DSA at 7 PM every day')}
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-left transition"
              >
                <div className="font-medium text-xs text-white">Set 7 PM Reminder</div>
                <div className="text-[10px] text-slate-400">Daily WhatsApp notification</div>
              </button>
              <button
                onClick={() => sendMessage('What should I learn next?')}
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-left transition"
              >
                <div className="font-medium text-xs text-white">Get Recommendation</div>
                <div className="text-[10px] text-slate-400">Target weak topics</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
