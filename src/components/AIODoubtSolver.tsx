import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  RotateCcw, 
  Brain, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Trash2,
  History,
  Lightbulb,
  Cpu,
  BookOpen
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

interface AIODoubtSolverProps {
  profile: StudentProfile;
  onProfileUpdate?: (updated: StudentProfile) => void;
}

export const AIODoubtSolver: React.FC<AIODoubtSolverProps> = ({ profile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`aio_chat_${profile.userId}`);
      return saved ? JSON.parse(saved) : [
        {
          id: 'welcome',
          role: 'model',
          content: `Hello ${profile.name}! I'm your AIO (All-In-One) Doubt Solver. I can help you with Academic concepts, Technical coding bugs, or even Career advice. What's on your mind today?`,
          timestamp: new Date().toISOString()
        }
      ];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    localStorage.setItem(`aio_chat_${profile.userId}`, JSON.stringify(messages));
  }, [messages, profile.userId]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    try {
      const response = await fetch('/api/chat/aio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          message: input,
          history: messages.slice(-6) // Send recent context
        })
      });

      const data = await response.json();
      if (data.success) {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: data.content,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: `Chat history cleared. How can I help you now, ${profile.name}?`,
        timestamp: new Date().toISOString()
      }
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
              <Bot className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">AIO Doubt Solver</h1>
          </div>
          <p className="text-xs text-slate-400">Advanced AI reasoning for complex academic & technical queries</p>
        </div>

        <button
          onClick={clearChat}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition shadow-sm"
          title="Clear Conversation"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chat Area */}
        <div className="lg:col-span-8 flex flex-col bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
          >
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg ${
                    msg.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                  </div>
                  
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-none'
                  }`}>
                    <div className="whitespace-pre-line prose prose-invert prose-sm max-w-none">
                      {msg.content}
                    </div>
                    <div className={`text-[10px] mt-2 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-slate-800 border border-slate-700/50 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span className="text-xs text-slate-400 font-medium">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-950/80 border-t border-slate-800 backdrop-blur-md">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask your doubt (e.g., 'Explain the Pumping Lemma' or 'Debug this C pointer error')..."
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl pl-5 pr-14 py-4 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="absolute right-2 p-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl transition shadow-lg active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar: Smart Suggestions & Context */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Try asking about
            </h3>
            <div className="space-y-2">
              {[
                "Derive the Schrödinger Equation",
                "Explain Redux state management",
                "Solve ∫ x sin(x) dx step-by-step",
                "Career paths in Data Science"
              ].map((query, i) => (
                <button
                  key={i}
                  onClick={() => setInput(query)}
                  className="w-full text-left p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-xs text-slate-300 transition group flex items-center justify-between"
                >
                  <span className="truncate">{query}</span>
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-950/20 to-slate-900 border border-emerald-500/20 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Advanced Features
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 shrink-0 mt-0.5">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white mb-0.5">RAG Grounded</p>
                  <p className="text-[10px] text-slate-400">Responses are cross-referenced with your verified study materials.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 shrink-0 mt-0.5">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white mb-0.5">Socratic Pedagogy</p>
                  <p className="text-[10px] text-slate-400">The AI guides you to the answer instead of just providing it.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
