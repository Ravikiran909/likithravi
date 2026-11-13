import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  RotateCcw,
  Brain,
  ChevronRight,
  AlertCircle,
  Loader2,
  Trash2,
  Lightbulb,
  Cpu,
  BookOpen,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  sources?: string[];
  isError?: boolean;
}

interface AIODoubtSolverProps {
  profile: StudentProfile;
  onProfileUpdate?: (updated: StudentProfile) => void;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={idx} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700/70 text-emerald-300 font-mono text-[12px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}

function FormattedMessage({ content }: { content: string }) {
  const blocks = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-sm leading-relaxed">
      {blocks.map((block, bIdx) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          const inner = block.slice(3, -3);
          const firstNewline = inner.indexOf('\n');
          const lang = firstNewline > -1 ? inner.slice(0, firstNewline).trim() : '';
          const code = firstNewline > -1 ? inner.slice(firstNewline + 1) : inner;

          return (
            <div
              key={bIdx}
              className="rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 my-2"
            >
              {lang && (
                <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  {lang}
                </div>
              )}
              <pre className="p-3 overflow-x-auto text-xs font-mono text-emerald-200 leading-relaxed">
                <code>{code.trimEnd()}</code>
              </pre>
            </div>
          );
        }

        const lines = block.split('\n');
        return (
          <div key={bIdx} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lIdx} className="h-1" />;

              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={lIdx} className="text-sm font-bold text-emerald-300 pt-1">
                    {renderInlineMarkdown(trimmed.slice(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3 key={lIdx} className="text-base font-bold text-white pt-1">
                    {renderInlineMarkdown(trimmed.slice(3))}
                  </h3>
                );
              }
              if (/^[-*•]\s+/.test(trimmed)) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-1">
                    <span className="text-emerald-400 mt-1 text-xs">•</span>
                    <span className="flex-1">{renderInlineMarkdown(trimmed.replace(/^[-*•]\s+/, ''))}</span>
                  </div>
                );
              }
              return <p key={lIdx}>{renderInlineMarkdown(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export const AIODoubtSolver: React.FC<AIODoubtSolverProps> = ({ profile }) => {
  const makeWelcomeMessage = (): ChatMessage => ({
    id: 'welcome',
    role: 'model',
    content: `Hello ${profile.name}! I'm your AIO (All-In-One) Doubt Solver. I can help you with Academic concepts, Technical coding bugs, or Career advice. What's on your mind today?`,
    timestamp: new Date().toISOString(),
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`aio_chat_${profile.userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to default welcome message
    }
    return [makeWelcomeMessage()];
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    try {
      localStorage.setItem(`aio_chat_${profile.userId}`, JSON.stringify(messages));
    } catch {
      // Ignore storage quota errors
    }
  }, [messages, profile.userId]);

  const sendPrompt = async (rawPrompt: string, isRetry = false) => {
    const cleanPrompt = rawPrompt.trim();
    if (!cleanPrompt || isTyping) return;

    setErrorBanner(null);
    setLastFailedPrompt(null);

    const historySnapshot = messages
      .filter((m) => m.id !== 'welcome' && !m.isError)
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    if (!isRetry) {
      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: cleanPrompt,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev.filter((m) => !m.isError), userMsg]);
      setInput('');
    } else {
      setMessages((prev) => prev.filter((m) => !m.isError));
    }

    setIsTyping(true);

    try {
      const response = await fetch('/api/chat/aio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          message: cleanPrompt,
          history: historySnapshot,
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (response.ok && data?.success && data?.content) {
        const aiMsg: ChatMessage = {
          id: `model_${Date.now() + 1}`,
          role: 'model',
          content: data.content,
          timestamp: new Date().toISOString(),
          sources: Array.isArray(data.sources) ? data.sources : undefined,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errText =
          data?.error ||
          `Unable to reach AI Tutor (HTTP ${response.status}). Please try again.`;
        setErrorBanner(errText);
        setLastFailedPrompt(cleanPrompt);
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now() + 1}`,
            role: 'model',
            content: errText,
            timestamp: new Date().toISOString(),
            isError: true,
          },
        ]);
      }
    } catch (err: any) {
      const errText = err?.message || 'Network error while contacting the AI Chatbot. Please check your connection and try again.';
      setErrorBanner(errText);
      setLastFailedPrompt(cleanPrompt);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now() + 1}`,
          role: 'model',
          content: errText,
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    void sendPrompt(input, false);
  };

  const clearChat = () => {
    setErrorBanner(null);
    setLastFailedPrompt(null);
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: `Chat history cleared. How can I help you now, ${profile.name}?`,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 min-h-[600px] h-[calc(100vh-160px)] flex flex-col animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
              <Bot className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">AIO Doubt Solver</h1>
          </div>
          <p className="text-xs text-slate-400">Advanced AI reasoning for complex academic &amp; technical queries</p>
        </div>

        <button
          type="button"
          onClick={clearChat}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition shadow-sm"
          title="Clear Conversation"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {errorBanner && (
        <div className="mb-4 px-4 py-2.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{errorBanner}</span>
          </div>
          {lastFailedPrompt && (
            <button
              type="button"
              onClick={() => void sendPrompt(lastFailedPrompt, true)}
              disabled={isTyping}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-100 font-semibold transition"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chat Area */}
        <div className="lg:col-span-8 flex flex-col min-h-[420px] bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
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
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg ${
                      msg.isError
                        ? 'bg-rose-600'
                        : msg.role === 'user'
                        ? 'bg-indigo-600'
                        : 'bg-emerald-600'
                    }`}
                  >
                    {msg.isError ? (
                      <AlertCircle className="w-4 h-4 text-white" />
                    ) : msg.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.isError
                        ? 'bg-rose-950/60 text-rose-200 border border-rose-500/40 rounded-tl-none'
                        : msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-none'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-line">{msg.content}</div>
                    ) : (
                      <FormattedMessage content={msg.content} />
                    )}

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex flex-wrap gap-1.5">
                        {msg.sources.map((src, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/30 text-[10px] text-emerald-300"
                          >
                            <BookOpen className="w-2.5 h-2.5" />
                            {src}
                          </span>
                        ))}
                      </div>
                    )}

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
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask your doubt (e.g., 'Explain the Pumping Lemma' or 'Debug this C pointer error')..."
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl pl-5 pr-14 py-4 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="absolute right-2 p-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl transition shadow-lg active:scale-95"
                title="Send message"
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
                'Derive the Schrödinger Equation',
                'Explain Redux state management',
                'Solve ∫ x sin(x) dx step-by-step',
                'Career paths in Data Science',
              ].map((query, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => void sendPrompt(query, false)}
                  disabled={isTyping}
                  className="w-full text-left p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-xs text-slate-300 transition group flex items-center justify-between disabled:opacity-50"
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
                  <p className="text-xs font-bold text-white mb-0.5">Step-by-Step Guidance</p>
                  <p className="text-[10px] text-slate-400">Clear explanations, worked examples, and quick understanding checks.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
