import {
  User,
  StudentProfile,
  Subject,
  Topic,
  QuizSession,
  QuizQuestion,
  QuizAnswer,
  StudyPlan,
  StudyPlanItem,
  Reminder,
  MessageRecord,
  DocumentRecord,
  DocumentChunk,
  Recommendation,
  MaterialReview,
} from '../../src/types/index.ts';

class DatabaseStore {
  users: Map<string, User> = new Map();
  profiles: Map<string, StudentProfile> = new Map();
  subjects: Map<string, Subject> = new Map();
  topics: Map<string, Topic[]> = new Map();
  quizSessions: Map<string, QuizSession> = new Map();
  quizAnswers: Map<string, QuizAnswer[]> = new Map();
  studyPlans: Map<string, StudyPlan> = new Map();
  reminders: Map<string, Reminder> = new Map();
  messages: MessageRecord[] = [];
  documents: Map<string, DocumentRecord> = new Map();
  chunks: DocumentChunk[] = [];
  learningObjectives: Map<string, any> = new Map();
  recommendations: Map<string, Recommendation[]> = new Map();
  reviews: Map<string, MaterialReview> = new Map();

  constructor() {
    this.seedInitialData();
  }

  seedInitialData() {
    // 1. Users
    const user1: User = {
      id: 'usr_rahul',
      name: 'Rahul Sharma',
      email: 'rahul.sharma@example.edu',
      phone: '+919876543210',
      role: 'student',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const user2: User = {
      id: 'usr_ananya',
      name: 'Ananya Rao',
      email: 'ananya.rao@example.edu',
      phone: '+919876543211',
      role: 'student',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const adminUser: User = {
      id: 'usr_admin',
      name: 'Prof. Vikram Sen',
      email: 'admin@ai-tutor.internal',
      phone: '+919876543299',
      role: 'admin',
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(user1.id, user1);
    this.users.set(user2.id, user2);
    this.users.set(adminUser.id, adminUser);

    // 2. Student Profiles
    const profile1: StudentProfile = {
      id: 'prof_rahul',
      userId: user1.id,
      name: user1.name,
      whatsappNumber: user1.phone,
      preferredLanguage: 'en',
      educationLevel: 'college',
      subjects: ['Python', 'DSA', 'Calculus', 'Machine Learning'],
      currentSkillLevel: 'intermediate',
      learningGoals: ['Crack Coding Interviews in 3 Months', 'Master Recursion & Dynamic Programming', 'Score A in Calculus'],
      weakTopics: ['Calculus (Integration & Limits)', 'DSA (Graph Algorithms)', 'Recursion edge cases'],
      strongTopics: ['Python Functions', 'Object-Oriented Programming', 'Binary Trees'],
      studyHoursPerDay: 2,
      preferredStudyTime: '7:00 PM',
      dailyReminderEnabled: true,
      examDates: [
        { subject: 'Calculus', date: '2026-10-15', title: 'Midterm Calculus & Linear Algebra' },
        { subject: 'DSA', date: '2026-10-28', title: 'Data Structures Lab Exam' },
        { subject: 'Government Exams', date: '2026-11-08', title: 'SSC CGL Tier-II & GATE CS Mock Examination' },
      ],
      learningHistory: [
        { topic: 'Python Functions & Scope', subject: 'Python', date: '2026-09-20', mastered: true },
        { topic: 'Binary Search & Complexity', subject: 'DSA', date: '2026-09-21', mastered: true },
        { topic: 'Definite Integrals', subject: 'Calculus', date: '2026-09-22', mastered: false },
      ],
      streak: 7,
      lastActiveDate: new Date().toISOString().split('T')[0],
      overallProgress: 76,
      totalSessions: 24,
      totalQuestionsAnswered: 88,
      correctAnswers: 69,
      notes: 'Prefers code snippets followed by step-by-step trace. Responds well to analogies.',
    };

    const profile2: StudentProfile = {
      id: 'prof_ananya',
      userId: user2.id,
      name: user2.name,
      whatsappNumber: user2.phone,
      preferredLanguage: 'kn',
      educationLevel: 'college',
      subjects: ['Python', 'Java', 'Calculus'],
      currentSkillLevel: 'beginner',
      learningGoals: ['Learn programming basics', 'Prepare for campus placements'],
      weakTopics: ['Java Multithreading', 'Pointers & References'],
      strongTopics: ['Python Basics', 'Control Flow'],
      studyHoursPerDay: 1.5,
      preferredStudyTime: '8:30 PM',
      examDates: [
        { subject: 'Java', date: '2026-10-10', title: 'Core Java Semester Exam' }
      ],
      learningHistory: [
        { topic: 'Variables & Loops', subject: 'Python', date: '2026-09-18', mastered: true },
        { topic: 'Java Classes & Objects', subject: 'Java', date: '2026-09-22', mastered: true }
      ],
      streak: 4,
      lastActiveDate: new Date().toISOString().split('T')[0],
      overallProgress: 62,
      totalSessions: 14,
      totalQuestionsAnswered: 45,
      correctAnswers: 32,
      notes: 'Prefers Kannada or English mixed explanations when dealing with tricky OOP concepts.',
    };

    this.profiles.set(profile1.userId, profile1);
    this.profiles.set(profile2.userId, profile2);

    // 3. Subjects
    const subjectsList: Subject[] = [
      { id: 'subj_py', name: 'Python', code: 'PY101', description: 'Syntax, functions, OOP, decorators, and data analysis packages.', icon: 'Code', category: 'Programming', topicsCount: 12 },
      { id: 'subj_dsa', name: 'Data Structures & Algorithms', code: 'CS201', description: 'Arrays, Linked Lists, Trees, Graphs, Sorting, Dynamic Programming.', icon: 'Binary', category: 'Computer Science', topicsCount: 18 },
      { id: 'subj_calc', name: 'Calculus & Mathematics', code: 'MATH202', description: 'Limits, Differentiation, Integration, Differential Equations & Series.', icon: 'Sigma', category: 'Mathematics', topicsCount: 14 },
      { id: 'subj_java', name: 'Java & OOP', code: 'CS102', description: 'OOP concepts, Interfaces, Collections framework, Exception handling.', icon: 'Coffee', category: 'Programming', topicsCount: 10 },
      { id: 'subj_ml', name: 'Machine Learning', code: 'AI301', description: 'Supervised learning, neural networks, loss functions, PyTorch basics.', icon: 'Brain', category: 'AI/Data Science', topicsCount: 15 },
      { id: 'subj_gov', name: 'Government Exams (UPSC, SSC, Banking, GATE)', code: 'GOV101', description: 'Quantitative Aptitude, Logical Reasoning, Indian Polity, Economy, Current Affairs & Technical PSU/GATE Prep.', icon: 'Landmark', category: 'Competitive Exams', topicsCount: 24 },
    ];
    for (const s of subjectsList) {
      this.subjects.set(s.id, s);
    }

    // 4. Topics
    this.topics.set('subj_py', [
      { id: 'top_py_1', subjectId: 'subj_py', title: 'Python Syntax & Variables', orderIndex: 1, difficulty: 'beginner', estimatedMinutes: 30, keyConcepts: ['Data types', 'f-strings', 'Type casting'], summary: 'Core data types and variable assignment rules in Python.' },
      { id: 'top_py_2', subjectId: 'subj_py', title: 'Control Flow & Loops', orderIndex: 2, difficulty: 'beginner', estimatedMinutes: 45, keyConcepts: ['if-elif-else', 'for-in', 'while', 'break/continue'], summary: 'Branching and iterative execution in Python.' },
      { id: 'top_py_3', subjectId: 'subj_py', title: 'Python Functions & Scope', orderIndex: 3, difficulty: 'intermediate', estimatedMinutes: 60, keyConcepts: ['def', 'return', '*args/**kwargs', 'LEGB scope'], summary: 'Modular code reuse, first-class functions and closures.' },
      { id: 'top_py_4', subjectId: 'subj_py', title: 'OOP: Classes & Inheritance', orderIndex: 4, difficulty: 'intermediate', estimatedMinutes: 75, keyConcepts: ['self', '__init__', 'Inheritance', 'Polymorphism'], summary: 'Encapsulation and object modeling in Python.' },
      { id: 'top_py_5', subjectId: 'subj_py', title: 'Recursion in Python', orderIndex: 5, difficulty: 'advanced', estimatedMinutes: 60, keyConcepts: ['Base case', 'Recursive step', 'Call stack', 'Recursion limit'], summary: 'Self-calling functions and recurrence relation solving.' },
    ]);

    this.topics.set('subj_dsa', [
      { id: 'top_dsa_1', subjectId: 'subj_dsa', title: 'Big O & Time Complexity', orderIndex: 1, difficulty: 'beginner', estimatedMinutes: 40, keyConcepts: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)'], summary: 'Asymptotic analysis of algorithms.' },
      { id: 'top_dsa_2', subjectId: 'subj_dsa', title: 'Arrays & Two-Pointer Technique', orderIndex: 2, difficulty: 'intermediate', estimatedMinutes: 50, keyConcepts: ['Prefix sums', 'Two pointers', 'Sliding window'], summary: 'Linear memory traversal and optimal window bounding.' },
      { id: 'top_dsa_3', subjectId: 'subj_dsa', title: 'Binary Search & Variations', orderIndex: 3, difficulty: 'intermediate', estimatedMinutes: 55, keyConcepts: ['Divide and conquer', 'Search space reduction', 'Boundary conditions'], summary: 'Searching sorted spaces in O(log n).' },
      { id: 'top_dsa_4', subjectId: 'subj_dsa', title: 'Binary Trees & Traversals', orderIndex: 4, difficulty: 'advanced', estimatedMinutes: 70, keyConcepts: ['Inorder', 'Preorder', 'Postorder', 'Level order (BFS)'], summary: 'Hierarchical node graphs and depth-first search.' },
    ]);

    this.topics.set('subj_calc', [
      { id: 'top_calc_1', subjectId: 'subj_calc', title: 'Limits & Continuity', orderIndex: 1, difficulty: 'intermediate', estimatedMinutes: 45, keyConcepts: ['L\'Hopital\'s rule', 'Squeeze theorem', 'Continuity test'], summary: 'Approaching values and function smoothness.' },
      { id: 'top_calc_2', subjectId: 'subj_calc', title: 'Differentiation & Chain Rule', orderIndex: 2, difficulty: 'intermediate', estimatedMinutes: 50, keyConcepts: ['Product rule', 'Quotient rule', 'Chain rule'], summary: 'Instantaneous rate of change.' },
      { id: 'top_calc_3', subjectId: 'subj_calc', title: 'Definite & Indefinite Integration', orderIndex: 3, difficulty: 'advanced', estimatedMinutes: 75, keyConcepts: ['Substitution', 'Integration by parts', 'Fundamental theorem of calculus'], summary: 'Accumulation of area under curves.' },
    ]);

    // 5. Sample Study Plan for Rahul
    const today = new Date();
    const planItems: StudyPlanItem[] = [
      {
        id: 'plan_item_1',
        dayNumber: 1,
        dateStr: new Date(today.getTime() - 2 * 86400000).toISOString().split('T')[0],
        title: 'Limits & Asymptotes',
        topic: 'Limits & Continuity',
        subject: 'Calculus',
        durationMinutes: 60,
        tasks: [
          { task: 'Revise Limit laws & L\'Hopital\'s rule (30m)', completed: true },
          { task: 'Solve 5 indeterminate form problems (20m)', completed: true },
          { task: 'Mini quiz on Calculus limits (10m)', completed: true },
        ],
        isCompleted: true,
        isMissed: false,
      },
      {
        id: 'plan_item_2',
        dayNumber: 2,
        dateStr: new Date(today.getTime() - 1 * 86400000).toISOString().split('T')[0],
        title: 'Differentiation Deep Dive',
        topic: 'Differentiation & Chain Rule',
        subject: 'Calculus',
        durationMinutes: 60,
        tasks: [
          { task: 'Chain rule with trigonometric functions (30m)', completed: true },
          { task: 'Practice 4 physics kinematics problems (20m)', completed: true },
          { task: 'Error review & flashcards (10m)', completed: true },
        ],
        isCompleted: true,
        isMissed: false,
      },
      {
        id: 'plan_item_3',
        dayNumber: 3,
        dateStr: today.toISOString().split('T')[0],
        title: 'Integration Fundamentals',
        topic: 'Definite & Indefinite Integration',
        subject: 'Calculus',
        durationMinutes: 90,
        tasks: [
          { task: 'Master u-substitution with exponents (40m)', completed: false },
          { task: 'Solve 6 integration practice questions (35m)', completed: false },
          { task: 'WhatsApp AI check-in & quiz (15m)', completed: false },
        ],
        isCompleted: false,
        isMissed: false,
      },
      {
        id: 'plan_item_4',
        dayNumber: 4,
        dateStr: new Date(today.getTime() + 1 * 86400000).toISOString().split('T')[0],
        title: 'Integration by Parts & Areas',
        topic: 'Definite & Indefinite Integration',
        subject: 'Calculus',
        durationMinutes: 90,
        tasks: [
          { task: 'LIATE rule and recursive integration (45m)', completed: false },
          { task: 'Calculate area between curves (30m)', completed: false },
          { task: 'Quick revision (15m)', completed: false },
        ],
        isCompleted: false,
        isMissed: false,
      },
      {
        id: 'plan_item_5',
        dayNumber: 5,
        dateStr: new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0],
        title: 'Full Calculus Midterm Mock',
        topic: 'Exam Review',
        subject: 'Calculus',
        durationMinutes: 120,
        tasks: [
          { task: 'Timed mock test 10 questions (60m)', completed: false },
          { task: 'AI Tutor doubt review on missed items (40m)', completed: false },
          { task: 'Formula sheet consolidation (20m)', completed: false },
        ],
        isCompleted: false,
        isMissed: false,
      },
    ];

    this.studyPlans.set(user1.id, {
      id: 'plan_rahul_calc',
      userId: user1.id,
      subject: 'Calculus',
      targetExam: 'Midterm Calculus & Linear Algebra',
      examDate: '2026-10-15',
      dailyHours: 2,
      currentLevel: 'intermediate',
      totalDays: 15,
      items: planItems,
      status: 'active',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    });

    // 6. Reminders
    const rem1: Reminder = {
      id: 'rem_1',
      userId: user1.id,
      whatsappNumber: user1.phone,
      reminderText: 'Time for your daily Python & DSA practice! 🚀 Solve 2 problems.',
      targetTime: '19:00',
      frequency: 'daily',
      subject: 'DSA',
      timezone: 'Asia/Kolkata',
      status: 'active',
      createdAt: new Date().toISOString(),
      type: 'daily_session',
    };
    const examRem1: Reminder = {
      id: 'rem_exam_calc',
      userId: user1.id,
      whatsappNumber: user1.phone,
      reminderText: '🚨 Upcoming Exam Reminder: Midterm Calculus & Linear Algebra is on Oct 15! Review Integration & Limits today.',
      targetTime: '08:00 AM',
      frequency: 'daily',
      subject: 'Calculus',
      timezone: 'Asia/Kolkata',
      status: 'active',
      createdAt: new Date().toISOString(),
      type: 'exam',
      examTitle: 'Midterm Calculus & Linear Algebra',
      examDate: '2026-10-15',
      daysBeforeExam: 19,
    };
    const govExamRem1: Reminder = {
      id: 'rem_gov_exam_alert',
      userId: user1.id,
      whatsappNumber: user1.phone,
      reminderText: '🏛️ Government Exam Notification: SSC CGL, UPSC CSE, IBPS PO & GATE CS/PSU Registration & Daily Mock Drill Alert!',
      targetTime: '09:00 AM',
      frequency: 'daily',
      subject: 'Government Exams',
      timezone: 'Asia/Kolkata',
      status: 'active',
      createdAt: new Date().toISOString(),
      type: 'exam',
      examTitle: 'SSC CGL Tier-II & GATE CS / PSU Recruitment Exam',
      examDate: '2026-11-08',
      daysBeforeExam: 32,
    };
    this.reminders.set(rem1.id, rem1);
    this.reminders.set(examRem1.id, examRem1);
    this.reminders.set(govExamRem1.id, govExamRem1);

    // 7. Seed RAG Knowledge Documents
    // 7. Seed RAG Knowledge Documents for Python, Java, C, C++, C#, R, DSA, and Calculus
    const doc1: DocumentRecord = {
      id: 'doc_python_handbook',
      title: 'Official Python 3 Standard Cheatsheet & Memory Model',
      subject: 'Python',
      category: 'Course Notes',
      originalFilename: 'python_memory_model_guide.pdf',
      fileSizeKb: 245,
      uploadedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      chunkCount: 3,
      summary: 'Covers Python execution model, mutable vs immutable types, recursion limit, and LEGB scoping rule.',
    };
    const doc2: DocumentRecord = {
      id: 'doc_dsa_handbook',
      title: 'Algorithm Design & Binary Search Invariants',
      subject: 'DSA',
      category: 'Textbook Extract',
      originalFilename: 'dsa_binary_search_guide.pdf',
      fileSizeKb: 410,
      uploadedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      chunkCount: 3,
      summary: 'Rigorous invariants for binary search, lower_bound, upper_bound, and avoiding integer overflow in mid = low + (high - low) // 2.',
    };
    const docJava: DocumentRecord = {
      id: 'doc_java_handbook',
      title: 'Java Core Architecture: JVM Internals, OOP & Concurrency',
      subject: 'Java',
      category: 'Reference Manual',
      originalFilename: 'java_jvm_concurrency_guide.pdf',
      fileSizeKb: 380,
      uploadedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      chunkCount: 3,
      summary: 'JVM memory architecture (Heap, Metaspace, Stack), OOP polymorphism with vtables, and multithreading synchronization.',
    };
    const docC: DocumentRecord = {
      id: 'doc_c_handbook',
      title: 'C Systems Programming: Pointers, Memory Allocation & Structs',
      subject: 'C',
      category: 'Course Notes',
      originalFilename: 'c_systems_pointers_manual.pdf',
      fileSizeKb: 320,
      uploadedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      chunkCount: 3,
      summary: 'Deep dive into pointer arithmetic, malloc/calloc/free heap allocation, and memory alignment in C.',
    };
    const docCpp: DocumentRecord = {
      id: 'doc_cpp_handbook',
      title: 'Modern C++ Guide: STL Containers, Templates & RAII Patterns',
      subject: 'C++',
      category: 'Textbook Extract',
      originalFilename: 'modern_cpp_stl_raii.pdf',
      fileSizeKb: 450,
      uploadedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      chunkCount: 3,
      summary: 'Covers RAII resource management, smart pointers (unique_ptr, shared_ptr), move semantics, and STL containers.',
    };
    const docCSharp: DocumentRecord = {
      id: 'doc_csharp_handbook',
      title: 'C# & .NET Core: CLR Internals, LINQ & Async/Await Architecture',
      subject: 'C#',
      category: 'Reference Manual',
      originalFilename: 'csharp_dotnet_linq_async.pdf',
      fileSizeKb: 395,
      uploadedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      chunkCount: 3,
      summary: 'Explains CLR execution, Garbage Collector generations (0,1,2), LINQ deferred execution, and Task-based async/await.',
    };
    const docR: DocumentRecord = {
      id: 'doc_r_handbook',
      title: 'R for Data Science: Vectorization, dplyr & ggplot2 Visualization',
      subject: 'R',
      category: 'Course Notes',
      originalFilename: 'r_datascience_ggplot2.pdf',
      fileSizeKb: 290,
      uploadedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      chunkCount: 3,
      summary: 'R data frames, vectorization vs loops, data transformation with dplyr, and statistical graphics with ggplot2.',
    };
    const docCalculus: DocumentRecord = {
      id: 'doc_calculus_notes',
      title: 'Calculus: Differential Rules, Integration by Parts & Series',
      subject: 'Mathematics',
      category: 'Lecture Notes',
      originalFilename: 'calculus_differential_integral.pdf',
      fileSizeKb: 340,
      uploadedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      chunkCount: 3,
      summary: 'Differentiation rules, chain rule, integration by parts with LIATE, and fundamental theorem of calculus.',
    };
    const docGenAI: DocumentRecord = {
      id: 'doc_genai_handbook',
      title: 'Generative AI Architecture: LLMs, Prompt Engineering & RAG',
      subject: 'Generative AI',
      category: 'Architecture Guide',
      originalFilename: 'generative_ai_llm_rag_handbook.pdf',
      fileSizeKb: 390,
      uploadedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      chunkCount: 3,
      summary: 'Transformer multi-head attention, context window management, few-shot prompt patterns, and dense vector embeddings.',
    };
    const docAgents: DocumentRecord = {
      id: 'doc_agents_handbook',
      title: 'Autonomous AI Agents: ReAct Loops, Tool Calling & Multi-Agent Swarms',
      subject: 'AI Agents',
      category: 'Reference Manual',
      originalFilename: 'autonomous_ai_agents_handbook.pdf',
      fileSizeKb: 430,
      uploadedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      chunkCount: 3,
      summary: 'ReAct agent loop, tool execution schemas, state graphs with LangGraph, and hierarchical multi-agent delegation with CrewAI.',
    };
    const docDsaLinear: DocumentRecord = {
      id: 'doc_dsa_linear_patterns',
      title: 'DSA Study Guide: Arrays, Sliding Window, Two Pointers, Linked Lists & Monotonic Stacks',
      subject: 'DSA',
      category: 'DSA Study Material',
      originalFilename: 'dsa_arrays_sliding_window_linked_lists.pdf',
      fileSizeKb: 485,
      uploadedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      chunkCount: 3,
      summary: 'Comprehensive DSA notes on Kadane’s algorithm, fixed/variable sliding window templates, fast-and-slow Floyd cycle detection, and O(n) monotonic stack patterns.',
    };
    const docDsaTreesGraphsDp: DocumentRecord = {
      id: 'doc_dsa_trees_graphs_dp',
      title: 'DSA Masterbook: Trees, Heaps, Graph Algorithms (BFS/DFS/Dijkstra) & Dynamic Programming',
      subject: 'DSA',
      category: 'DSA Study Material',
      originalFilename: 'dsa_trees_graphs_dynamic_programming.pdf',
      fileSizeKb: 560,
      uploadedAt: new Date().toISOString(),
      chunkCount: 3,
      summary: 'In-depth DSA study material covering AVL/Red-Black trees, Topological Sort (Kahn’s algorithm), Dijkstra shortest paths, Disjoint Set Union (DSU), and 1D/2D DP state transitions.',
    };
    const docGovUpscPolity: DocumentRecord = {
      id: 'doc_gov_upsc_polity_gs',
      title: 'Government Exams Prep: UPSC CSE & State PCS — Indian Polity, Economy & General Studies',
      subject: 'Government Exams',
      category: 'Government Exam Material',
      originalFilename: 'upsc_state_pcs_polity_economy_compendium.pdf',
      fileSizeKb: 620,
      uploadedAt: new Date().toISOString(),
      chunkCount: 3,
      summary: 'Complete General Studies compendium for UPSC IAS/IPS and State PCS: Constitutional Articles, Fundamental Rights, Parliamentary Procedures, Fiscal & Monetary Policy, and Five-Year Plans.',
    };
    const docGovSscBankingAptitude: DocumentRecord = {
      id: 'doc_gov_ssc_banking_quant',
      title: 'Government Exams Prep: SSC CGL, IBPS/SBI PO & Railways — Quantitative Aptitude & Reasoning Shortcuts',
      subject: 'Government Exams',
      category: 'Government Exam Material',
      originalFilename: 'ssc_ibps_rrb_quant_reasoning_handbook.pdf',
      fileSizeKb: 540,
      uploadedAt: new Date().toISOString(),
      chunkCount: 3,
      summary: 'High-speed formula handbook and solved patterns for SSC CGL, CHSL, Banking PO, and RRB NTPC: Percentages, SI/CI, Time & Work, Geometry, Syllogisms, Seating Arrangements, and Data Interpretation.',
    };
    const docGovGatePsuCs: DocumentRecord = {
      id: 'doc_gov_gate_psu_cs',
      title: 'Government Technical Exams: GATE CS/IT, ISRO, DRDO & NIC Scientist Revision Handbook',
      subject: 'Government Exams',
      category: 'Government Exam Material',
      originalFilename: 'gate_isro_drdo_cs_technical_handbook.pdf',
      fileSizeKb: 590,
      uploadedAt: new Date().toISOString(),
      chunkCount: 3,
      summary: 'Targeted revision notes for technical government exams (GATE, ISRO, BARC, NIC): Master Theorem recurrences, OS CPU scheduling & page replacement, DBMS B+ Trees & ACID, and TCP congestion control.',
    };

    this.documents.set(doc1.id, doc1);
    this.documents.set(doc2.id, doc2);
    this.documents.set(docJava.id, docJava);
    this.documents.set(docC.id, docC);
    this.documents.set(docCpp.id, docCpp);
    this.documents.set(docCSharp.id, docCSharp);
    this.documents.set(docR.id, docR);
    this.documents.set(docCalculus.id, docCalculus);
    this.documents.set(docGenAI.id, docGenAI);
    this.documents.set(docAgents.id, docAgents);
    this.documents.set(docDsaLinear.id, docDsaLinear);
    this.documents.set(docDsaTreesGraphsDp.id, docDsaTreesGraphsDp);
    this.documents.set(docGovUpscPolity.id, docGovUpscPolity);
    this.documents.set(docGovSscBankingAptitude.id, docGovSscBankingAptitude);
    this.documents.set(docGovGatePsuCs.id, docGovGatePsuCs);

    this.chunks.push(
      // Python Chunks
      {
        id: 'chunk_py_1',
        documentId: doc1.id,
        documentTitle: doc1.title,
        subject: 'Python',
        chunkIndex: 1,
        content: 'Python Memory Scoping & Recursion: Python functions maintain a local namespace. When a function calls itself, a new stack frame is pushed onto the interpreter call stack. The default recursion limit in CPython is 1000, inspectable via sys.getrecursionlimit(). Base cases must be explicitly defined to terminate the chain and prevent RecursionError: maximum recursion depth exceeded.',
        keywords: ['recursion', 'call stack', 'sys.getrecursionlimit', 'base case', 'RecursionError'],
      },
      {
        id: 'chunk_py_2',
        documentId: doc1.id,
        documentTitle: doc1.title,
        subject: 'Python',
        chunkIndex: 2,
        content: 'Python Object References: Variables in Python are labels bound to objects in heap memory. Immutable objects (int, float, str, tuple) cannot be altered in place; operations create new instances. Mutable objects (list, dict, set) can be mutated via methods like .append() or in-place item assignment. Default argument values are evaluated once at function definition time, leading to the infamous mutable default argument bug.',
        keywords: ['mutable', 'immutable', 'object reference', 'default argument bug', 'list'],
      },

      // Java Chunks
      {
        id: 'chunk_java_1',
        documentId: docJava.id,
        documentTitle: docJava.title,
        subject: 'Java',
        chunkIndex: 1,
        content: 'Java Virtual Machine (JVM) Architecture: The JVM partitions memory into the Heap (Eden, Survivor, and Tenured spaces for dynamic objects), Thread Stacks (for primitive local variables and method call frames), and Metaspace (for class bytecode metadata). Garbage Collection (such as G1GC or ZGC) automatically reclaims unreferenced heap objects through mark-and-sweep phases.',
        keywords: ['JVM', 'Heap', 'Metaspace', 'Garbage Collection', 'Thread Stack'],
      },
      {
        id: 'chunk_java_2',
        documentId: docJava.id,
        documentTitle: docJava.title,
        subject: 'Java',
        chunkIndex: 2,
        content: 'Java OOP & Polymorphism: Runtime polymorphism is achieved via method overriding, resolved dynamically using a virtual method table (vtable). Abstract classes can hold state and method implementations, whereas Interfaces define contract capabilities (supporting default and static methods since Java 8). Multiple inheritance of state is prohibited to avoid the diamond problem.',
        keywords: ['polymorphism', 'vtable', 'abstract class', 'interface', 'overriding'],
      },
      {
        id: 'chunk_java_3',
        documentId: docJava.id,
        documentTitle: docJava.title,
        subject: 'Java',
        chunkIndex: 3,
        content: 'Java Concurrency & Thread Synchronization: Java threads synchronize critical sections using the `synchronized` keyword, which acquires the object monitor lock. The `volatile` keyword guarantees memory visibility across CPU caches by establishing a happens-before relationship, but does not provide mutual exclusion. `java.util.concurrent` provides ReentrantLock, CountDownLatch, and thread-safe collections.',
        keywords: ['concurrency', 'synchronized', 'volatile', 'happens-before', 'ReentrantLock'],
      },

      // C Chunks
      {
        id: 'chunk_c_1',
        documentId: docC.id,
        documentTitle: docC.title,
        subject: 'C',
        chunkIndex: 1,
        content: 'C Pointer Fundamentals & Arithmetic: A pointer variable holds the direct memory address of another variable. The dereference operator `*p` reads or modifies the value at that address, while `&x` extracts the address of x. Pointer arithmetic (`p + 1`) advances the memory pointer by `sizeof(*p)` bytes. Passing pointers to functions simulates pass-by-reference.',
        keywords: ['pointers', 'dereferencing', 'address-of', 'sizeof', 'pointer arithmetic'],
      },
      {
        id: 'chunk_c_2',
        documentId: docC.id,
        documentTitle: docC.title,
        subject: 'C',
        chunkIndex: 2,
        content: 'Dynamic Memory Allocation in C: `malloc(size_t size)` allocates uninitialized heap memory. `calloc(size_t num, size_t size)` allocates and zeroes out memory. `realloc(void *ptr, size_t new_size)` resizes previously allocated blocks. Every dynamically allocated block must be freed with `free(ptr)` to prevent memory leaks; setting `ptr = NULL` afterwards eliminates dangling pointer hazards.',
        keywords: ['malloc', 'calloc', 'realloc', 'free', 'memory leaks', 'dangling pointers'],
      },
      {
        id: 'chunk_c_3',
        documentId: docC.id,
        documentTitle: docC.title,
        subject: 'C',
        chunkIndex: 3,
        content: 'C Structures and Memory Alignment: Structs bundle heterogeneous variables into a single contiguous memory block. Due to hardware memory alignment requirements, compilers insert padding bytes between struct members so that data words align on 4-byte or 8-byte boundaries. Structure members are accessed via `.` for values and `->` for pointers.',
        keywords: ['struct', 'memory alignment', 'padding bytes', 'arrow operator', 'typedef'],
      },

      // C++ Chunks
      {
        id: 'chunk_cpp_1',
        documentId: docCpp.id,
        documentTitle: docCpp.title,
        subject: 'C++',
        chunkIndex: 1,
        content: 'Resource Acquisition Is Initialization (RAII) and Smart Pointers: Modern C++ relies on RAII so that resources are acquired in constructors and automatically released in destructors when objects go out of scope. `std::unique_ptr<T>` provides exclusive ownership with zero overhead over raw pointers. `std::shared_ptr<T>` maintains a reference-counted control block, while `std::weak_ptr<T>` prevents cyclic reference leaks.',
        keywords: ['RAII', 'smart pointers', 'unique_ptr', 'shared_ptr', 'weak_ptr', 'destructors'],
      },
      {
        id: 'chunk_cpp_2',
        documentId: docCpp.id,
        documentTitle: docCpp.title,
        subject: 'C++',
        chunkIndex: 2,
        content: 'Standard Template Library (STL) Containers: `std::vector` stores elements contiguously with amortized O(1) push_back and cache-friendly iteration. `std::unordered_map` provides average O(1) lookup via hash tables. `std::map` and `std::set` are implemented as self-balancing Red-Black trees guaranteeing O(log n) lookup and sorted order.',
        keywords: ['STL', 'vector', 'unordered_map', 'map', 'Red-Black tree', 'cache locality'],
      },
      {
        id: 'chunk_cpp_3',
        documentId: docCpp.id,
        documentTitle: docCpp.title,
        subject: 'C++',
        chunkIndex: 3,
        content: 'Move Semantics and Rvalue References: Introduced in C++11, rvalue references (`T&&`) and `std::move` allow transferring ownership of resources (like heap memory or file handles) from temporary objects without allocating memory or performing deep copies, dramatically accelerating performance.',
        keywords: ['move semantics', 'rvalue references', 'std::move', 'move constructor', 'performance'],
      },

      // C# Chunks
      {
        id: 'chunk_csharp_1',
        documentId: docCSharp.id,
        documentTitle: docCSharp.title,
        subject: 'C#',
        chunkIndex: 1,
        content: 'C# Common Language Runtime (CLR) & Garbage Collection: C# compiles into Common Intermediate Language (CIL), which the CLR Just-In-Time (JIT) compiler translates into native machine code. The generational Garbage Collector groups objects into Gen 0 (short-lived), Gen 1 (buffer), and Gen 2 (long-lived). Unmanaged resources implement `IDisposable` and are cleanly scoped via the `using` statement.',
        keywords: ['CLR', 'JIT compilation', 'CIL', 'Garbage Collector', 'IDisposable', 'using'],
      },
      {
        id: 'chunk_csharp_2',
        documentId: docCSharp.id,
        documentTitle: docCSharp.title,
        subject: 'C#',
        chunkIndex: 2,
        content: 'LINQ (Language Integrated Query) Architecture: LINQ enables querying collections, databases, and XML. LINQ queries leverage deferred execution: methods like `Where()`, `Select()`, and `OrderBy()` return `IEnumerable<T>` and execute only when enumerated via `foreach`, `ToList()`, or `ToArray()`. Expressions trees allow Entity Framework to translate LINQ into native SQL queries.',
        keywords: ['LINQ', 'deferred execution', 'IEnumerable', 'ToList', 'Entity Framework', 'Expressions'],
      },
      {
        id: 'chunk_csharp_3',
        documentId: docCSharp.id,
        documentTitle: docCSharp.title,
        subject: 'C#',
        chunkIndex: 3,
        content: 'Async / Await and Task-Based Asynchronous Pattern (TAP): In C#, asynchronous operations return `Task` or `Task<T>`. The `await` keyword yields execution back to the caller while the asynchronous I/O operation completes on background threads, preventing UI freeze and thread starvation on web servers without manual thread management.',
        keywords: ['async', 'await', 'Task', 'TAP', 'thread starvation', 'non-blocking I/O'],
      },

      // R Chunks
      {
        id: 'chunk_r_1',
        documentId: docR.id,
        documentTitle: docR.title,
        subject: 'R',
        chunkIndex: 1,
        content: 'R Atomic Vectors and Vectorization: The fundamental data structure in R is the vector (numeric, integer, character, logical). Vectorization allows arithmetic and logical operations to be applied across entire arrays simultaneously in optimized C routines under the hood, making vectorized expressions vastly faster than explicit R for-loops.',
        keywords: ['vectorization', 'atomic vectors', 'R data structures', 'performance', 'vector indexing'],
      },
      {
        id: 'chunk_r_2',
        documentId: docR.id,
        documentTitle: docR.title,
        subject: 'R',
        chunkIndex: 2,
        content: 'Data Manipulation with dplyr and the Pipe Operator: In R data science, the dplyr package provides five core verbs: `filter()` for row subsets, `select()` for column subsets, `mutate()` for calculating new features, `summarise()` for aggregation, and `group_by()` for grouped operations. The native pipe operator `|>` chains operations clearly.',
        keywords: ['dplyr', 'filter', 'select', 'mutate', 'pipe operator', 'data wrangling'],
      },
      {
        id: 'chunk_r_3',
        documentId: docR.id,
        documentTitle: docR.title,
        subject: 'R',
        chunkIndex: 3,
        content: 'Data Visualization with ggplot2: Built on Leland Wilkinson’s Grammar of Graphics, ggplot2 creates plots by combining three layers: the dataset, aesthetic mappings (`aes()` for x, y, color, shape), and geometric objects (`geom_point`, `geom_line`, `geom_bar`, `geom_histogram`). Faceting (`facet_wrap`) splits plots into multi-panel matrices.',
        keywords: ['ggplot2', 'Grammar of Graphics', 'aes', 'geom_point', 'facet_wrap', 'visualization'],
      },

      // DSA Chunks
      {
        id: 'chunk_dsa_1',
        documentId: doc2.id,
        documentTitle: doc2.title,
        subject: 'DSA',
        chunkIndex: 1,
        content: 'Binary Search Invariant: Binary search works on monotonic spaces (sorted arrays or monotonic boolean predicate functions). At each iteration, mid = low + (high - low) // 2 prevents potential 32-bit integer overflow. If target == arr[mid], the index is found. If target < arr[mid], high = mid - 1. If target > arr[mid], low = mid + 1. Time complexity is O(log n) as the search space halves every comparison.',
        keywords: ['binary search', 'O(log n)', 'monotonic', 'mid calculation', 'overflow'],
      },
      {
        id: 'chunk_dsa_linear_1',
        documentId: docDsaLinear.id,
        documentTitle: docDsaLinear.title,
        subject: 'DSA',
        chunkIndex: 1,
        content: 'Two Pointers & Sliding Window Technique: For contiguous subarray problems, maintain a window [left, right]. Expand `right` each step to include elements, and shrink `left` while the window constraint is violated. Fixed-size windows compute rolling sums in O(n) time and O(1) space. Kadane’s Algorithm finds the maximum subarray sum in O(n) using `curr = max(x, curr + x)`.',
        keywords: ['sliding window', 'two pointers', 'Kadane algorithm', 'subarray', 'O(n)'],
      },
      {
        id: 'chunk_dsa_linear_2',
        documentId: docDsaLinear.id,
        documentTitle: docDsaLinear.title,
        subject: 'DSA',
        chunkIndex: 2,
        content: 'Linked Lists & Floyd’s Tortoise-and-Hare Cycle Detection: Use `slow = slow.next` and `fast = fast.next.next`. If `slow == fast`, a cycle exists in O(n) time and O(1) auxiliary space. To find the cycle entry point, reset one pointer to `head` and advance both by 1 step until they meet. Monotonic Stacks solve Next Greater Element in O(n) amortized time.',
        keywords: ['linked list', 'Floyd cycle detection', 'fast and slow pointers', 'monotonic stack', 'next greater element'],
      },
      {
        id: 'chunk_dsa_graphs_1',
        documentId: docDsaTreesGraphsDp.id,
        documentTitle: docDsaTreesGraphsDp.title,
        subject: 'DSA',
        chunkIndex: 1,
        content: 'Graph Shortest Paths & Topological Sort: Breadth-First Search (BFS) finds shortest paths in unweighted graphs in O(V + E). Dijkstra’s Algorithm uses a Min-Heap Priority Queue for non-negative weighted graphs in O((V + E) log V). Bellman-Ford handles negative weights and detects negative cycles in O(V * E). Kahn’s Algorithm uses in-degree queues for DAG topological ordering.',
        keywords: ['BFS', 'DFS', 'Dijkstra', 'Bellman-Ford', 'Topological Sort', 'Kahn algorithm'],
      },
      {
        id: 'chunk_dsa_dp_1',
        documentId: docDsaTreesGraphsDp.id,
        documentTitle: docDsaTreesGraphsDp.title,
        subject: 'DSA',
        chunkIndex: 2,
        content: 'Dynamic Programming (DP) State & Transitions: DP optimizes overlapping subproblems and optimal substructure. 1) 0/1 Knapsack: `dp[i][w] = max(dp[i-1][w], val[i] + dp[i-1][w - wt[i]])`. 2) Longest Common Subsequence (LCS): if `s1[i]==s2[j]`, `1 + dp[i-1][j-1]`, else `max(dp[i-1][j], dp[i][j-1])`. Space optimization reduces 2D DP tables to 1D rolling arrays.',
        keywords: ['Dynamic Programming', 'Knapsack', 'LCS', 'memoization', 'tabulation', 'optimal substructure'],
      },

      // Government Exams Chunks
      {
        id: 'chunk_gov_upsc_1',
        documentId: docGovUpscPolity.id,
        documentTitle: docGovUpscPolity.title,
        subject: 'Government Exams',
        chunkIndex: 1,
        content: 'Indian Polity & Constitution High-Yield Summary (UPSC CSE & State PCS): Part III (Articles 12–35) guarantees Fundamental Rights: Equality (Art 14–18), Freedom (Art 19–22), Constitutional Remedies (Art 32 — Heart & Soul of the Constitution via Writs: Habeas Corpus, Mandamus, Prohibition, Certiorari, Quo Warranto). Part IV (Art 36–51) outlines Directive Principles of State Policy (DPSP), and Art 51A lists 11 Fundamental Duties.',
        keywords: ['UPSC', 'Indian Polity', 'Fundamental Rights', 'Article 32', 'Writs', 'DPSP', 'State PCS'],
      },
      {
        id: 'chunk_gov_ssc_bank_1',
        documentId: docGovSscBankingAptitude.id,
        documentTitle: docGovSscBankingAptitude.title,
        subject: 'Government Exams',
        chunkIndex: 1,
        content: 'Quantitative Aptitude & Reasoning Shortcuts (SSC CGL, IBPS PO, RRB NTPC): 1) Successive Percentage Change of a% and b%: `Net = (a + b + (a*b)/100)%`. 2) Compound vs Simple Interest 2-Year Difference: `Diff = P * (R / 100)^2`. 3) Time & Work: Total Work = LCM of individual days; Efficiency = Total Work / Days. 4) Syllogisms: Use Euler Venn Diagrams and check definite vs possibility conclusions.',
        keywords: ['SSC CGL', 'IBPS PO', 'Quantitative Aptitude', 'Compound Interest', 'Time and Work', 'Syllogism', 'RRB NTPC'],
      },
      {
        id: 'chunk_gov_gate_psu_1',
        documentId: docGovGatePsuCs.id,
        documentTitle: docGovGatePsuCs.title,
        subject: 'Government Exams',
        chunkIndex: 1,
        content: 'GATE CS/IT, ISRO & PSU Technical Revision: 1) Master Theorem for `T(n) = aT(n/b) + f(n)`: compare `f(n)` with `n^(log_b a)`. 2) Operating Systems: Coffman’s 4 Deadlock conditions are Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait. Virtual Memory Effective Access Time (EAT) = `p * (TLB + Mem) + (1 - p) * (TLB + 2 * Mem)`. 3) DBMS: BCNF requires every non-trivial FD `X -> Y` to have `X` as a superkey.',
        keywords: ['GATE CS', 'ISRO', 'PSU Exam', 'Master Theorem', 'Deadlock', 'TLB', 'BCNF', 'DBMS'],
      },

      // Calculus Chunks
      {
        id: 'chunk_calc_1',
        documentId: docCalculus.id,
        documentTitle: docCalculus.title,
        subject: 'Mathematics',
        chunkIndex: 1,
        content: 'Integration by Parts & LIATE Strategy: Integration by parts derives from the product rule: ∫ u dv = u v - ∫ v du. The LIATE heuristic determines which function to choose as u: Logarithmic, Inverse trigonometric, Algebraic, Trigonometric, Exponential. Differentiating u simplifies the integrand while integrating dv remains tractable.',
        keywords: ['Integration by parts', 'LIATE', 'product rule', 'calculus', 'anti-derivative'],
      },

      // Generative AI Chunks
      {
        id: 'chunk_genai_1',
        documentId: docGenAI.id,
        documentTitle: docGenAI.title,
        subject: 'Generative AI',
        chunkIndex: 1,
        content:
          'Large Language Models (LLMs) & Transformers: Auto-regressive transformer decoders predict the next token based on learned probability distributions. The core mechanism is Scaled Dot-Product Attention: Attention(Q, K, V) = softmax(QK^T / sqrt(d_k))V. Multi-Head Attention allows the model to attend to information at different positions from different representation subspaces simultaneously.',
        keywords: ['LLM', 'Transformers', 'Self-Attention', 'Dot-Product Attention', 'Tokenization'],
      },
      {
        id: 'chunk_genai_2',
        documentId: docGenAI.id,
        documentTitle: docGenAI.title,
        subject: 'Generative AI',
        chunkIndex: 2,
        content:
          'Retrieval-Augmented Generation (RAG) Architecture: RAG grounds LLMs in verified external knowledge bases. The pipeline chunks source documents with sliding window overlap, embeds text chunks into dense continuous vectors, indexes them into a vector database (e.g. HNSW, FAISS, Pinecone), and retrieves top-k semantic matches via cosine similarity to inject into the prompt context window.',
        keywords: ['RAG', 'Vector Embeddings', 'Cosine Similarity', 'Chunking', 'Hallucination Mitigation'],
      },

      // AI Agents Chunks
      {
        id: 'chunk_agents_1',
        documentId: docAgents.id,
        documentTitle: docAgents.title,
        subject: 'AI Agents',
        chunkIndex: 1,
        content:
          'Autonomous Agent ReAct Pattern: An AI Agent uses an iterative Reason + Act loop. In the Thought step, the model formulates hypotheses. In the Action step, it calls a declared tool (e.g. calculator, database query, API fetch) with structured JSON arguments. In the Observation step, the environment output is appended back to memory before formulating the next thought or final answer.',
        keywords: ['AI Agent', 'ReAct Pattern', 'Tool Calling', 'Observation Loop', 'Autonomous Execution'],
      },
      {
        id: 'chunk_agents_2',
        documentId: docAgents.id,
        documentTitle: docAgents.title,
        subject: 'AI Agents',
        chunkIndex: 2,
        content:
          'Multi-Agent Collaboration & State Graphs: Frameworks like LangGraph, CrewAI, and AutoGen enable multi-agent systems where agents specialize in roles (Researcher, Critic, Coder, Reviewer). State graphs maintain shared memory, checkpoints, error reflection, and human-in-the-loop approvals before executing irreversible actions.',
        keywords: ['Multi-Agent', 'LangGraph', 'CrewAI', 'AutoGen', 'Human in the loop', 'State Graphs'],
      }
    );

    // 8. Recommendations
    this.recommendations.set(user1.id, [
      {
        id: 'rec_1',
        userId: user1.id,
        title: 'Revise Calculus: Integration by Parts',
        subject: 'Calculus',
        topic: 'Definite & Indefinite Integration',
        reason: 'Your quiz accuracy in Calculus is currently 45%, lower than your overall 76% average.',
        actionType: 'revision',
        priority: 'high',
        isCompleted: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rec_2',
        userId: user1.id,
        title: 'Practice 5 Graph Traversal Problems',
        subject: 'DSA',
        topic: 'Breadth-First Search & DFS',
        reason: 'Identified as a weak topic in student profile prior to midterm.',
        actionType: 'practice',
        priority: 'medium',
        isCompleted: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'rec_3',
        userId: user1.id,
        title: 'Take Advanced Python OOP Quiz',
        subject: 'Python',
        topic: 'OOP: Classes & Inheritance',
        reason: 'You scored 85% on Functions! You are ready to advance to intermediate-to-advanced OOP questions.',
        actionType: 'quiz',
        priority: 'low',
        isCompleted: false,
        createdAt: new Date().toISOString(),
      },
    ]);

    // 9. Initial sample messages
    this.messages.push(
      {
        id: 'msg_init_1',
        userId: user1.id,
        whatsappNumber: user1.phone,
        direction: 'incoming',
        messageType: 'text',
        content: 'Explain recursion in simple terms',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        intent: 'LEARN_TOPIC',
        agentName: 'Tutor Agent',
      },
      {
        id: 'msg_init_2',
        userId: user1.id,
        whatsappNumber: user1.phone,
        direction: 'outgoing',
        messageType: 'text',
        content: `*Recursion* is when a function calls itself to solve a smaller piece of the same problem! 🪞

Think of it like *Russian Nesting Dolls (Matryoshka)*:
You open a big doll, and find a slightly smaller doll inside. You keep opening dolls until you reach the tiniest solid doll that cannot open. That tiniest doll is your *Base Case*!

1️⃣ *Two Golden Rules*:
• *Base Case*: When to STOP.
• *Recursive Step*: Calling the function with a smaller input.

2️⃣ *Python Example*:
\`\`\`python
def countdown(n):
    if n <= 0:          # Base Case
        print("Blast off! 🚀")
        return
    print(n)
    countdown(n - 1)    # Recursive Step
\`\`\`

3️⃣ *Practice Question*:
What happens if you remove the \`if n <= 0\` check?
A) It stops at 0
B) RecursionError (Stack Overflow)
C) Returns None

Type your answer below! 👇`,
        timestamp: new Date(Date.now() - 1000 * 60 * 29).toISOString(),
        intent: 'LEARN_TOPIC',
        agentName: 'Tutor Agent',
      }
    );

    // 10. Initial Verified Reviews & Ratings on Programming Documents and Courses
    const rev1: MaterialReview = {
      id: 'rev_1',
      materialId: 'doc_python_handbook',
      materialType: 'document',
      materialTitle: 'Official Python 3 Standard Cheatsheet & Memory Model',
      userId: user1.id,
      userName: user1.name,
      userAvatar: user1.avatarUrl,
      rating: 5,
      comment: 'The memory scoping and recursion frame notes cleared up all my confusion on maximum recursion depth in Python! Essential for competitive programming.',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      likesCount: 14,
    };
    const rev2: MaterialReview = {
      id: 'rev_2',
      materialId: 'doc_java_handbook',
      materialType: 'document',
      materialTitle: 'Java Core Architecture: JVM Internals, OOP & Concurrency',
      userId: user2.id,
      userName: user2.name,
      userAvatar: user2.avatarUrl,
      rating: 5,
      comment: 'The JVM Heap vs Metaspace breakdown and the explanation of happens-before memory visibility with volatile are top notch. Helped me ace my mock interview.',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      likesCount: 19,
    };
    const rev3: MaterialReview = {
      id: 'rev_3',
      materialId: 'doc_c_handbook',
      materialType: 'document',
      materialTitle: 'C Systems Programming: Pointers, Memory Allocation & Structs',
      userId: user1.id,
      userName: user1.name,
      userAvatar: user1.avatarUrl,
      rating: 5,
      comment: 'Pointer arithmetic and structure memory padding diagrams are super clear. Prevented multiple segmentation faults in my coursework.',
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      likesCount: 8,
    };
    const rev4: MaterialReview = {
      id: 'rev_4',
      materialId: 'res_py_cs50p',
      materialType: 'course',
      materialTitle: "Harvard CS50P: CS50's Introduction to Programming with Python",
      userId: user2.id,
      userName: user2.name,
      userAvatar: user2.avatarUrl,
      rating: 5,
      comment: 'Prof. David J. Malan is easily the best CS teacher on the internet. His analogies for conditionals and regex made everything click.',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      likesCount: 32,
    };
    const rev5: MaterialReview = {
      id: 'rev_5',
      materialId: 'res_cpp_cherno',
      materialType: 'course',
      materialTitle: 'The C++ Series – Master Modern C++ [The Cherno]',
      userId: user1.id,
      userName: user1.name,
      userAvatar: user1.avatarUrl,
      rating: 5,
      comment: 'Yan Chernikov breaks down how the linker, stack, heap, and vtables actually work in assembly. Must watch for any C++ developer.',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      likesCount: 27,
    };
    const rev6: MaterialReview = {
      id: 'rev_6',
      materialId: 'doc_cpp_handbook',
      materialType: 'document',
      materialTitle: 'Modern C++ Guide: STL Containers, Templates & RAII Patterns',
      userId: user2.id,
      userName: user2.name,
      userAvatar: user2.avatarUrl,
      rating: 4,
      comment: 'Smart pointer ownership rules (unique_ptr vs shared_ptr) are explained very clearly with zero memory leak guarantees.',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      likesCount: 11,
    };
    const rev7: MaterialReview = {
      id: 'rev_7',
      materialId: 'res_java_kunal',
      materialType: 'course',
      materialTitle: 'Java + DSA + Interview Preparation Bootcamp',
      userId: user1.id,
      userName: user1.name,
      userAvatar: user1.avatarUrl,
      rating: 5,
      comment: 'Kunal’s recursion tree visualizations and live debugging sessions are gold standard. Completely free without any paywall.',
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      likesCount: 45,
    };
    this.reviews.set(rev1.id, rev1);
    this.reviews.set(rev2.id, rev2);
    this.reviews.set(rev3.id, rev3);
    this.reviews.set(rev4.id, rev4);
    this.reviews.set(rev5.id, rev5);
    this.reviews.set(rev6.id, rev6);
    this.reviews.set(rev7.id, rev7);
  }

  // --- Query Helpers ---
  getUserByPhone(phone: string): User | undefined {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    for (const u of this.users.values()) {
      if (u.phone.replace(/[^\d+]/g, '') === cleanPhone) return u;
    }
    return undefined;
  }

  getProfileByUserId(userId: string): StudentProfile | undefined {
    if (!userId) return undefined;
    const direct = this.profiles.get(userId);
    if (direct) return direct;
    for (const p of this.profiles.values()) {
      if (p.userId === userId || p.id === userId) return p;
    }
    return undefined;
  }

  getProfileByPhone(phone: string): StudentProfile | undefined {
    const user = this.getUserByPhone(phone);
    if (!user) return undefined;
    return this.getProfileByUserId(user.id);
  }

  getOrCreateProfile(
    phone: string,
    name = 'Student',
    requestedUserId?: string
  ): { user: User; profile: StudentProfile } {
    if (requestedUserId) {
      const existingByUid = this.getProfileByUserId(requestedUserId);
      if (existingByUid) {
        const existingUser =
          this.users.get(existingByUid.userId) || {
            id: existingByUid.userId,
            name: existingByUid.name || name,
            email: `${(existingByUid.name || name).toLowerCase().replace(/\s+/g, '')}@student.whatsapp`,
            phone: existingByUid.whatsappNumber || phone,
            role: 'student' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        this.users.set(existingUser.id, existingUser);
        return { user: existingUser, profile: existingByUid };
      }
    }

    let user = this.getUserByPhone(phone);
    if (!user || (requestedUserId && user.id !== requestedUserId)) {
      const id = requestedUserId || 'usr_' + Math.random().toString(36).substring(2, 9);
      user = {
        id,
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '')}@student.whatsapp`,
        phone,
        role: 'student',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.users.set(user.id, user);

      const profile: StudentProfile = {
        id: 'prof_' + user.id,
        userId: user.id,
        name,
        whatsappNumber: phone,
        preferredLanguage: 'en',
        educationLevel: 'college',
        subjects: ['Python', 'DSA', 'Calculus', 'Java'],
        currentSkillLevel: 'intermediate',
        learningGoals: ['Master Programming & Algorithms', 'Pass exams with confidence'],
        weakTopics: ['Calculus (Integration & Limits)', 'Recursion edge cases', 'DSA (Graph Algorithms)'],
        strongTopics: ['Python Functions', 'Control Flow', 'Binary Search'],
        studyHoursPerDay: 2,
        preferredStudyTime: '7:00 PM',
        dailyReminderEnabled: true,
        examDates: [
          { subject: 'Calculus', date: '2026-10-15', title: 'Midterm Calculus & Linear Algebra' },
          { subject: 'DSA', date: '2026-10-28', title: 'Data Structures Lab Exam' },
        ],
        learningHistory: [
          { topic: 'Python Functions & Scope', subject: 'Python', date: '2026-09-20', mastered: true },
          { topic: 'Binary Search & Complexity', subject: 'DSA', date: '2026-09-21', mastered: true },
        ],
        streak: 5,
        lastActiveDate: new Date().toISOString().split('T')[0],
        overallProgress: 72,
        totalSessions: 8,
        totalQuestionsAnswered: 25,
        correctAnswers: 19,
      };
      this.profiles.set(user.id, profile);
      return { user, profile };
    }

    let profile = this.getProfileByUserId(user.id);
    if (!profile) {
      profile = {
        id: 'prof_' + user.id,
        userId: user.id,
        name: user.name,
        whatsappNumber: phone,
        preferredLanguage: 'en',
        educationLevel: 'college',
        subjects: ['Python', 'DSA', 'Calculus'],
        currentSkillLevel: 'intermediate',
        learningGoals: ['Master core concepts'],
        weakTopics: ['Recursion edge cases', 'Calculus (Integration & Limits)'],
        strongTopics: ['Python Functions'],
        studyHoursPerDay: 2,
        preferredStudyTime: '7:00 PM',
        dailyReminderEnabled: true,
        examDates: [
          { subject: 'Calculus', date: '2026-10-15', title: 'Midterm Calculus & Linear Algebra' },
        ],
        learningHistory: [],
        streak: 3,
        lastActiveDate: new Date().toISOString().split('T')[0],
        overallProgress: 68,
        totalSessions: 5,
        totalQuestionsAnswered: 15,
        correctAnswers: 11,
      };
      this.profiles.set(user.id, profile);
    }
    return { user, profile };
  }

  updateProfile(userId: string, updates: Partial<StudentProfile>): StudentProfile | undefined {
    if (!userId) return undefined;
    let prof = this.getProfileByUserId(userId);
    if (!prof) {
      const created = this.getOrCreateProfile(
        updates.whatsappNumber || '+919876543210',
        updates.name || 'Student',
        userId
      );
      prof = created.profile;
    }
    const updated: StudentProfile = {
      ...prof,
      ...updates,
      userId: prof.userId,
    };
    this.profiles.set(prof.userId, updated);
    return updated;
  }

  recordMessage(msg: Omit<MessageRecord, 'id' | 'timestamp'>): MessageRecord {
    const record: MessageRecord = {
      ...msg,
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      deliveryStatus: msg.deliveryStatus || (msg.direction === 'outgoing' ? 'sent' : 'delivered'),
    };
    this.messages.push(record);
    if (this.messages.length > 500) {
      this.messages.shift();
    }
    return record;
  }

  updateMessageDeliveryStatus(
    messageId: string,
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed',
    error?: string
  ): boolean {
    const msg = this.messages.find((m) => m.id === messageId || (m.rawPayload && m.rawPayload.wamid === messageId));
    if (msg) {
      msg.deliveryStatus = status;
      if (error) msg.deliveryError = error;
      return true;
    }
    return false;
  }

  getActiveQuizSession(userId: string): QuizSession | undefined {
    const allSessions = Array.from(this.quizSessions.values());
    for (let i = allSessions.length - 1; i >= 0; i--) {
      const qs = allSessions[i];
      if (qs.userId === userId && !qs.completed) return qs;
    }
    return undefined;
  }

  saveQuizSession(session: QuizSession): void {
    // If saving a newly started uncompleted session, mark any older active sessions for this user as completed
    if (!session.completed && session.currentIndex === 0) {
      for (const existing of this.quizSessions.values()) {
        if (existing.userId === session.userId && existing.id !== session.id && !existing.completed) {
          existing.completed = true;
        }
      }
    }
    this.quizSessions.set(session.id, session);
  }

  recordQuizAnswer(answer: QuizAnswer): void {
    const list = this.quizAnswers.get(answer.quizSessionId) || [];
    list.push(answer);
    this.quizAnswers.set(answer.quizSessionId, list);
  }

  getStudyPlan(userId: string): StudyPlan | undefined {
    return this.studyPlans.get(userId);
  }

  getStudyPlanByUserId(userId: string): StudyPlan | undefined {
    return this.studyPlans.get(userId);
  }

  saveStudyPlan(plan: StudyPlan): StudyPlan {
    this.studyPlans.set(plan.userId, plan);
    return plan;
  }

  getProgressByUserId(userId: string): { subject: string; topic: string; masteryLevel: number }[] {
    const prof = this.getProfileByUserId(userId);
    if (!prof) return [];
    const history = Array.isArray(prof.learningHistory) ? prof.learningHistory : [];
    const map = new Map<string, { subject: string; topic: string; masteryLevel: number }>();

    for (const h of history) {
      const key = `${h.subject}:${h.topic}`;
      map.set(key, {
        subject: h.subject || 'Python',
        topic: h.topic || h.subject || 'Core Concepts',
        masteryLevel: typeof h.score === 'number' ? h.score : h.mastered ? 85 : 62,
      });
    }

    if (map.size === 0) {
      const subjects = Array.isArray(prof.subjects) && prof.subjects.length > 0 ? prof.subjects : ['Python', 'DSA', 'Calculus'];
      const defaults = [78, 66, 58, 72];
      subjects.forEach((subj, idx) => {
        map.set(`${subj}:Core`, {
          subject: subj,
          topic: `${subj} Core Foundations`,
          masteryLevel: defaults[idx % defaults.length],
        });
      });
    }

    return Array.from(map.values());
  }

  upsertProgress(userId: string, subject: string, topic: string, masteryLevel: number): void {
    const prof = this.getProfileByUserId(userId);
    if (!prof) return;
    const history = Array.isArray(prof.learningHistory) ? [...prof.learningHistory] : [];
    const todayStr = new Date().toISOString().split('T')[0];
    const idx = history.findIndex(
      (h) =>
        h.subject.toLowerCase() === subject.toLowerCase() &&
        h.topic.toLowerCase() === topic.toLowerCase()
    );
    const entry = {
      subject,
      topic,
      date: todayStr,
      score: Math.min(100, Math.max(0, Math.round(masteryLevel))),
      mastered: masteryLevel >= 75,
    };
    if (idx >= 0) {
      history[idx] = entry;
    } else {
      history.push(entry);
    }
    this.updateProfile(userId, { learningHistory: history });
  }

  checkAndAwardAchievements(userId: string): { id: string; title: string; xpReward: number }[] {
    const prof = this.getProfileByUserId(userId);
    if (!prof) return [];
    const existing: any[] = Array.isArray(prof.achievements) ? [...prof.achievements] : [];
    const existingIds = new Set(existing.map((a: any) => (typeof a === 'string' ? a : a?.id)).filter(Boolean));
    const newlyAwarded: { id: string; title: string; xpReward: number }[] = [];
    const nowIso = new Date().toISOString();

    const candidates = [
      {
        id: 'first_quiz_step',
        title: 'Active Recall Starter',
        description: 'Completed your interactive quiz check on WhatsApp.',
        category: 'consistency' as const,
        icon: 'zap' as const,
        tier: 'bronze' as const,
        xpReward: 100,
        condition: (prof.totalQuestionsAnswered || 0) >= 3,
      },
      {
        id: 'streak_7_days',
        title: '7-Day Streak Champion',
        description: 'Maintained a 7-day continuous learning streak.',
        category: 'streak' as const,
        icon: 'flame' as const,
        tier: 'gold' as const,
        xpReward: 250,
        condition: (prof.streak || 0) >= 7,
      },
      {
        id: 'questions_100',
        title: '100 Questions Answered',
        description: 'Solved 100+ adaptive quiz questions across subjects.',
        category: 'questions' as const,
        icon: 'target' as const,
        tier: 'platinum' as const,
        xpReward: 500,
        condition: (prof.totalQuestionsAnswered || 0) >= 100,
      },
    ];

    for (const c of candidates) {
      if (c.condition && !existingIds.has(c.id)) {
        existing.push({
          id: c.id,
          title: c.title,
          description: c.description,
          category: c.category,
          icon: c.icon,
          tier: c.tier,
          unlockedAt: nowIso,
          xpReward: c.xpReward,
        });
        newlyAwarded.push({ id: c.id, title: c.title, xpReward: c.xpReward });
      }
    }

    if (newlyAwarded.length > 0) {
      this.updateProfile(userId, { achievements: existing });
    }
    return newlyAwarded;
  }

  generateSmartReminderSuggestions(userId: string): {
    peakActivityWindow: string;
    averageAccuracy: number;
    daysUntilExam: number | null;
    urgencyLevel: 'critical' | 'high' | 'moderate';
    suggestions: {
      timeLabel: string;
      time24: string;
      windowLabel: string;
      recommendedSubject: string;
      recommendedTopic: string;
      durationMinutes: number;
      confidenceScore: number;
      reason: string;
    }[];
  } {
    const prof = this.getProfileByUserId(userId) || Array.from(this.profiles.values())[0];
    const totalQ = prof?.totalQuestionsAnswered || 0;
    const correctQ = prof?.correctAnswers || 0;
    const averageAccuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 75;
    const subjects =
      Array.isArray(prof?.subjects) && prof.subjects.length > 0
        ? prof.subjects
        : ['Python', 'DSA', 'Calculus'];
    const weakTopics =
      Array.isArray(prof?.weakTopics) && prof.weakTopics.length > 0
        ? prof.weakTopics
        : ['Recursion & Call Stack', 'Integration by Parts'];

    let daysUntilExam: number | null = null;
    if (Array.isArray(prof?.examDates) && prof.examDates.length > 0) {
      const nearest = prof.examDates[0];
      const diff = Math.ceil((new Date(nearest.date).getTime() - Date.now()) / 86400000);
      daysUntilExam = Math.max(1, diff);
    }

    const urgencyLevel: 'critical' | 'high' | 'moderate' =
      daysUntilExam !== null && daysUntilExam <= 7
        ? 'critical'
        : daysUntilExam !== null && daysUntilExam <= 14
        ? 'high'
        : 'moderate';

    return {
      peakActivityWindow: `Morning Analytical Window (08:30 AM) & Evening Deep Work (${prof?.preferredStudyTime || '07:00 PM'})`,
      averageAccuracy,
      daysUntilExam,
      urgencyLevel,
      suggestions: [
        {
          timeLabel: '08:30 AM',
          time24: '08:30',
          windowLabel: 'Morning Peak Analytical Window',
          recommendedSubject: subjects[0],
          recommendedTopic: weakTopics[0] || `${subjects[0]} Core Problem Solving`,
          durationMinutes: 45,
          confidenceScore: 98,
          reason: `Ideal for high-cognitive-load topics like ${weakTopics[0] || subjects[0]} when working memory is freshest.`,
        },
        {
          timeLabel: '04:30 PM',
          time24: '16:30',
          windowLabel: 'Afternoon Active Recall Sprint',
          recommendedSubject: subjects[1 % subjects.length],
          recommendedTopic: weakTopics[1 % weakTopics.length] || `${subjects[1 % subjects.length]} Practice`,
          durationMinutes: 30,
          confidenceScore: 94,
          reason: `Prevents afternoon forgetting curve and raises your ${averageAccuracy}% quiz accuracy.`,
        },
        {
          timeLabel: prof?.preferredStudyTime || '07:00 PM',
          time24: '19:00',
          windowLabel: 'Evening Habit-Anchored Deep Work',
          recommendedSubject: subjects[0],
          recommendedTopic: `Timed Exam Drill & Day ${(prof?.streak || 1) + 1} Streak Lock-In`,
          durationMinutes: 45,
          confidenceScore: 97,
          reason: `Aligned with your preferred daily study habit to lock in your ${prof?.streak || 1}-day streak.`,
        },
      ],
    };
  }

  addStudyPlanItem(userId: string, item: StudyPlanItem): StudyPlan {
    let plan = this.studyPlans.get(userId);
    if (!plan) {
      const prof = this.getProfileByUserId(userId);
      plan = {
        id: 'plan_' + userId + '_' + Date.now(),
        userId,
        subject: item.subject || 'General Study',
        targetExam: 'Upcoming Exams',
        examDate: item.dateStr,
        dailyHours: prof?.studyHoursPerDay || 2,
        currentLevel: prof?.currentSkillLevel || 'intermediate',
        totalDays: 30,
        items: [],
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      this.studyPlans.set(userId, plan);
    }
    // Check if item exists, update or add
    const existingIdx = plan.items.findIndex((i) => i.id === item.id);
    if (existingIdx >= 0) {
      plan.items[existingIdx] = { ...plan.items[existingIdx], ...item };
    } else {
      plan.items.push(item);
    }
    // Sort items by dateStr
    plan.items.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    return plan;
  }

  updateStudyPlanItem(userId: string, itemId: string, updates: Partial<StudyPlanItem>): StudyPlan | undefined {
    const plan = this.studyPlans.get(userId);
    if (!plan) return undefined;
    const item = plan.items.find((i) => i.id === itemId);
    if (!item) return undefined;
    Object.assign(item, updates);
    return plan;
  }

  deleteStudyPlanItem(userId: string, itemId: string): StudyPlan | undefined {
    const plan = this.studyPlans.get(userId);
    if (!plan) return undefined;
    plan.items = plan.items.filter((i) => i.id !== itemId);
    return plan;
  }

  getReminders(userId: string): Reminder[] {
    return Array.from(this.reminders.values()).filter((r) => r.userId === userId);
  }

  getRemindersByUserId(userId: string): any[] {
    return Array.from(this.reminders.values())
      .filter((r) => r.userId === userId)
      .map((r) => ({
        ...r,
        message: (r as any).message || r.reminderText,
        scheduledTime: (r as any).scheduledTime || r.targetTime,
        active: (r as any).active !== undefined ? (r as any).active : r.status === 'active',
      }));
  }

  saveReminder(reminder: any): Reminder {
    const normalized: Reminder = {
      id: reminder.id || `rem_${Date.now()}`,
      userId: reminder.userId,
      whatsappNumber: reminder.whatsappNumber || '+919876543210',
      reminderText: reminder.reminderText || reminder.message || 'Scheduled Study Session',
      targetTime: reminder.targetTime || reminder.scheduledTime || '07:00 PM',
      frequency: reminder.frequency || 'daily',
      subject: reminder.subject || 'General Study',
      timezone: reminder.timezone || 'Asia/Kolkata',
      status: reminder.status || (reminder.active === false ? 'paused' : 'active'),
      createdAt: reminder.createdAt || new Date().toISOString(),
      type: reminder.type || 'daily_session',
    };
    this.reminders.set(normalized.id, normalized);
    return normalized;
  }

  addReminder(reminder: Reminder): void {
    this.reminders.set(reminder.id, reminder);
  }

  updateReminder(id: string, updates: Partial<Reminder>): Reminder | undefined {
    const rem = this.reminders.get(id);
    if (!rem) return undefined;
    const updated = { ...rem, ...updates };
    this.reminders.set(id, updated);
    return updated;
  }

  deleteReminder(id: string): boolean {
    return this.reminders.delete(id);
  }

  getRecommendations(userId: string): Recommendation[] {
    return this.recommendations.get(userId) || [];
  }

  addRecommendation(rec: Recommendation): void {
    const list = this.recommendations.get(rec.userId) || [];
    list.unshift(rec);
    this.recommendations.set(rec.userId, list);
  }

  searchChunks(query: string, limit = 3): DocumentChunk[] {
    const qLower = (query || '').toLowerCase().trim();
    if (!qLower) return [];

    const queryWords = qLower
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);

    const scored = this.chunks.map((chunk) => {
      let score = 0;
      const titleLower = (chunk.documentTitle || '').toLowerCase();
      const subjectLower = (chunk.subject || '').toLowerCase();
      const contentLower = (chunk.content || '').toLowerCase();

      // Subject match gets high priority
      if (qLower.includes(subjectLower) || subjectLower.includes(qLower)) {
        score += 8;
      }

      // Title match gets priority
      for (const w of queryWords) {
        if (titleLower.includes(w)) score += 6;
      }

      // Keyword matches
      for (const kw of chunk.keywords || []) {
        const kwLower = kw.toLowerCase();
        if (qLower.includes(kwLower)) score += 5;
        for (const w of queryWords) {
          if (kwLower === w) score += 4;
        }
      }

      // Content word occurrences
      for (const w of queryWords) {
        if (w.length > 2 && contentLower.includes(w)) {
          score += 2;
        }
      }

      return { chunk, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.chunk);
  }
}

export const db = new DatabaseStore();
