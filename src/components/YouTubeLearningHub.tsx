import React, { useState, useMemo } from 'react';
import {
  Youtube,
  Play,
  Search,
  BookOpen,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  Clock,
  Sparkles,
  ExternalLink,
  MessageSquare,
  X,
  Code2,
  Database,
  Terminal,
  Cpu,
  Bot,
  GitBranch,
  Layers,
  ChevronRight,
  Filter,
  Check,
  Award,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

export interface LearningVideo {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  category: 'python' | 'java' | 'c' | 'cpp' | 'data_analysis' | 'ai_agents' | 'git';
  categoryLabel: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  duration: string;
  description: string;
  keyTopics: string[];
  thumbnailUrl?: string;
  promptSuggestion: string;
}

export const YOUTUBE_VIDEOS: LearningVideo[] = [
  // ---------------- PYTHON ----------------
  {
    id: 'py_mosh_01',
    youtubeId: '_uQrJ0TkZlc',
    title: 'Python Tutorial for Beginners - Full Course',
    channel: 'Programming with Mosh',
    category: 'python',
    categoryLabel: 'Python',
    level: 'Beginner',
    duration: '6 Hours',
    description: 'Complete Python programming tutorial covering variables, control flow, functions, OOP, PyPI packages, and building 3 real-world projects.',
    keyTopics: ['Variables & Data Types', 'Control Flow & Loops', 'Functions & Modules', 'Object-Oriented Programming (OOP)', 'PyPI & Package Management'],
    promptSuggestion: 'I watched the Python for Beginners course. Can you give me 3 practice problems on Python functions and OOP?',
  },
  {
    id: 'py_fcc_02',
    youtubeId: 'rfscVS0vtbw',
    title: 'Python for Beginners - Full Course [FreeCodeCamp]',
    channel: 'freeCodeCamp.org',
    category: 'python',
    categoryLabel: 'Python',
    level: 'Beginner',
    duration: '4.5 Hours',
    description: 'Comprehensive introduction to core Python fundamentals including list comprehensions, dictionaries, file handling, and error handling.',
    keyTopics: ['Lists, Tuples & Dictionaries', 'Reading & Writing Files', 'Classes & Objects', 'Inheritance & Polymorphism', 'Error & Exception Handling'],
    promptSuggestion: 'Can you test my understanding of Python dictionaries and file handling with a quick quiz?',
  },
  {
    id: 'py_brocode_03',
    youtubeId: 'XKHEtdqhLK8',
    title: 'Python Full Course for Free (Zero to Hero)',
    channel: 'Bro Code',
    category: 'python',
    categoryLabel: 'Python',
    level: 'All Levels',
    duration: '12 Hours',
    description: 'Ultra-complete 12-hour deep dive covering all foundational, intermediate, and graphical user interface concepts in Python.',
    keyTopics: ['Core Syntax & Built-ins', 'Lambdas, Maps & Filters', 'Multi-threading', 'Tkinter GUI Apps', 'File Operations & CSV'],
    promptSuggestion: 'Explain Python list comprehensions and lambda functions with 2 clear code examples.',
  },

  // ---------------- JAVA ----------------
  {
    id: 'java_brocode_01',
    youtubeId: 'A74TOX803D0',
    title: 'Java Full Course for Beginners',
    channel: 'Bro Code',
    category: 'java',
    categoryLabel: 'Java',
    level: 'Beginner',
    duration: '4 Hours',
    description: 'Master Java syntax, object-oriented concepts, encapsulation, inheritance, polymorphism, and Java Collections framework.',
    keyTopics: ['Java Variables & Types', 'Methods & Overloading', 'Constructors & OOP', 'Inheritance & Interfaces', 'Exception Handling'],
    promptSuggestion: 'Can you explain the difference between an Interface and an Abstract Class in Java with examples?',
  },
  {
    id: 'java_mosh_02',
    youtubeId: 'grEKMHGYyns',
    title: 'Java Tutorial for Beginners - Core Architecture',
    channel: 'Programming with Mosh',
    category: 'java',
    categoryLabel: 'Java',
    level: 'Beginner',
    duration: '2.5 Hours',
    description: 'Clean coding patterns, memory management, stack vs heap in Java, and building enterprise-grade Java classes.',
    keyTopics: ['Stack vs Heap Memory', 'Primitive vs Reference Types', 'Clean OOP Encapsulation', 'Static vs Instance Members', 'Debugging in IDE'],
    promptSuggestion: 'How does garbage collection and Heap memory work in Java? Explain like I am preparing for an interview.',
  },
  {
    id: 'java_kunal_03',
    youtubeId: 'BGTx91t8q50',
    title: 'Java + Data Structures & Algorithms Foundation',
    channel: 'freeCodeCamp.org & Kunal Kushwaha',
    category: 'java',
    categoryLabel: 'Java',
    level: 'Intermediate',
    duration: '10 Hours',
    description: 'In-depth Java algorithmic thinking, time complexity analysis, arrays, binary search, and recursive problem solving.',
    keyTopics: ['Time & Space Complexity', 'Linear & Binary Search', 'Sorting Algorithms', 'Recursion & Backtracking', 'Bit Manipulation'],
    promptSuggestion: 'Give me a LeetCode style problem in Java involving Binary Search and guide me Socratically to solve it.',
  },

  // ---------------- C PROGRAMMING ----------------
  {
    id: 'c_fcc_01',
    youtubeId: 'KJgsSFOSQv0',
    title: 'C Programming Tutorial for Beginners - Full Course',
    channel: 'freeCodeCamp.org',
    category: 'c',
    categoryLabel: 'C Programming',
    level: 'Beginner',
    duration: '3.5 Hours',
    description: 'The golden standard course for learning C programming from scratch: memory addresses, pointers, arrays, structs, and memory management.',
    keyTopics: ['Data Types & Format Specifiers', 'Pointers & Memory Addresses', 'Arrays & 2D Arrays', 'Memory Management (malloc/free)', 'Structs & Unions'],
    promptSuggestion: 'Explain how pointers work in C programming and how to avoid memory leaks with malloc and free.',
  },
  {
    id: 'c_brocode_02',
    youtubeId: '-cp2W34Wf2c',
    title: 'C Programming Full Course for Free (Step by Step)',
    channel: 'Bro Code',
    category: 'c',
    categoryLabel: 'C Programming',
    level: 'All Levels',
    duration: '4 Hours',
    description: 'Practical, concise lessons through 40+ C concepts including string functions, enums, typedef, structs, and bitwise operators.',
    keyTopics: ['Variables & Arithmetic', 'Strings & String Functions', 'Structs & Typedef', 'Pointers to Pointers', 'File Writing & Reading'],
    promptSuggestion: 'What is the difference between passing by value and passing by reference using pointers in C?',
  },
  {
    id: 'c_cs50_03',
    youtubeId: '87SH2Cn0s9A',
    title: 'CS50 Lecture 1 - C Programming & Computational Thinking',
    channel: 'CS50 / Harvard University',
    category: 'c',
    categoryLabel: 'C Programming',
    level: 'Beginner',
    duration: '2.5 Hours',
    description: 'David J. Malan introduces the fundamentals of C, compiling with clang, memory segmentation, and algorithmic problem solving.',
    keyTopics: ['Compilers & Machine Code', 'Memory Layout & Bytes', 'Conditional Logic & Loops', 'Functions & Scope', 'Algorithmic Efficiency'],
    promptSuggestion: 'I watched CS50 C lecture. Can you test me on memory representation of characters and integers in C?',
  },

  // ---------------- C++ ----------------
  {
    id: 'cpp_fcc_01',
    youtubeId: 'vLnPwxZdW4Y',
    title: 'C++ Tutorial for Beginners - Full Course',
    channel: 'freeCodeCamp.org',
    category: 'cpp',
    categoryLabel: 'C++',
    level: 'Beginner',
    duration: '4 Hours',
    description: 'Learn modern C++: syntax, functions, return statements, if-else, loops, pointers, classes, constructor functions, and inheritance.',
    keyTopics: ['C++ Syntax & Standard I/O', 'Pointers & References', 'Classes & Object Constructors', 'Getters, Setters & Encapsulation', 'Class Inheritance'],
    promptSuggestion: 'What is the difference between a pointer and a reference in C++? Give examples.',
  },
  {
    id: 'cpp_brocode_02',
    youtubeId: '-TkoO8Z07hI',
    title: 'C++ Full Course for Free (Complete Curriculum)',
    channel: 'Bro Code',
    category: 'cpp',
    categoryLabel: 'C++',
    level: 'All Levels',
    duration: '6 Hours',
    description: 'From fundamental syntax to the C++ Standard Template Library (STL), memory management, function templates, and structs.',
    keyTopics: ['Dynamic Memory & New/Delete', 'Function Overloading & Templates', 'Structs vs Classes', 'STL Vectors & Iterators', 'Enums & Namespaces'],
    promptSuggestion: 'Explain how `std::vector` works internally in C++ and its amortized time complexity when pushing elements.',
  },
  {
    id: 'cpp_advanced_03',
    youtubeId: '8jLOx1hD3_o',
    title: 'C++ Programming Course - Beginner to Advanced',
    channel: 'freeCodeCamp.org',
    category: 'cpp',
    categoryLabel: 'C++',
    level: 'Advanced',
    duration: '31 Hours',
    description: 'Comprehensive modern C++20 masterclass covering move semantics, smart pointers, lambda expressions, templates, and concepts.',
    keyTopics: ['Modern C++20 Features', 'Unique & Shared Smart Pointers', 'Move Semantics & Rvalue References', 'Templates & Metaprogramming', 'C++ Concepts & Lambdas'],
    promptSuggestion: 'Can you explain Smart Pointers in C++ (std::unique_ptr vs std::shared_ptr) and when to use each?',
  },

  // ---------------- DATA ANALYSIS ----------------
  {
    id: 'da_fcc_01',
    youtubeId: 'r-uOLxNrNk8',
    title: 'Data Analysis with Python Course (Numpy, Pandas, Matplotlib)',
    channel: 'freeCodeCamp.org',
    category: 'data_analysis',
    categoryLabel: 'Data Analysis',
    level: 'Beginner',
    duration: '4.5 Hours',
    description: 'Master the core Python data analysis stack: NumPy arrays, Pandas DataFrames, cleaning missing values, and visualization.',
    keyTopics: ['NumPy Multidimensional Arrays', 'Pandas Series & DataFrames', 'Data Cleaning & Filtering', 'Matplotlib & Seaborn Visuals', 'Statistical Summaries'],
    promptSuggestion: 'How do you clean missing values (NaN) in Pandas? Show me methods like dropna, fillna, and interpolation.',
  },
  {
    id: 'da_keith_02',
    youtubeId: 'vmEHCJofslg',
    title: 'Pandas for Data Analysis - Real World Project Tutorial',
    channel: 'Keith Galli',
    category: 'data_analysis',
    categoryLabel: 'Data Analysis',
    level: 'Intermediate',
    duration: '1 Hour',
    description: 'Hands-on walkthrough analyzing real 12-month e-commerce sales dataset to answer executive business questions using Pandas.',
    keyTopics: ['Reading Multiple CSV Files', 'Data Preprocessing & Type Casting', 'Groupby & Aggregations', 'Plotting Business Insights', 'Feature Engineering'],
    promptSuggestion: 'Walk me through how `groupby()` and `agg()` work in Pandas with a sample dataset.',
  },
  {
    id: 'da_sql_03',
    youtubeId: 'HXV3zeRR3h4',
    title: 'SQL Tutorial - Full Database & Analytics Course',
    channel: 'freeCodeCamp.org',
    category: 'data_analysis',
    categoryLabel: 'Data Analysis',
    level: 'Beginner',
    duration: '4 Hours',
    description: 'Relational database querying and analytics: SELECT, WHERE, GROUP BY, HAVING, INNER/LEFT/RIGHT JOINS, and subqueries.',
    keyTopics: ['Database Normalization', 'Filtering & Sorting Data', 'INNER, LEFT, RIGHT JOINs', 'Aggregate Functions & GROUP BY', 'Nested SQL Subqueries'],
    promptSuggestion: 'Can you give me 3 SQL practice problems testing INNER JOIN, LEFT JOIN, and GROUP BY HAVING?',
  },
  {
    id: 'da_jovian_04',
    youtubeId: 'GPVsHOlRBBI',
    title: 'Data Analysis with Python: Zero to Pandas',
    channel: 'Jovian / freeCodeCamp.org',
    category: 'data_analysis',
    categoryLabel: 'Data Analysis',
    level: 'Intermediate',
    duration: '9 Hours',
    description: 'Complete hands-on course covering exploratory data analysis (EDA), Kaggle datasets, data visualization, and statistical modeling.',
    keyTopics: ['Exploratory Data Analysis (EDA)', 'Handling Outliers & Distributions', 'Interactive Data Visualizations', 'Kaggle Dataset Analysis', 'Storytelling with Data'],
    promptSuggestion: 'What are the main steps in Exploratory Data Analysis (EDA) on a new dataset? Provide a checklist.',
  },

  // ---------------- PROMPT ENGINEERING & AGENTIC AI ----------------
  {
    id: 'ai_prompt_01',
    youtubeId: '_ZvnD93Mr5Q',
    title: 'Prompt Engineering Full Course Tutorial',
    channel: 'freeCodeCamp.org',
    category: 'ai_agents',
    categoryLabel: 'Prompt Engineering & AI',
    level: 'All Levels',
    duration: '2 Hours',
    description: 'Learn modern prompt engineering: Zero-shot, Few-shot, Chain-of-Thought (CoT), System prompt design, and RAG architectures.',
    keyTopics: ['Zero-Shot & Few-Shot Prompting', 'Chain-of-Thought (CoT) Reasoning', 'System Prompt Optimization', 'Reducing Hallucinations', 'Retrieval-Augmented Generation (RAG)'],
    promptSuggestion: 'Explain the difference between Zero-shot, Few-shot, and Chain-of-Thought prompting with practical examples.',
  },
  {
    id: 'ai_andrew_02',
    youtubeId: 'jC4v5AS4RIM',
    title: 'ChatGPT & Prompt Engineering for Developers',
    channel: 'DeepLearning.AI / Andrew Ng',
    category: 'ai_agents',
    categoryLabel: 'Prompt Engineering & AI',
    level: 'Intermediate',
    duration: '1.5 Hours',
    description: 'Foundational developer guide by Andrew Ng & Isa Fulford on LLM API guidelines, JSON structured outputs, and iterative prompt design.',
    keyTopics: ['Iterative Prompt Development', 'Summarizing, Inferring & Transforming', 'Expanding & Generating Text', 'JSON Structured Output', 'Building Chatbots'],
    promptSuggestion: 'What are Andrew Ngs 2 primary principles of effective prompting? Can you explain them?',
  },
  {
    id: 'ai_agentic_03',
    youtubeId: 'qN5Xb6B8oCQ',
    title: 'Agentic AI & Autonomous AI Agents Explained',
    channel: 'AI Explained & Engineering Hub',
    category: 'ai_agents',
    categoryLabel: 'Prompt Engineering & AI',
    level: 'Intermediate',
    duration: '1.5 Hours',
    description: 'Comprehensive crash course on autonomous AI agents: perception-action loops, function calling, tool use, and multi-agent coordination.',
    keyTopics: ['ReAct (Reason + Act) Pattern', 'Function Calling & Tools', 'Agent Memory (Short & Long Term)', 'Planning & Reflection Loops', 'Autonomous Execution'],
    promptSuggestion: 'Explain how the ReAct (Reasoning and Acting) loop works in autonomous AI agents step-by-step.',
  },
  {
    id: 'ai_crew_04',
    youtubeId: 'b-72A0iUvWw',
    title: 'Build Autonomous AI Agents - CrewAI & Multi-Agent Guide',
    channel: 'freeCodeCamp.org',
    category: 'ai_agents',
    categoryLabel: 'Prompt Engineering & AI',
    level: 'Advanced',
    duration: '2 Hours',
    description: 'Build production multi-agent systems where specialized agents collaborate to perform deep research, analysis, and code synthesis.',
    keyTopics: ['Multi-Agent Collaboration', 'Role-Based Agent Assignment', 'Tool Integration & Custom Tools', 'Sequential & Hierarchical Workflows', 'Error Recovery & Human in the Loop'],
    promptSuggestion: 'How do multiple AI agents communicate and hand off tasks to each other in a multi-agent system?',
  },

  // ---------------- GIT & GITHUB ----------------
  {
    id: 'git_fcc_01',
    youtubeId: 'RGOj5yH7evk',
    title: 'Git and GitHub for Beginners - Crash Course',
    channel: 'freeCodeCamp.org',
    category: 'git',
    categoryLabel: 'Git & GitHub',
    level: 'Beginner',
    duration: '1 Hour',
    description: 'Everything a developer needs to know about version control: repositories, staging, commit history, branching, and GitHub workflows.',
    keyTopics: ['Init, Add & Commit', 'Branching & Merging', 'Resolving Merge Conflicts', 'Pushing & Pulling to GitHub', 'Creating Pull Requests (PRs)'],
    promptSuggestion: 'What is the difference between git merge and git rebase? When should I use each?',
  },
  {
    id: 'git_brocode_02',
    youtubeId: 'DVRQ_k_W4-0',
    title: 'Git & GitHub Full Course for Free',
    channel: 'Bro Code',
    category: 'git',
    categoryLabel: 'Git & GitHub',
    level: 'All Levels',
    duration: '1.2 Hours',
    description: 'Clean visual guide through git status, diff, restore, reset, stash, tags, and contributing to open-source repositories.',
    keyTopics: ['Working Directory vs Staging Area', 'Git Log & Git Diff', 'Git Stash & Pop', 'Git Reset vs Git Revert', 'Forking & Open Source'],
    promptSuggestion: 'Explain the difference between `git reset --soft`, `--mixed`, and `--hard`.',
  },
];

interface YouTubeLearningHubProps {
  profile: StudentProfile;
  onNavigateToChat: (prefilledText?: string) => void;
  onProfileUpdate?: (updated: StudentProfile) => void;
}

export const YouTubeLearningHub: React.FC<YouTubeLearningHubProps> = ({
  profile,
  onNavigateToChat,
  onProfileUpdate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeVideo, setActiveVideo] = useState<LearningVideo | null>(null);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false);

  // Local storage bookmarks & completed tracker
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`bookmarks_yt_${profile.userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`completed_yt_${profile.userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // User notes per video
  const [videoNotes, setVideoNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`notes_yt_${profile.userId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [currentNoteInput, setCurrentNoteInput] = useState<string>('');
  const [noteSaveStatus, setNoteSaveStatus] = useState<boolean>(false);

  // Toggle Bookmark
  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(`bookmarks_yt_${profile.userId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Toggle Completed
  const toggleCompleted = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompletedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(`completed_yt_${profile.userId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Handle opening video
  const handleOpenVideo = (video: LearningVideo) => {
    setActiveVideo(video);
    setCurrentNoteInput(videoNotes[video.id] || '');
  };

  // Save note for active video
  const handleSaveNote = () => {
    if (!activeVideo) return;
    const updated = {
      ...videoNotes,
      [activeVideo.id]: currentNoteInput,
    };
    setVideoNotes(updated);
    try {
      localStorage.setItem(`notes_yt_${profile.userId}`, JSON.stringify(updated));
      setNoteSaveStatus(true);
      setTimeout(() => setNoteSaveStatus(false), 2500);
    } catch {}
  };

  // Ask AI Tutor in WhatsApp
  const handleAskAITutor = (video: LearningVideo, customPrompt?: string) => {
    const prompt =
      customPrompt ||
      video.promptSuggestion ||
      `I'm studying ${video.title} (${video.categoryLabel}). Can you explain the core concepts and test me with a problem?`;
    onNavigateToChat(prompt);
  };

  // Filtered videos
  const filteredVideos = useMemo(() => {
    return YOUTUBE_VIDEOS.filter((video) => {
      // Category filter
      if (selectedCategory !== 'all' && video.category !== selectedCategory) {
        return false;
      }
      // Level filter
      if (selectedLevel !== 'all' && video.level !== selectedLevel) {
        return false;
      }
      // Bookmarks filter
      if (showBookmarksOnly && !bookmarkedIds.includes(video.id)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inTitle = video.title.toLowerCase().includes(query);
        const inChannel = video.channel.toLowerCase().includes(query);
        const inDesc = video.description.toLowerCase().includes(query);
        const inTopics = video.keyTopics.some((t) => t.toLowerCase().includes(query));
        const inCat = video.categoryLabel.toLowerCase().includes(query);
        if (!inTitle && !inChannel && !inDesc && !inTopics && !inCat) {
          return false;
        }
      }
      return true;
    });
  }, [selectedCategory, selectedLevel, showBookmarksOnly, searchQuery, bookmarkedIds]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: YOUTUBE_VIDEOS.length };
    YOUTUBE_VIDEOS.forEach((v) => {
      counts[v.category] = (counts[v.category] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-100 space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-950 border border-red-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400">
                <Youtube className="w-6 h-6 fill-red-500 text-red-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                Curated Free Video Library
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Free Tutorials
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              YouTube Learning Hub
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Curated masterclasses and full courses in <strong>Python</strong>, <strong>Java</strong>, <strong>C</strong>, <strong>C++</strong>, <strong>Data Analysis & SQL</strong>, <strong>Prompt Engineering & Agentic AI</strong>, and <strong>Git/GitHub</strong>. Watch directly inside the app, take notes, and ask your WhatsApp AI Tutor doubts instantly!
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 text-center min-w-[100px] shadow-md">
              <div className="text-xl font-black text-white">{YOUTUBE_VIDEOS.length}</div>
              <div className="text-[11px] text-slate-400">Full Courses</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 text-center min-w-[100px] shadow-md">
              <div className="text-xl font-black text-emerald-400">{completedIds.length}</div>
              <div className="text-[11px] text-slate-400">Completed</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 text-center min-w-[100px] shadow-md">
              <div className="text-xl font-black text-amber-400">{bookmarkedIds.length}</div>
              <div className="text-[11px] text-slate-400">Bookmarked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-4">
        {/* Search & Sub-Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, language, channel (e.g., Python, C++, Bro Code, Pandas, Prompting)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/40 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {/* Level Filter */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-red-500 transition cursor-pointer"
            >
              <option value="all">All Difficulty Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>

            {/* Bookmarks Toggle */}
            <button
              onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
              className={`flex items-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer shrink-0 ${
                showBookmarksOnly
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${showBookmarksOnly ? 'fill-amber-400' : ''}`} />
              <span>Saved ({bookmarkedIds.length})</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              selectedCategory === 'all'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <span>All Topics</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/50">
              {categoryCounts.all}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('python')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              selectedCategory === 'python'
                ? 'bg-yellow-600 text-white shadow-md shadow-yellow-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-yellow-400" />
            <span>Python</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/50">
              {categoryCounts.python || 0}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('java')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              selectedCategory === 'java'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-orange-400" />
            <span>Java</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/50">
              {categoryCounts.java || 0}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('c')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              selectedCategory === 'c'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>C</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/50">
              {categoryCounts.c || 0}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('cpp')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              selectedCategory === 'cpp'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>C++</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/50">
              {categoryCounts.cpp || 0}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('data_analysis')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              selectedCategory === 'data_analysis'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Data Analysis & SQL</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/50">
              {categoryCounts.data_analysis || 0}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('ai_agents')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              selectedCategory === 'ai_agents'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>Prompt Engineering & AI</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/50">
              {categoryCounts.ai_agents || 0}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('git')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              selectedCategory === 'git'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-orange-400" />
            <span>Git & GitHub</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/50">
              {categoryCounts.git || 0}
            </span>
          </button>
        </div>
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Youtube className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No courses match your filter</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try resetting your search query or switching categories to explore other programming languages.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedLevel('all');
              setShowBookmarksOnly(false);
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => {
            const isCompleted = completedIds.includes(video.id);
            const isBookmarked = bookmarkedIds.includes(video.id);
            const hasNotes = Boolean(videoNotes[video.id]);

            return (
              <div
                key={video.id}
                onClick={() => handleOpenVideo(video)}
                className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-red-500/40 rounded-3xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer hover:shadow-red-950/20 hover:-translate-y-0.5"
              >
                <div>
                  {/* Video Thumbnail Preview Header */}
                  <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                    <img
                      src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                      alt={video.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-115 transition-transform duration-300">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider bg-slate-950/80 backdrop-blur-md text-white border border-slate-700/60">
                        {video.categoryLabel}
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={(e) => toggleBookmark(video.id, e)}
                          title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Video'}
                          className={`p-1.5 rounded-xl backdrop-blur-md transition ${
                            isBookmarked
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-950/80 text-slate-300 hover:text-white'
                          }`}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-slate-950' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Duration & Level */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-white">
                      <span className="flex items-center space-x-1 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800">
                        <Clock className="w-3 h-3 text-red-400" />
                        <span className="font-semibold">{video.duration}</span>
                      </span>

                      <span className="bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800 text-slate-300 font-medium text-[10px]">
                        {video.level}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-slate-300 truncate max-w-[200px]">
                        {video.channel}
                      </span>
                      {isCompleted && (
                        <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Finished</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                      {video.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {video.description}
                    </p>

                    {/* Key Topics Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {video.keyTopics.slice(0, 3).map((topic, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-slate-950 text-slate-400 border border-slate-800 text-[10px] font-medium"
                        >
                          {topic}
                        </span>
                      ))}
                      {video.keyTopics.length > 3 && (
                        <span className="px-1.5 py-0.5 rounded-lg bg-slate-950 text-slate-500 text-[10px]">
                          +{video.keyTopics.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-5 pt-0 border-t border-slate-800/80 mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAskAITutor(video);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer border border-slate-700 hover:border-emerald-500"
                    title="Ask WhatsApp AI Tutor doubts about this topic"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask AI Tutor</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => toggleCompleted(video.id, e)}
                    className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                    title={isCompleted ? 'Mark as Not Completed' : 'Mark as Completed'}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'text-emerald-400' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIDEO PLAYER & INTERACTIVE STUDY MODAL */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="p-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 shrink-0">
                  <Youtube className="w-5 h-5 fill-red-500" />
                </div>
                <div className="truncate">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {activeVideo.categoryLabel}
                    </span>
                    <span className="text-xs text-slate-400">{activeVideo.duration}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white truncate mt-0.5">
                    {activeVideo.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <a
                  href={`https://www.youtube.com/watch?v=${activeVideo.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                  title="Open in YouTube"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">Open YouTube</span>
                </a>

                <button
                  onClick={() => setActiveVideo(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded Video Player & Study Notes */}
            <div className="flex-1 overflow-y-auto space-y-5 p-4 sm:p-6">
              {/* Responsive 16:9 Video Embed */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                />
              </div>

              {/* Course Overview & Doubts Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 2 Cols: Topics and Prompt */}
                <div className="md:col-span-2 space-y-4">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                      <Layers className="w-3.5 h-3.5 text-red-400" />
                      <span>Syllabus & Core Concepts Covered</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeVideo.keyTopics.map((topic, i) => (
                        <div
                          key={i}
                          className="flex items-center space-x-2 text-xs text-slate-200 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800/80"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ask AI Tutor Banner */}
                  <div className="bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-white">Have a doubt or want practice problems?</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Chat directly with the Socratic AI Tutor in WhatsApp to clarify code syntax, edge cases, and interview questions.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        handleAskAITutor(activeVideo);
                        setActiveVideo(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-1.5 transition shrink-0 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Ask AI Tutor Now</span>
                    </button>
                  </div>
                </div>

                {/* 1 Col: Quick Notes Notebook */}
                <div className="space-y-3 flex flex-col">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                          <span>My Study Notes</span>
                        </span>
                        {noteSaveStatus && (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                            <Check className="w-3 h-3" />
                            <span>Saved!</span>
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={7}
                        value={currentNoteInput}
                        onChange={(e) => setCurrentNoteInput(e.target.value)}
                        placeholder="Write personal timestamps, syntax notes, formulas, or questions here..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none font-mono"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2">
                      <button
                        onClick={handleSaveNote}
                        className="flex-1 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                      >
                        Save Notes
                      </button>
                      <button
                        onClick={() => toggleCompleted(activeVideo.id)}
                        className={`p-1.5 rounded-xl border transition cursor-pointer ${
                          completedIds.includes(activeVideo.id)
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                        title="Mark Completed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
