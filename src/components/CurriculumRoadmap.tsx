import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  BookOpen,
  Award,
  ChevronRight,
  Clock,
  MessageSquare,
  Flame,
  Brain,
  Layers,
  ArrowRight,
  Filter,
  RotateCcw,
  Check,
  Zap,
  Tag,
  WifiOff,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import {
  saveMilestoneProgress,
  getAllMilestoneProgress,
  MilestoneProgressItem,
} from '../utils/offlineDb.ts';
import { db, doc, setDoc } from '../firebase.ts';

export interface RoadmapMilestone {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedTime: string;
  level: 'Foundational' | 'Core' | 'Advanced' | 'Mastery';
  keyConcepts: string[];
  docTitle?: string;
  courseTitle?: string;
}

export const SUBJECT_ROADMAPS: Record<string, RoadmapMilestone[]> = {
  Python: [
    {
      id: 'py_step_1',
      stepNumber: 1,
      title: 'Python Syntax, Variables & Execution Model',
      description: 'Master primitive types (int, float, str, bool), dynamic typing, mutable vs immutable memory models, and standard input/output.',
      estimatedTime: '2-3 hours',
      level: 'Foundational',
      keyConcepts: ['Variables', 'Dynamic Typing', 'Type Casting', 'ID & Memory Address'],
      docTitle: 'Official Python 3 Standard Cheatsheet & Memory Model',
      courseTitle: "Harvard CS50P: Introduction to Programming with Python",
    },
    {
      id: 'py_step_2',
      stepNumber: 2,
      title: 'Conditionals, Loops & Control Flow',
      description: 'Master branching logic with if/elif/else, while loops, for-in loops with range(), break, continue, and pass statements.',
      estimatedTime: '3-4 hours',
      level: 'Foundational',
      keyConcepts: ['if/elif/else', 'for in range', 'while loops', 'loop invariants'],
      courseTitle: 'Python for Beginners – Full Course [Programming with Mosh]',
    },
    {
      id: 'py_step_3',
      stepNumber: 3,
      title: 'Functions, Scoping (LEGB) & Recursion',
      description: 'Understand function definitions, default parameter evaluation, *args and **kwargs, local vs global scope, and call stack frame mechanics in recursion.',
      estimatedTime: '4-5 hours',
      level: 'Core',
      keyConcepts: ['Function Scope', 'LEGB Rule', 'Recursion Base Case', 'Default Argument Bug'],
      docTitle: 'Official Python 3 Standard Cheatsheet & Memory Model',
    },
    {
      id: 'py_step_4',
      stepNumber: 4,
      title: 'Core Data Structures: Lists, Tuples, Dictionaries & Sets',
      description: 'Deep dive into Python collections: slicing, list comprehensions, dictionary hashing, set union/intersection, and time complexities.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['List Comprehensions', 'Hash Maps', 'Tuple Immutability', 'O(1) Set Lookups'],
    },
    {
      id: 'py_step_5',
      stepNumber: 5,
      title: 'Object-Oriented Programming (OOP): Classes & Inheritance',
      description: 'Build class blueprints with __init__, self, instance vs class variables, classmethods, staticmethods, single & multiple inheritance, and method overriding.',
      estimatedTime: '6-8 hours',
      level: 'Advanced',
      keyConcepts: ['__init__ Constructor', 'Class vs Instance Attributes', 'Inheritance & super()', 'Polymorphism'],
      courseTitle: 'Python OOP Tutorials [Corey Schafer]',
    },
    {
      id: 'py_step_6',
      stepNumber: 6,
      title: 'File I/O, Context Managers & Exception Handling',
      description: 'Learn try/except/finally blocks, custom exception classes, and robust file streaming with the with statement context manager.',
      estimatedTime: '3-4 hours',
      level: 'Core',
      keyConcepts: ['try/except/finally', 'Context Managers (with)', 'File Streaming', 'Custom Exceptions'],
    },
    {
      id: 'py_step_7',
      stepNumber: 7,
      title: 'Advanced Python: Generators, Decorators & Asyncio',
      description: 'Master memory-efficient generators with yield, function decorators, and non-blocking asynchronous event loops with asyncio.',
      estimatedTime: '6-8 hours',
      level: 'Advanced',
      keyConcepts: ['yield & Generators', '@decorator syntax', 'async/await', 'Event Loops'],
    },
    {
      id: 'py_step_8',
      stepNumber: 8,
      title: 'Capstone: Production Application & Algorithmic Problem Solving',
      description: 'Synthesize your skills into an end-to-end Python automation script or web service with unit testing (pytest) and modular architecture.',
      estimatedTime: '10-12 hours',
      level: 'Mastery',
      keyConcepts: ['Clean Architecture', 'Unit Testing (pytest)', 'Packaging', 'Error Resilience'],
    },
  ],

  Java: [
    {
      id: 'java_step_1',
      stepNumber: 1,
      title: 'Java Fundamentals & JVM Architecture',
      description: 'Understand the JDK, JRE, JVM, bytecode compilation, Primitive types vs Object references, and basic console syntax.',
      estimatedTime: '3-4 hours',
      level: 'Foundational',
      keyConcepts: ['JVM Architecture', 'Bytecode', 'Primitives vs References', 'System.out.println'],
      docTitle: 'Java Core Architecture: JVM Internals, OOP & Concurrency',
      courseTitle: 'Java Full Course for Beginners [Bro Code]',
    },
    {
      id: 'java_step_2',
      stepNumber: 2,
      title: 'Object-Oriented Principles: Encapsulation & Constructors',
      description: 'Write clean Java classes with private fields, getters/setters, constructor overloading, and the this keyword.',
      estimatedTime: '4-5 hours',
      level: 'Foundational',
      keyConcepts: ['Encapsulation', 'Access Modifiers', 'Constructors', 'this Keyword'],
      courseTitle: 'Java + DSA Bootcamp [Kunal Kushwaha]',
    },
    {
      id: 'java_step_3',
      stepNumber: 3,
      title: 'Inheritance, Interfaces & Runtime Polymorphism',
      description: 'Master inheritance with extends, super(), abstract classes, interface contracts (default/static methods), and runtime method overriding via vtables.',
      estimatedTime: '6-8 hours',
      level: 'Core',
      keyConcepts: ['Polymorphism', 'Interfaces', 'Abstract Classes', 'vtable resolution'],
      docTitle: 'Java Core Architecture: JVM Internals, OOP & Concurrency',
    },
    {
      id: 'java_step_4',
      stepNumber: 4,
      title: 'Java Collections Framework (JCF)',
      description: 'Master ArrayList, LinkedList, HashSet, TreeSet, HashMap, and PriorityQueue with iterator patterns and Big-O efficiency analysis.',
      estimatedTime: '6-8 hours',
      level: 'Core',
      keyConcepts: ['ArrayList vs LinkedList', 'HashMap internals', 'Comparable & Comparator', 'Iterators'],
    },
    {
      id: 'java_step_5',
      stepNumber: 5,
      title: 'Robust Exception Handling & Custom Exceptions',
      description: 'Learn checked vs unchecked exceptions, try-catch-finally, try-with-resources with AutoCloseable, and throwing custom exceptions.',
      estimatedTime: '3-4 hours',
      level: 'Core',
      keyConcepts: ['Checked vs Unchecked', 'try-with-resources', 'AutoCloseable', 'Custom Exception'],
    },
    {
      id: 'java_step_6',
      stepNumber: 6,
      title: 'Multithreading, Synchronization & Concurrency',
      description: 'Master the Thread lifecycle, Runnable, synchronized locks, the volatile keyword, ExecutorService thread pools, and race condition prevention.',
      estimatedTime: '8-10 hours',
      level: 'Advanced',
      keyConcepts: ['Thread Lifecycle', 'synchronized & volatile', 'ExecutorService', 'Deadlock Prevention'],
      docTitle: 'Java Core Architecture: JVM Internals, OOP & Concurrency',
    },
    {
      id: 'java_step_7',
      stepNumber: 7,
      title: 'Java 8+ Modern Features: Streams & Lambdas',
      description: 'Write concise functional code with lambda expressions, functional interfaces (@FunctionalInterface), Stream API (map, filter, reduce), and Optional.',
      estimatedTime: '5-6 hours',
      level: 'Advanced',
      keyConcepts: ['Lambda Expressions', 'Stream API', 'filter/map/reduce', 'Optional<T>'],
    },
    {
      id: 'java_step_8',
      stepNumber: 8,
      title: 'Enterprise Java: Spring Boot & Microservices Foundation',
      description: 'Build production RESTful APIs using Spring Boot, Dependency Injection (@Autowired), Spring Data JPA, and database integration.',
      estimatedTime: '12-15 hours',
      level: 'Mastery',
      keyConcepts: ['Dependency Injection', 'RESTful Endpoints', 'Spring Data JPA', 'Microservice Design'],
    },
  ],

  C: [
    {
      id: 'c_step_1',
      stepNumber: 1,
      title: 'C Syntax, Compilation Pipeline & Data Types',
      description: 'Master primitive data types, sizes, compiler phases (preprocessor, compiler, assembler, linker), and basic printf/scanf formatting.',
      estimatedTime: '3-4 hours',
      level: 'Foundational',
      keyConcepts: ['Compilation Steps (gcc/clang)', 'Primitives & sizeof', 'printf/scanf', 'Standard I/O'],
      docTitle: 'C Systems Programming: Pointers, Memory Allocation & Structs',
      courseTitle: 'C Programming Tutorial for Beginners [freeCodeCamp]',
    },
    {
      id: 'c_step_2',
      stepNumber: 2,
      title: 'Control Flow, Functions & Variable Scope',
      description: 'Build procedural logic with loops, recursion, pass-by-value semantics, and header files (.h vs .c).',
      estimatedTime: '3-4 hours',
      level: 'Foundational',
      keyConcepts: ['Branching & Loops', 'Pass-by-value', 'Header Files', 'Preprocessor Macros'],
    },
    {
      id: 'c_step_3',
      stepNumber: 3,
      title: 'Pointers & Memory Addressing Fundamentals',
      description: 'Understand memory addresses in RAM, pointer dereferencing (*p), address-of operator (&x), double pointers (**ptr), and pointer to array.',
      estimatedTime: '6-8 hours',
      level: 'Core',
      keyConcepts: ['Pointers (* and &)', 'Pointer Arithmetic', 'Double Pointers', 'Array/Pointer Equivalence'],
      docTitle: 'C Systems Programming: Pointers, Memory Allocation & Structs',
      courseTitle: 'Pointers in C – Masterclass [Abdul Bari]',
    },
    {
      id: 'c_step_4',
      stepNumber: 4,
      title: 'Dynamic Heap Memory Allocation (malloc, calloc, free)',
      description: 'Master dynamic heap memory allocation, resizing with realloc(), detecting memory leaks with Valgrind, and eliminating dangling pointer bugs.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['malloc & calloc', 'free() cleanup', 'Memory Leaks', 'Dangling Pointers'],
      courseTitle: 'Harvard CS50x: C Programming & Low-Level Memory',
    },
    {
      id: 'c_step_5',
      stepNumber: 5,
      title: 'Structures, Unions & Memory Alignment Padding',
      description: 'Create complex data models with struct and typedef, understand hardware memory word alignment, padding bytes, and member access via ->.',
      estimatedTime: '4-5 hours',
      level: 'Core',
      keyConcepts: ['struct & typedef', 'Arrow Operator (->)', 'Memory Alignment', 'Padding Bytes'],
      docTitle: 'C Systems Programming: Pointers, Memory Allocation & Structs',
    },
    {
      id: 'c_step_6',
      stepNumber: 6,
      title: 'C Strings, Buffers & Safe String Manipulation',
      description: 'Work with null-terminated char arrays, buffer overflow hazards, and secure string routines (strncpy, snprintf).',
      estimatedTime: '3-4 hours',
      level: 'Core',
      keyConcepts: ['Null Terminator \\0', 'Buffer Overflows', 'snprintf Safety', 'String Manipulation'],
    },
    {
      id: 'c_step_7',
      stepNumber: 7,
      title: 'Low-Level File I/O & System Calls',
      description: 'Perform raw file streaming with fopen, fread, fwrite, and UNIX system calls (open, read, write, lseek).',
      estimatedTime: '5-6 hours',
      level: 'Advanced',
      keyConcepts: ['Binary File I/O', 'File Descriptors', 'UNIX System Calls', 'Buffered vs Raw I/O'],
    },
    {
      id: 'c_step_8',
      stepNumber: 8,
      title: 'Capstone: Custom Memory Allocator / Data Structure Engine',
      description: 'Implement a linked list, hash table, or custom heap allocator from scratch in pure C with zero memory leaks.',
      estimatedTime: '10-12 hours',
      level: 'Mastery',
      keyConcepts: ['Custom Linked List', 'Hash Table in C', 'Valgrind Zero Leaks', 'Clean Modular C'],
    },
  ],

  'C++': [
    {
      id: 'cpp_step_1',
      stepNumber: 1,
      title: 'Modern C++ Foundations & Compilation',
      description: 'Understand C++17/20 features, namespaces, references (&) vs pointers (*), streams (cin/cout), and strict static typing.',
      estimatedTime: '3-4 hours',
      level: 'Foundational',
      keyConcepts: ['References vs Pointers', 'Namespaces', 'cin/cout streams', 'auto type deduction'],
      docTitle: 'Modern C++ Guide: STL Containers, Templates & RAII Patterns',
      courseTitle: 'The C++ Series [The Cherno]',
    },
    {
      id: 'cpp_step_2',
      stepNumber: 2,
      title: 'Classes, Constructors & Destructors (RAII)',
      description: 'Implement object blueprints, member initializer lists, copy constructors, and the RAII idiom for deterministic resource cleanup.',
      estimatedTime: '5-6 hours',
      level: 'Foundational',
      keyConcepts: ['RAII Principle', 'Member Initializer Lists', 'Copy Constructors', 'Destructor Cleanup'],
    },
    {
      id: 'cpp_step_3',
      stepNumber: 3,
      title: 'Standard Template Library (STL): Sequential Containers',
      description: 'Deep dive into std::vector, std::deque, std::list, iterator invalidation rules, and contiguous memory cache locality.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['std::vector', 'Amortized O(1) push_back', 'Iterators', 'Cache Locality'],
      docTitle: 'Modern C++ Guide: STL Containers, Templates & RAII Patterns',
    },
    {
      id: 'cpp_step_4',
      stepNumber: 4,
      title: 'STL Associative Containers & Algorithms',
      description: 'Master std::unordered_map (hash table O(1)), std::map (Red-Black tree O(log n)), std::set, std::sort, and lambda expressions.',
      estimatedTime: '6-7 hours',
      level: 'Core',
      keyConcepts: ['std::unordered_map', 'Red-Black Trees', 'std::algorithm', 'C++ Lambdas'],
    },
    {
      id: 'cpp_step_5',
      stepNumber: 5,
      title: 'Smart Pointers & Modern Memory Ownership',
      description: 'Eliminate raw pointer bugs with std::unique_ptr, std::shared_ptr reference counting, and std::weak_ptr cyclic breakages.',
      estimatedTime: '5-6 hours',
      level: 'Advanced',
      keyConcepts: ['std::unique_ptr', 'std::shared_ptr', 'Reference Counting', 'Zero Memory Leaks'],
      docTitle: 'Modern C++ Guide: STL Containers, Templates & RAII Patterns',
    },
    {
      id: 'cpp_step_6',
      stepNumber: 6,
      title: 'Move Semantics & Rvalue References (std::move)',
      description: 'Understand lvalues vs rvalues, rvalue references (T&&), move constructors, and eliminating expensive deep copies.',
      estimatedTime: '6-8 hours',
      level: 'Advanced',
      keyConcepts: ['lvalue vs rvalue', 'Move Semantics', 'std::move()', 'Move Assignment'],
    },
    {
      id: 'cpp_step_7',
      stepNumber: 7,
      title: 'Templates & Generic Metaprogramming',
      description: 'Master function and class templates, template specialization, and modern C++20 concepts for compile-time constraints.',
      estimatedTime: '7-8 hours',
      level: 'Advanced',
      keyConcepts: ['Class Templates', 'Template Specialization', 'C++20 Concepts', 'Compile-Time Code'],
    },
    {
      id: 'cpp_step_8',
      stepNumber: 8,
      title: 'Capstone: High-Performance Systems Project',
      description: 'Build a game engine subsystem, fast trading engine simulator, or concurrent thread pool with modern C++ guidelines.',
      estimatedTime: '12-15 hours',
      level: 'Mastery',
      keyConcepts: ['High Performance C++', 'Multi-threading (std::thread)', 'Memory Efficiency', 'Zero Cost Abstractions'],
    },
  ],

  'C#': [
    {
      id: 'csharp_step_1',
      stepNumber: 1,
      title: 'C# & .NET Core Architecture',
      description: 'Understand the Common Language Runtime (CLR), Common Intermediate Language (CIL), JIT compilation, and primitive data types.',
      estimatedTime: '3-4 hours',
      level: 'Foundational',
      keyConcepts: ['CLR & CIL', 'JIT Compiler', 'Value Types vs Reference Types', 'Garbage Collection'],
      docTitle: 'C# & .NET Core: CLR Internals, LINQ & Async/Await Architecture',
      courseTitle: 'Foundational C# Certification [freeCodeCamp & Microsoft]',
    },
    {
      id: 'csharp_step_2',
      stepNumber: 2,
      title: 'Object-Oriented Design in C#',
      description: 'Master classes, records, properties with auto-accessors { get; set; }, inheritance, and interface contracts.',
      estimatedTime: '4-5 hours',
      level: 'Foundational',
      keyConcepts: ['Properties (get/set)', 'Records (Immutable)', 'Interfaces', 'Polymorphism'],
    },
    {
      id: 'csharp_step_3',
      stepNumber: 3,
      title: 'Collections, Generics & Nullable Reference Types',
      description: 'Work with List<T>, Dictionary<TKey, TValue>, generic classes/methods, and modern nullable reference annotations (string?).',
      estimatedTime: '4-5 hours',
      level: 'Core',
      keyConcepts: ['Generics (T)', 'List & Dictionary', 'Nullable Reference Types', 'Null Coalescing ??'],
    },
    {
      id: 'csharp_step_4',
      stepNumber: 4,
      title: 'Language Integrated Query (LINQ) Mastery',
      description: 'Query collections fluently with LINQ: Where, Select, OrderBy, GroupBy, SelectMany, and understand deferred execution.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['LINQ Method Syntax', 'Deferred Execution', 'IEnumerable<T>', 'GroupBy & Aggregate'],
      docTitle: 'C# & .NET Core: CLR Internals, LINQ & Async/Await Architecture',
    },
    {
      id: 'csharp_step_5',
      stepNumber: 5,
      title: 'Asynchronous Programming with async/await & TPL',
      description: 'Master non-blocking asynchronous programming using Task, Task<T>, async/await, and prevent UI freeze and thread starvation.',
      estimatedTime: '6-8 hours',
      level: 'Advanced',
      keyConcepts: ['async/await', 'Task<T>', 'ConfigureAwait', 'Non-blocking I/O'],
      docTitle: 'C# & .NET Core: CLR Internals, LINQ & Async/Await Architecture',
    },
    {
      id: 'csharp_step_6',
      stepNumber: 6,
      title: 'Memory Management, IDisposable & using Statements',
      description: 'Learn how GC generations (0, 1, 2) work, implement IDisposable for unmanaged resources, and scope handles with using declarations.',
      estimatedTime: '4-5 hours',
      level: 'Advanced',
      keyConcepts: ['GC Generations', 'IDisposable Pattern', 'using Declaration', 'Finalizers'],
    },
    {
      id: 'csharp_step_7',
      stepNumber: 7,
      title: 'Entity Framework Core & Relational Data',
      description: 'Build data access layers with EF Core DbContext, entity mappings, migrations, LINQ-to-Entities, and change tracking.',
      estimatedTime: '7-9 hours',
      level: 'Advanced',
      keyConcepts: ['DbContext', 'EF Migrations', 'LINQ to SQL', 'Repository Pattern'],
    },
    {
      id: 'csharp_step_8',
      stepNumber: 8,
      title: 'Capstone: ASP.NET Core Web API & Clean Architecture',
      description: 'Build and deploy a full-featured REST API with ASP.NET Core, dependency injection, middleware pipelines, and Swagger/OpenAPI.',
      estimatedTime: '12-15 hours',
      level: 'Mastery',
      keyConcepts: ['ASP.NET Core', 'Middleware Pipeline', 'Dependency Injection', 'Clean Architecture'],
    },
  ],

  R: [
    {
      id: 'r_step_1',
      stepNumber: 1,
      title: 'R Environment & Vectorization Foundations',
      description: 'Master R Studio setup, atomic vectors (numeric, integer, character, logical), indexing, and vectorization vs slow for-loops.',
      estimatedTime: '3-4 hours',
      level: 'Foundational',
      keyConcepts: ['Atomic Vectors', 'Vectorization', 'Vector Indexing (1-based)', 'R Data Types'],
      docTitle: 'R for Data Science: Vectorization, dplyr & ggplot2 Visualization',
      courseTitle: 'R Programming Tutorial [freeCodeCamp]',
    },
    {
      id: 'r_step_2',
      stepNumber: 2,
      title: 'Factors, Matrices & Data Frames',
      description: 'Model categorical data with factors, perform matrix linear algebra, and manipulate rectangular Data Frames.',
      estimatedTime: '4-5 hours',
      level: 'Foundational',
      keyConcepts: ['Factors & Levels', 'Matrix Multiplication %*%', 'Data Frames', 'Summary Statistics'],
    },
    {
      id: 'r_step_3',
      stepNumber: 3,
      title: 'Data Wrangling with dplyr & The Pipe Operator (|>)',
      description: 'Master the core verbs of data manipulation: filter(), select(), mutate(), summarise(), and group_by() with the pipe operator.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['dplyr filter & select', 'mutate transformations', 'group_by & summarise', 'Pipe Operator |>'],
      docTitle: 'R for Data Science: Vectorization, dplyr & ggplot2 Visualization',
    },
    {
      id: 'r_step_4',
      stepNumber: 4,
      title: 'Data Visualization with ggplot2',
      description: 'Build publication-grade graphics using the Grammar of Graphics: aesthetics (aes), geoms (geom_point, geom_line, geom_boxplot), and facets.',
      estimatedTime: '6-8 hours',
      level: 'Core',
      keyConcepts: ['Grammar of Graphics', 'aes(x, y, color)', 'geom_point & geom_boxplot', 'facet_wrap'],
      courseTitle: 'StatQuest: R & Statistical Modeling [Josh Starmer]',
    },
    {
      id: 'r_step_5',
      stepNumber: 5,
      title: 'Statistical Hypothesis Testing & Distributions',
      description: 'Conduct parametric and non-parametric tests: Student’s t-test (t.test), ANOVA (aov), Chi-Square tests, and p-value interpretations.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['t-Test', 'ANOVA', 'p-Values & Significance', 'Normal Distribution'],
    },
    {
      id: 'r_step_6',
      stepNumber: 6,
      title: 'Linear & Logistic Regression Modeling',
      description: 'Train statistical regression models with lm(y ~ x) and glm(), interpret regression coefficients, R-squared values, and model residuals.',
      estimatedTime: '6-7 hours',
      level: 'Advanced',
      keyConcepts: ['lm(y ~ x)', 'R-Squared', 'Residual Diagnostics', 'Logistic Regression glm()'],
    },
    {
      id: 'r_step_7',
      stepNumber: 7,
      title: 'Dimensionality Reduction (PCA) & Clustering in R',
      description: 'Perform Principal Component Analysis (prcomp) to reduce features and identify clusters with K-Means clustering.',
      estimatedTime: '5-6 hours',
      level: 'Advanced',
      keyConcepts: ['PCA (prcomp)', 'Variance Explained', 'K-Means Clustering', 'Biplots'],
    },
    {
      id: 'r_step_8',
      stepNumber: 8,
      title: 'Capstone: End-to-End Exploratory Data Science Report',
      description: 'Perform full data wrangling, statistical modeling, and visual storytelling on a real-world scientific dataset with R Markdown / Quarto.',
      estimatedTime: '10-12 hours',
      level: 'Mastery',
      keyConcepts: ['R Markdown / Quarto', 'Reproducible Science', 'Exploratory Analysis', 'Executive Summary'],
    },
  ],

  DSA: [
    {
      id: 'dsa_step_1',
      stepNumber: 1,
      title: 'Asymptotic Analysis & Big-O Notation',
      description: 'Understand time and space complexity, best/worst/average cases, Big-O, Big-Omega, and analyzing nested loop performance.',
      estimatedTime: '3-4 hours',
      level: 'Foundational',
      keyConcepts: ['Big-O Notation', 'Time vs Space Complexity', 'Recurrence Relations', 'Constant O(1) vs Linear O(n)'],
      docTitle: 'Algorithm Design & Binary Search Invariants',
      courseTitle: 'MIT 6.006: Introduction to Algorithms',
    },
    {
      id: 'dsa_step_2',
      stepNumber: 2,
      title: 'Arrays, Two Pointers & Sliding Window',
      description: 'Master fast two-pointer techniques, opposite-direction pointers, and variable/fixed-size sliding window algorithms for subarray problems.',
      estimatedTime: '5-6 hours',
      level: 'Foundational',
      keyConcepts: ['Two Pointers', 'Sliding Window', 'Prefix Sums', 'Subarray Problems'],
    },
    {
      id: 'dsa_step_3',
      stepNumber: 3,
      title: 'Binary Search & Monotonic Predicates',
      description: 'Master binary search invariants, lower_bound, upper_bound, overflow-safe mid calculation, and searching in rotated sorted arrays.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['Monotonic Predicates', 'mid = low + (high-low)//2', 'lower_bound', 'Binary Search on Answer'],
      docTitle: 'Algorithm Design & Binary Search Invariants',
    },
    {
      id: 'dsa_step_4',
      stepNumber: 4,
      title: 'Linked Lists, Stacks & Queues',
      description: 'Implement singly/doubly linked lists, cycle detection (Floyd’s algorithm), monotonic stacks, and breadth queues.',
      estimatedTime: '6-7 hours',
      level: 'Core',
      keyConcepts: ['Floyd’s Tortoise & Hare', 'Monotonic Stack', 'Queue via Stacks', 'Reverse Linked List'],
    },
    {
      id: 'dsa_step_5',
      stepNumber: 5,
      title: 'Binary Trees & Balanced BST (AVL / Red-Black)',
      description: 'Master tree traversals (Pre, In, Post, Level-order), Lowest Common Ancestor, Binary Search Tree invariants, and height balancing.',
      estimatedTime: '7-8 hours',
      level: 'Advanced',
      keyConcepts: ['Tree Traversals', 'BST Validation', 'Lowest Common Ancestor (LCA)', 'Balanced Trees'],
    },
    {
      id: 'dsa_step_6',
      stepNumber: 6,
      title: 'Graph Traversals (BFS, DFS) & Shortest Paths',
      description: 'Represent graphs with adjacency lists, perform Breadth-First Search (BFS), Depth-First Search (DFS), topological sort, and Dijkstra’s algorithm.',
      estimatedTime: '8-10 hours',
      level: 'Advanced',
      keyConcepts: ['BFS Shortest Path', 'DFS Cycle Detection', 'Topological Sort', 'Dijkstra’s Algorithm'],
      courseTitle: 'Algorithms Masterclass [Abdul Bari]',
    },
    {
      id: 'dsa_step_7',
      stepNumber: 7,
      title: 'Dynamic Programming (1D & 2D Memoization)',
      description: 'Master optimal substructure and overlapping subproblems: Fibonacci, 0/1 Knapsack, Longest Common Subsequence (LCS), and grid path counting.',
      estimatedTime: '10-12 hours',
      level: 'Advanced',
      keyConcepts: ['Memoization (Top-down)', 'Tabulation (Bottom-up)', '0/1 Knapsack', 'LCS Pattern'],
    },
    {
      id: 'dsa_step_8',
      stepNumber: 8,
      title: 'Capstone: Technical Coding Interview Mastery',
      description: 'Solve real-world algorithmic challenges under 45-minute timed constraints with optimal time/space complexity and dry-run tracing.',
      estimatedTime: '12-15 hours',
      level: 'Mastery',
      keyConcepts: ['Mock Interviews', 'Edge Case Verification', 'Time/Space Tradeoffs', 'Pattern Recognition'],
    },
  ],

  Mathematics: [
    {
      id: 'math_step_1',
      stepNumber: 1,
      title: 'Limits, Continuity & The Derivative Concept',
      description: 'Understand limits graphically and algebraically, evaluate indeterminate forms with L’Hôpital’s rule, and define the derivative as a limit of difference quotients.',
      estimatedTime: '4-5 hours',
      level: 'Foundational',
      keyConcepts: ['Limits & Continuity', "L'Hôpital's Rule", 'Difference Quotients', 'Tangent Line Slopes'],
      courseTitle: '3Blue1Brown: Essence of Calculus [Grant Sanderson]',
    },
    {
      id: 'math_step_2',
      stepNumber: 2,
      title: 'Differentiation Rules: Power, Product, Quotient & Chain Rule',
      description: 'Master standard differentiation formulas: polynomial power rule, product rule, quotient rule, and the ubiquitous chain rule for composite functions.',
      estimatedTime: '5-6 hours',
      level: 'Foundational',
      keyConcepts: ['Power Rule', 'Product & Quotient Rules', 'Chain Rule', 'Trigonometric Derivatives'],
      docTitle: 'Calculus: Differential Rules, Integration by Parts & Series',
    },
    {
      id: 'math_step_3',
      stepNumber: 3,
      title: 'Applications of Derivatives: Extrema & Optimization',
      description: 'Find local and global maxima/minima using first and second derivative tests, concavity inflection points, and solve applied geometric optimization problems.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['Critical Points', 'First & Second Derivative Tests', 'Concavity', 'Applied Optimization'],
    },
    {
      id: 'math_step_4',
      stepNumber: 4,
      title: 'The Fundamental Theorem of Calculus & Riemann Sums',
      description: 'Connect derivatives and integrals: visualize area accumulation with Riemann sums, and use FTC Part 1 & Part 2 for exact evaluations.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['Riemann Sums', 'FTC Part 1 & 2', 'Area Under Curves', 'Definite Integrals'],
      courseTitle: 'Khan Academy: Calculus AB & BC Track',
    },
    {
      id: 'math_step_5',
      title: 'Integration Techniques: u-Substitution & Partial Fractions',
      stepNumber: 5,
      description: 'Master substitution rule for composite functions, and decompose rational functions into partial fractions for straightforward integration.',
      estimatedTime: '6-7 hours',
      level: 'Core',
      keyConcepts: ['u-Substitution', 'Partial Fractions', 'Trigonometric Integrals', 'Change of Variables'],
    },
    {
      id: 'math_step_6',
      stepNumber: 6,
      title: 'Integration by Parts & The LIATE Rule',
      description: 'Derive ∫ u dv = uv - ∫ v du from the product rule, and apply the LIATE heuristic (Logarithmic, Inverse trig, Algebraic, Trig, Exponential).',
      estimatedTime: '5-6 hours',
      level: 'Advanced',
      keyConcepts: ['Integration by Parts', 'LIATE Heuristic', 'Tabular Integration', 'Definite Integration by Parts'],
      docTitle: 'Calculus: Differential Rules, Integration by Parts & Series',
    },
    {
      id: 'math_step_7',
      stepNumber: 7,
      title: 'First-Order Differential Equations',
      description: 'Solve separable differential equations, model exponential growth and radioactive decay, and analyze logistic population models.',
      estimatedTime: '6-8 hours',
      level: 'Advanced',
      keyConcepts: ['Separable Equations', 'Integrating Factors', 'Exponential Growth', 'Slope Fields'],
    },
    {
      id: 'math_step_8',
      stepNumber: 8,
      title: 'Infinite Sequences, Series & Taylor Expansions',
      description: 'Determine series convergence (Ratio Test, Integral Test), and approximate functions with Taylor and Maclaurin polynomials.',
      estimatedTime: '8-10 hours',
      level: 'Mastery',
      keyConcepts: ['Taylor & Maclaurin Series', 'Radius of Convergence', 'Ratio Test', 'Approximation Error Bounds'],
    },
  ],

  'Generative AI': [
    {
      id: 'genai_step_1',
      stepNumber: 1,
      title: 'Prompt Engineering & In-Context Learning',
      description: 'Master systematic prompt design: zero-shot, few-shot demonstration exemplars, Chain-of-Thought (CoT), system instructions, and structured JSON schemas.',
      estimatedTime: '3-4 hours',
      level: 'Foundational',
      keyConcepts: ['Zero-Shot & Few-Shot', 'Chain of Thought (CoT)', 'System Instructions', 'JSON Schema Outputs'],
      docTitle: 'Generative AI Architecture: LLMs, Prompt Engineering & RAG',
      courseTitle: 'Generative AI for Everyone [Andrew Ng]',
    },
    {
      id: 'genai_step_2',
      stepNumber: 2,
      title: 'Transformers & Self-Attention Architecture',
      description: 'Understand how autoregressive decoders generate text: tokenization (BPE), Scaled Dot-Product Attention, Multi-Head Attention, and context window mechanics.',
      estimatedTime: '6-8 hours',
      level: 'Foundational',
      keyConcepts: ['Self-Attention Mechanism', 'Transformer Architecture', 'Tokenization (BPE)', 'Context Windows'],
      docTitle: 'Generative AI Architecture: LLMs, Prompt Engineering & RAG',
      courseTitle: 'Neural Networks: Building GPT from Scratch [Andrej Karpathy]',
    },
    {
      id: 'genai_step_3',
      stepNumber: 3,
      title: 'Dense Vector Embeddings & Vector Databases',
      description: 'Master text embeddings, high-dimensional vector spaces, similarity metrics (cosine, dot product, euclidean), and vector index indexing (HNSW, FAISS).',
      estimatedTime: '4-5 hours',
      level: 'Core',
      keyConcepts: ['Dense Embeddings', 'Cosine Similarity', 'Vector DBs (Chroma/Pinecone)', 'HNSW Indexing'],
      courseTitle: 'Generative AI Full Course [freeCodeCamp]',
    },
    {
      id: 'genai_step_4',
      stepNumber: 4,
      title: 'Retrieval-Augmented Generation (RAG) Architecture',
      description: 'Design production RAG pipelines: document loading, semantic chunking with overlap, metadata filtering, hybrid search, and cross-encoder re-ranking.',
      estimatedTime: '6-8 hours',
      level: 'Core',
      keyConcepts: ['Semantic Chunking', 'Hybrid Search (Dense + BM25)', 'Cross-Encoder Re-Ranking', 'Context Injection'],
      docTitle: 'Generative AI Architecture: LLMs, Prompt Engineering & RAG',
    },
    {
      id: 'genai_step_5',
      stepNumber: 5,
      title: 'Parameter-Efficient Fine-Tuning (PEFT, LoRA & QLoRA)',
      description: 'Learn when to fine-tune vs prompt engineer: Low-Rank Adaptation (LoRA), 4-bit quantization (QLoRA), instruction tuning, and preventing catastrophic forgetting.',
      estimatedTime: '7-9 hours',
      level: 'Advanced',
      keyConcepts: ['LoRA Adapters', 'Quantization (QLoRA)', 'Instruction Dataset Formatting', 'Compute Efficiency'],
    },
    {
      id: 'genai_step_6',
      stepNumber: 6,
      title: 'Multimodal Generative Models (Vision, Audio & Code)',
      description: 'Build applications using multimodal LLMs (e.g. Gemini 2.5 Flash): processing interleaved images, audio transcription, video reasoning, and code synthesis.',
      estimatedTime: '5-6 hours',
      level: 'Advanced',
      keyConcepts: ['Gemini Multimodal APIs', 'Vision Tokens', 'Audio Spectrograms', 'Structured Tool Output'],
      courseTitle: 'Google Cloud: Generative AI Learning Path',
    },
    {
      id: 'genai_step_7',
      stepNumber: 7,
      title: 'LLM Safety, Guardrails & Quality Evaluation',
      description: 'Protect against prompt injections, implement output guardrails (NeMo Guardrails, Llama Guard), and measure RAG performance via the RAG Triad.',
      estimatedTime: '4-5 hours',
      level: 'Advanced',
      keyConcepts: ['Prompt Injection Defense', 'RAG Triad (Context, Groundedness, Answer)', 'Output Guardrails', 'Hallucination Mitigation'],
    },
    {
      id: 'genai_step_8',
      stepNumber: 8,
      title: 'Capstone: Production Enterprise Generative AI Knowledge Engine',
      description: 'Deploy an end-to-end multimodal Generative AI assistant with hybrid RAG, streaming responses, latency caching, and automated evaluation metrics.',
      estimatedTime: '12-15 hours',
      level: 'Mastery',
      keyConcepts: ['Production RAG Deployment', 'Streaming Server-Sent Events', 'Semantic Cache', 'End-to-End Evaluation'],
    },
  ],

  'AI Agents': [
    {
      id: 'agents_step_1',
      stepNumber: 1,
      title: 'Autonomous Agent Fundamentals & ReAct Loops',
      description: 'Understand the anatomy of an AI Agent: perception, decision-making, the iterative Reason + Act (ReAct) loop, and loop termination safeguards.',
      estimatedTime: '3-4 hours',
      level: 'Foundational',
      keyConcepts: ['Thought-Action-Observation', 'ReAct Pattern', 'Tool Invocation', 'Loop Termination'],
      docTitle: 'Autonomous AI Agents: ReAct Loops, Tool Calling & Multi-Agent Swarms',
      courseTitle: 'Functions, Tools and Agents with LangChain [Harrison Chase]',
    },
    {
      id: 'agents_step_2',
      stepNumber: 2,
      title: 'LLM Tool Calling & Structured Function Schemas',
      description: 'Equip agents with external tools: write JSON Schemas for tools (calculators, web scrapers, DB queries), handle argument validation, and parse function calls.',
      estimatedTime: '4-5 hours',
      level: 'Foundational',
      keyConcepts: ['Tool Calling APIs', 'JSON Schema Validation', 'Parameter Parsing', 'Tool Error Recovery'],
      courseTitle: 'AI Agent Masterclass [freeCodeCamp]',
    },
    {
      id: 'agents_step_3',
      stepNumber: 3,
      title: 'Agent Memory Systems (Working, Episodic & Semantic)',
      description: 'Architect memory for agents: conversation buffers, summarized sliding window memory, entity memory graphs, and vector-backed long-term episodic memory.',
      estimatedTime: '5-6 hours',
      level: 'Core',
      keyConcepts: ['Short-Term Buffer Memory', 'Long-Term Vector Memory', 'Entity Memory Graphs', 'Context Compaction'],
    },
    {
      id: 'agents_step_4',
      stepNumber: 4,
      title: 'Planning, Sub-Task Decomposition & Reflexion',
      description: 'Enable agents to tackle complex goals: Plan-and-Solve architectures, Tree-of-Thoughts planning, self-evaluation, and dynamic replanning upon error.',
      estimatedTime: '6-7 hours',
      level: 'Core',
      keyConcepts: ['Task Decomposition', 'Tree of Thoughts', 'Reflexion Loop', 'Dynamic Replanning'],
      docTitle: 'Autonomous AI Agents: ReAct Loops, Tool Calling & Multi-Agent Swarms',
    },
    {
      id: 'agents_step_5',
      stepNumber: 5,
      title: 'Stateful Agent Workflows with LangGraph',
      description: 'Model resilient agent systems as cyclic directed graphs: define StateGraph schemas, conditional routing edges, persistence checkpoints, and time-travel rollbacks.',
      estimatedTime: '7-9 hours',
      level: 'Advanced',
      keyConcepts: ['LangGraph StateGraph', 'Nodes & Conditional Edges', 'Persistence Checkpoints', 'Time-Travel Debugging'],
    },
    {
      id: 'agents_step_6',
      stepNumber: 6,
      title: 'Multi-Agent Collaboration with CrewAI & AutoGen',
      description: 'Deploy collaborative multi-agent teams: configure role-playing agents (Researcher, Writer, Reviewer), hierarchical process managers, and consensus protocols.',
      estimatedTime: '7-9 hours',
      level: 'Advanced',
      keyConcepts: ['CrewAI Crews & Agents', 'Role & Backstory Engineering', 'Hierarchical Task Delegation', 'Agent-to-Agent Messaging'],
      courseTitle: 'Multi AI Agent Systems with CrewAI [DeepLearning.AI]',
    },
    {
      id: 'agents_step_7',
      stepNumber: 7,
      title: 'Agentic RAG & Multi-Document Query Routing',
      description: 'Build autonomous RAG agents that evaluate document sufficiency, route queries across multiple indexes, decompose ambiguous questions, and self-correct answers.',
      estimatedTime: '6-8 hours',
      level: 'Advanced',
      keyConcepts: ['Router Query Engines', 'Sub-Question Decomposition', 'Multi-Index Agent Routing', 'Self-Correcting Verification'],
      courseTitle: 'Building Agentic RAG Systems with LlamaIndex',
    },
    {
      id: 'agents_step_8',
      stepNumber: 8,
      title: 'Capstone: Autonomous Full-Stack Software Engineering Swarm',
      description: 'Build an autonomous multi-agent software engineering team (Architect, Developer, Tester, Critic) that takes a specification and generates, tests, and refactors code.',
      estimatedTime: '12-16 hours',
      level: 'Mastery',
      keyConcepts: ['Multi-Agent Swarm', 'Sandboxed Execution', 'Automated Unit Test Loop', 'Human-in-the-Loop Signoff'],
    },
  ],
};

interface CurriculumRoadmapProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
  onNavigateToQuiz?: (subject?: string) => void;
  initialSubject?: string;
}

export const CurriculumRoadmap: React.FC<CurriculumRoadmapProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
  initialSubject = 'Python',
}) => {
  const subjects = Object.keys(SUBJECT_ROADMAPS);
  const [selectedSubject, setSelectedSubject] = useState<string>(
    SUBJECT_ROADMAPS[initialSubject] ? initialSubject : 'Python'
  );
  const [milestonesState, setMilestonesState] = useState<Record<string, MilestoneProgressItem>>({});
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');
  const [celebrationMilestone, setCelebrationMilestone] = useState<RoadmapMilestone | null>(null);

  // Load completed milestones from IndexedDB (works offline in rural areas)
  useEffect(() => {
    getAllMilestoneProgress().then((progressMap) => {
      setMilestonesState(progressMap);
    });
  }, []);

  const currentRoadmap = SUBJECT_ROADMAPS[selectedSubject] || SUBJECT_ROADMAPS.Python;

  // Calculate statistics
  const completedCount = useMemo(() => {
    return currentRoadmap.filter((m) => milestonesState[m.id]?.completed).length;
  }, [currentRoadmap, milestonesState]);

  const progressPercentage = Math.round((completedCount / currentRoadmap.length) * 100);

  // Total completed across all subjects
  const totalCompletedAllSubjects = useMemo(() => {
    return Object.values(milestonesState).filter((m) => m.completed).length;
  }, [milestonesState]);

  // Toggle milestone completion
  const handleToggleMilestone = async (milestone: RoadmapMilestone) => {
    const isCurrentlyDone = !!milestonesState[milestone.id]?.completed;
    const newStatus = !isCurrentlyDone;

    const progressItem: MilestoneProgressItem = {
      id: milestone.id,
      subject: selectedSubject,
      completed: newStatus,
      completedAt: newStatus ? new Date().toISOString() : undefined,
    };

    // Update local state immediately for responsive UI
    setMilestonesState((prev) => ({
      ...prev,
      [milestone.id]: progressItem,
    }));

    // Save to IndexedDB (offline-ready for rural areas)
    await saveMilestoneProgress(progressItem);

    // If newly completed, trigger celebratory modal
    if (newStatus) {
      setCelebrationMilestone(milestone);
      setTimeout(() => setCelebrationMilestone(null), 4000);
    }

    // Also sync to student profile and Firestore if possible
    try {
      const updatedTotal = newStatus ? totalCompletedAllSubjects + 1 : Math.max(0, totalCompletedAllSubjects - 1);
      const updatedProfile = {
        ...profile,
        overallProgress: Math.min(100, Math.round((updatedTotal / 64) * 100)),
      };
      onProfileUpdate(updatedProfile);

      if (db && profile.userId) {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          { overallProgress: updatedProfile.overallProgress },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('Sync warning for profile milestone update:', err);
    }
  };

  // Ask AI Tutor about this milestone step
  const handleAskTutorStep = (milestone: RoadmapMilestone) => {
    const prompt = `Hey Tutor! I am currently working on Step #${milestone.stepNumber}: "${milestone.title}" in ${selectedSubject}. Can you explain the core concepts (${milestone.keyConcepts.slice(0, 3).join(', ')}) with a simple analogy and give me a quick checkpoint question?`;
    onNavigateToChat(prompt);
  };

  // Filtered milestones
  const displayedMilestones = useMemo(() => {
    if (filterMode === 'completed') {
      return currentRoadmap.filter((m) => milestonesState[m.id]?.completed);
    }
    if (filterMode === 'pending') {
      return currentRoadmap.filter((m) => !milestonesState[m.id]?.completed);
    }
    return currentRoadmap;
  }, [currentRoadmap, filterMode, milestonesState]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Header */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/60 border border-emerald-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Curriculum Roadmap & Milestones
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Offline Ready • Rural Support</span>
                </span>
              </div>
              <h2 className="text-xl font-black text-white mt-0.5 tracking-tight">
                Step-by-Step Learning Journey
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Structured curriculum checklists for every programming subject. Mark off milestones as you master concepts, earn achievements, and discuss any topic with your WhatsApp Socratic Tutor!
              </p>
            </div>
          </div>

          {/* Quick Counter */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-center min-w-[110px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Completed</span>
              <span className="text-lg font-black text-emerald-400">
                {completedCount} / {currentRoadmap.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-lg">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Select Your Subject Roadmap:
          </span>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            {subjects.map((sub) => {
              const subRoadmap = SUBJECT_ROADMAPS[sub] || [];
              const subDone = subRoadmap.filter((m) => milestonesState[m.id]?.completed).length;

              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-2 ${
                    selectedSubject === sub
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
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
                  <span>{sub}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                    selectedSubject === sub ? 'bg-emerald-700 text-white' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {subDone}/{subRoadmap.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Bar & Filter Toolbar */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <span>{selectedSubject} Mastery Progress</span>
                {progressPercentage === 100 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                    Mastered 🏆
                  </span>
                )}
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {progressPercentage}% Completed
              </span>
            </div>
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-100 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All ({currentRoadmap.length})
            </button>
            <button
              onClick={() => setFilterMode('pending')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filterMode === 'pending'
                  ? 'bg-slate-100 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Remaining ({currentRoadmap.length - completedCount})
            </button>
            <button
              onClick={() => setFilterMode('completed')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filterMode === 'completed'
                  ? 'bg-slate-100 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Celebratory Milestone Banner */}
      {celebrationMilestone && (
        <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-emerald-500/20 border-2 border-amber-400/50 rounded-2xl p-4 flex items-center space-x-3.5 shadow-xl animate-in zoom-in-95">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 animate-bounce" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-amber-300">
              Milestone Complete: Step #{celebrationMilestone.stepNumber} – {celebrationMilestone.title}!
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Awesome work! Your offline learning progress and badge credits have been saved.
            </p>
          </div>
          {onNavigateToQuiz && (
            <button
              onClick={() => onNavigateToQuiz(selectedSubject)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0 shadow-md"
            >
              Test Knowledge
            </button>
          )}
        </div>
      )}

      {/* Step-by-Step Checklist Roadmap */}
      <div className="space-y-4">
        {displayedMilestones.map((milestone) => {
          const isDone = !!milestonesState[milestone.id]?.completed;

          return (
            <div
              key={milestone.id}
              className={`border rounded-3xl p-5 shadow-xl transition-all duration-300 ${
                isDone
                  ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Checkbox and Step Details */}
                <div className="flex items-start space-x-4">
                  {/* Interactive Milestone Checkbox */}
                  <button
                    onClick={() => handleToggleMilestone(milestone)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer mt-0.5 shrink-0 ${
                      isDone
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                        : 'bg-slate-800 border border-slate-700 hover:border-emerald-400 text-slate-500 hover:text-emerald-400'
                    }`}
                    title={isDone ? 'Click to uncheck milestone' : 'Mark milestone completed'}
                  >
                    {isDone ? (
                      <Check className="w-5 h-5 stroke-[3]" />
                    ) : (
                      <span className="text-xs font-bold font-mono">{milestone.stepNumber}</span>
                    )}
                  </button>

                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        Step {milestone.stepNumber}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          milestone.level === 'Foundational'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : milestone.level === 'Core'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : milestone.level === 'Advanced'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {milestone.level}
                      </span>

                      <span className="flex items-center space-x-1 text-[11px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{milestone.estimatedTime}</span>
                      </span>

                      {isDone && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Completed</span>
                        </span>
                      )}
                    </div>

                    <h4
                      className={`text-base font-bold transition ${
                        isDone ? 'text-emerald-300 line-through decoration-emerald-500/50' : 'text-white'
                      }`}
                    >
                      {milestone.title}
                    </h4>

                    <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                      {milestone.description}
                    </p>

                    {/* Key Concepts Tags */}
                    {milestone.keyConcepts && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {milestone.keyConcepts.map((concept) => (
                          <span
                            key={concept}
                            className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-950 text-slate-300 border border-slate-800 font-mono"
                          >
                            {concept}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Grounded Reference Notes & Course Suggestions */}
                    {(milestone.docTitle || milestone.courseTitle) && (
                      <div className="pt-1 flex items-center space-x-3 text-[11px] text-slate-400 flex-wrap gap-y-1">
                        {milestone.docTitle && (
                          <span className="flex items-center space-x-1 text-emerald-400">
                            <BookOpen className="w-3 h-3" />
                            <span>Notes: {milestone.docTitle}</span>
                          </span>
                        )}
                        {milestone.courseTitle && (
                          <span className="flex items-center space-x-1 text-red-400">
                            <Flame className="w-3 h-3" />
                            <span>Course: {milestone.courseTitle}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <button
                    onClick={() => handleAskTutorStep(milestone)}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer border border-slate-700 hover:border-emerald-500 shadow-sm"
                    title="Ask doubts regarding this milestone"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask Tutor</span>
                  </button>

                  <button
                    onClick={() => handleToggleMilestone(milestone)}
                    className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                      isDone
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                    }`}
                  >
                    {isDone ? (
                      <span>Mark Pending</span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Done</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
