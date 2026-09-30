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
    this.reminders.set(rem1.id, rem1);
    this.reminders.set(examRem1.id, examRem1);

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

    this.documents.set(doc1.id, doc1);
    this.documents.set(doc2.id, doc2);
    this.documents.set(docJava.id, docJava);
    this.documents.set(docC.id, docC);
    this.documents.set(docCpp.id, docCpp);
    this.documents.set(docCSharp.id, docCSharp);
    this.documents.set(docR.id, docR);
    this.documents.set(docCalculus.id, docCalculus);

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

      // Calculus Chunks
      {
        id: 'chunk_calc_1',
        documentId: docCalculus.id,
        documentTitle: docCalculus.title,
        subject: 'Mathematics',
        chunkIndex: 1,
        content: 'Integration by Parts & LIATE Strategy: Integration by parts derives from the product rule: ∫ u dv = u v - ∫ v du. The LIATE heuristic determines which function to choose as u: Logarithmic, Inverse trigonometric, Algebraic, Trigonometric, Exponential. Differentiating u simplifies the integrand while integrating dv remains tractable.',
        keywords: ['Integration by parts', 'LIATE', 'product rule', 'calculus', 'anti-derivative'],
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
    return this.profiles.get(userId);
  }

  getProfileByPhone(phone: string): StudentProfile | undefined {
    const user = this.getUserByPhone(phone);
    if (!user) return undefined;
    return this.profiles.get(user.id);
  }

  getOrCreateProfile(phone: string, name = 'Student'): { user: User; profile: StudentProfile } {
    let user = this.getUserByPhone(phone);
    if (!user) {
      const id = 'usr_' + Math.random().toString(36).substring(2, 9);
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
        subjects: ['Python', 'DSA', 'Calculus'],
        currentSkillLevel: 'beginner',
        learningGoals: ['Understand core concepts', 'Pass exams with confidence'],
        weakTopics: [],
        strongTopics: [],
        studyHoursPerDay: 1.5,
        preferredStudyTime: '7:00 PM',
        examDates: [],
        learningHistory: [],
        streak: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        overallProgress: 10,
        totalSessions: 1,
        totalQuestionsAnswered: 0,
        correctAnswers: 0,
      };
      this.profiles.set(user.id, profile);
      return { user, profile };
    }

    let profile = this.profiles.get(user.id);
    if (!profile) {
      profile = {
        id: 'prof_' + user.id,
        userId: user.id,
        name: user.name,
        whatsappNumber: phone,
        preferredLanguage: 'en',
        educationLevel: 'college',
        subjects: ['Python', 'DSA'],
        currentSkillLevel: 'beginner',
        learningGoals: [],
        weakTopics: [],
        strongTopics: [],
        studyHoursPerDay: 1.5,
        preferredStudyTime: '7:00 PM',
        examDates: [],
        learningHistory: [],
        streak: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        overallProgress: 15,
        totalSessions: 1,
        totalQuestionsAnswered: 0,
        correctAnswers: 0,
      };
      this.profiles.set(user.id, profile);
    }
    return { user, profile };
  }

  updateProfile(userId: string, updates: Partial<StudentProfile>): StudentProfile | undefined {
    const prof = this.profiles.get(userId);
    if (!prof) return undefined;
    const updated = { ...prof, ...updates };
    this.profiles.set(userId, updated);
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
    for (const qs of this.quizSessions.values()) {
      if (qs.userId === userId && !qs.completed) return qs;
    }
    return undefined;
  }

  saveQuizSession(session: QuizSession): void {
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

  saveStudyPlan(plan: StudyPlan): void {
    this.studyPlans.set(plan.userId, plan);
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
