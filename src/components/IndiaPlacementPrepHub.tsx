import React, { useState, useMemo } from 'react';
import {
  Building2,
  Briefcase,
  CheckCircle2,
  Code2,
  Brain,
  Target,
  Clock,
  Award,
  Send,
  Play,
  FileText,
  Sparkles,
  ChevronRight,
  Search,
  Filter,
  Check,
  Terminal,
  Cpu,
  MessageSquare,
  Layers,
  BookOpen,
  RotateCcw,
  Calculator,
  ShieldCheck,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

export interface PlacementQuestion {
  id: string;
  category: 'Quantitative & Logical Aptitude' | 'DSA & Coding' | 'Core CS (OS / DBMS / CN / OOP)' | 'System Design & HR';
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionPrompt: string;
  options?: string[];
  correctOptionIndex?: number;
  codeSolution?: string;
  approachExplanation: string;
  askedInRound: string;
}

export interface RecruitmentRound {
  roundKey: string;
  roundNumber: number;
  title: string;
  duration: string;
  format: string;
  focusTopics: string[];
  cutoffTip: string;
}

export interface IndianCompanyProfile {
  id: string;
  name: string;
  shortName: string;
  programName: string;
  tier: 'Mass & Digital IT Giants' | 'Indian Startups & Unicorns' | 'Global Tech & FinTech India' | 'Core Engineering & Telecom';
  headquarters: string;
  hiringLocations: string[];
  rolesOffered: { title: string; ctcRange: string; bondOrNote: string }[];
  eligibility: {
    minCgpa: number;
    allowedBacklogs: string;
    branches: string;
  };
  hiringWindow: string;
  overview: string;
  selectionRounds: RecruitmentRound[];
  practiceQuestions: PlacementQuestion[];
  hrQuestions: { q: string; sampleFramework: string }[];
}

const INDIAN_COMPANIES: IndianCompanyProfile[] = [
  {
    id: 'tcs_nqt_prime',
    name: 'Tata Consultancy Services (TCS)',
    shortName: 'TCS',
    programName: 'TCS NQT — Ninja, Digital & Prime',
    tier: 'Mass & Digital IT Giants',
    headquarters: 'Mumbai, Maharashtra',
    hiringLocations: ['Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Mumbai', 'Kochi', 'Kolkata', 'Noida'],
    rolesOffered: [
      { title: 'TCS Prime (SDE / Research)', ctcRange: '₹9.0 – ₹11.5 LPA', bondOrNote: 'Advanced DSA + Core CS' },
      { title: 'TCS Digital (System Engineer)', ctcRange: '₹7.0 – ₹7.5 LPA', bondOrNote: 'Full-Stack / Cloud Track' },
      { title: 'TCS Ninja (Assistant System Eng.)', ctcRange: '₹3.36 – ₹3.6 LPA', bondOrNote: 'Foundation NQT Track' },
    ],
    eligibility: {
      minCgpa: 6.0,
      allowedBacklogs: 'Max 1 Pending at NQT appearance (0 at joining)',
      branches: 'B.E. / B.Tech / M.E. / M.Tech / MCA / M.Sc (All Streams)',
    },
    hiringWindow: 'August – November (On/Off-Campus NQT) & Quarterly iON Cycles',
    overview:
      'India’s largest IT employer conducts the National Qualifier Test (NQT) with integrated Foundation and Advanced sections determining Ninja, Digital, and Prime interview shortlists.',
    selectionRounds: [
      {
        roundKey: 'tcs_r1',
        roundNumber: 1,
        title: 'Foundation NQT (Numerical, Verbal & Reasoning Ability)',
        duration: '75 Mins',
        format: '65 MCQs & Fill-in-the-Blank (No Negative Marking)',
        focusTopics: [
          'Number System, Percentages, Ratio & Time-Speed-Distance',
          'Data Interpretation (Tables & Pie Charts), Statistics & Mean/Median',
          'Syllogisms, Blood Relations, Seating Arrangements & Reading Passages',
        ],
        cutoffTip: 'Aim for 75%+ accuracy in Numerical & Reasoning; manage on-screen calculator time.',
      },
      {
        roundKey: 'tcs_r2',
        roundNumber: 2,
        title: 'Advanced NQT (Advanced Quants + 2 Hands-On Coding Problems)',
        duration: '90 Mins',
        format: '15 Advanced Quants/Reasoning + 2 Coding Questions (C/C++/Java/Python)',
        focusTopics: [
          '1 Easy Array/String Manipulation (25 mins)',
          '1 Medium Matrix / Sliding Window / DP Problem (50 mins)',
          'Take full stdin/stdout input accurately (avoid Scanner buffer issues)',
        ],
        cutoffTip: 'Solving 1.5+ coding questions unlocks TCS Digital & Prime interviews (₹7–11.5 LPA).',
      },
      {
        roundKey: 'tcs_r3',
        roundNumber: 3,
        title: 'Technical + Managerial + HR Panel (TR + MR + HR)',
        duration: '45 Mins',
        format: '3-Member Panel Interview',
        focusTopics: [
          'Deep dive into Final Year Project architecture & database schema',
          'OOP Pillars, SQL Joins (INNER/LEFT), ACID Properties, Normalization',
          'TCS 5 Core Values, relocation readiness & night-shift adaptability',
        ],
        cutoffTip: 'Be ready to write SQL queries for 2nd highest salary and explain your project end-to-end.',
      },
    ],
    practiceQuestions: [
      {
        id: 'tcs_q1',
        category: 'Quantitative & Logical Aptitude',
        title: 'NQT Foundation: Mixture & Alligation Ratio',
        difficulty: 'Easy',
        askedInRound: 'TCS NQT Foundation',
        questionPrompt:
          'A vessel contains 60 liters of milk and water in the ratio 7:3. How many liters of water must be added to make the ratio of milk to water 7:5?',
        options: ['8 Liters', '10 Liters', '12 Liters', '15 Liters'],
        correctOptionIndex: 2,
        approachExplanation:
          'Initial Milk = (7/10)*60 = 42L, Water = 18L. For ratio 7:5 with Milk fixed at 42L (7 parts = 42 => 1 part = 6L), new Water must be 5 * 6 = 30L. Water to add = 30 - 18 = 12 Liters.',
      },
      {
        id: 'tcs_q2',
        category: 'DSA & Coding',
        title: 'TCS Advanced Coding: Subarray with Given Target Sum (Fuel Tank Problem)',
        difficulty: 'Medium',
        askedInRound: 'TCS Digital / Prime Coding',
        questionPrompt:
          'Given an array of N positive integers representing container capacities and a target K, find the maximum length of a contiguous subarray whose sum is at most K.',
        options: [
          'O(N) Sliding Window with two pointers (left, right)',
          'O(N^3) Brute Force nested loops',
          'O(N!) Backtracking permutation',
          'floyd-warshall all-pairs shortest path',
        ],
        correctOptionIndex: 0,
        codeSolution: `def max_containers_within_budget(arr: list[int], k: int) -> int:
    left = curr_sum = max_len = 0
    for right in range(len(arr)):
        curr_sum += arr[right]
        while curr_sum > k and left <= right:
            curr_sum -= arr[left]
            left += 1
        max_len = max(max_len, right - left + 1)
    return max_len`,
        approachExplanation:
          'Since all capacities are positive, a variable-size sliding window achieves O(N) time and O(1) auxiliary space.',
      },
      {
        id: 'tcs_q3',
        category: 'Core CS (OS / DBMS / CN / OOP)',
        title: 'DBMS Interview: Second Highest Salary per Department',
        difficulty: 'Medium',
        askedInRound: 'TCS Prime Technical Panel',
        questionPrompt:
          'Which SQL window function handles ties properly when finding the 2nd highest distinct salary in each department?',
        options: ['ROW_NUMBER()', 'RANK()', 'DENSE_RANK()', 'NTILE(2)'],
        correctOptionIndex: 2,
        codeSolution: `SELECT dept_id, emp_name, salary
FROM (
  SELECT dept_id, emp_name, salary,
         DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rnk
  FROM employees
) ranked
WHERE rnk = 2;`,
        approachExplanation:
          'DENSE_RANK() does not skip rank numbers when two employees share the top salary, ensuring rank 2 is always the second highest distinct salary.',
      },
    ],
    hrQuestions: [
      {
        q: 'Why do you want to join TCS over a smaller startup?',
        sampleFramework:
          'Highlight TCS’s global enterprise scale across BFSI/Retail, structured Initial Learning Program (ILP), domain stability, and internal mobility via Wings-1/Prime elevations.',
      },
      {
        q: 'Are you comfortable relocating to any TCS campus across India and working across global client time zones?',
        sampleFramework:
          'Confirm flexibility while mentioning how you manage routines, communication handoffs, and collaborative agile sprints.',
      },
    ],
  },
  {
    id: 'infosys_sp_dse',
    name: 'Infosys Limited',
    shortName: 'Infosys',
    programName: 'HackWithInfy — Specialist Programmer (SP) & Digital Specialist Engineer (DSE)',
    tier: 'Mass & Digital IT Giants',
    headquarters: 'Bengaluru, Karnataka',
    hiringLocations: ['Bengaluru', 'Mysuru (Global Education Centre)', 'Pune', 'Hyderabad', 'Chennai', 'Bhubaneswar', 'Chandigarh'],
    rolesOffered: [
      { title: 'Specialist Programmer (SP - L1/L2)', ctcRange: '₹9.5 – ₹13.0 LPA', bondOrNote: 'Hard DSA / Dynamic Programming / Graphs' },
      { title: 'Digital Specialist Engineer (DSE)', ctcRange: '₹6.25 LPA', bondOrNote: 'Full-Stack & Problem Solving' },
      { title: 'Systems Engineer (SE)', ctcRange: '₹3.6 LPA', bondOrNote: 'Mysuru GEC Training Track' },
    ],
    eligibility: {
      minCgpa: 6.0,
      allowedBacklogs: '0 Active Backlogs',
      branches: 'B.E. / B.Tech / M.E. / M.Tech / MCA',
    },
    hiringWindow: 'March – July (HackWithInfy) & September – December (Campus Drives)',
    overview:
      'Famous for its world-class Mysuru Global Education Centre and HackWithInfy coding competition, Infosys recruits top coders directly into Specialist Programmer (SP) and DSE roles.',
    selectionRounds: [
      {
        roundKey: 'infy_r1',
        roundNumber: 1,
        title: 'HackWithInfy / Online Coding Assessment (3 DSA Problems)',
        duration: '180 Mins',
        format: '3 Coding Questions: 1 Easy-Medium, 1 Medium (Greedy/Trees), 1 Hard (DP/Graphs)',
        focusTopics: [
          'Greedy Interval Scheduling & Priority Queues',
          'Dynamic Programming on Grids, Subsequences & Bitmasks',
          'Disjoint Set Union (DSU) & Shortest Path on Weighted Graphs',
        ],
        cutoffTip: 'Solving 1.5+ questions typically clears DSE; 2.2+ questions clears Specialist Programmer (₹9.5+ LPA).',
      },
      {
        roundKey: 'infy_r2',
        roundNumber: 2,
        title: 'Infosys Pseudocode, Puzzle Solving & Mathematical Reasoning',
        duration: '60 Mins',
        format: 'Sectional Timed Test (SE / Campus Track)',
        focusTopics: [
          'Bitwise operators (&, |, ^, <<) and recursion stack trace pseudocode',
          'Number & Grid Puzzles (4x4 Matrix deduction)',
          'Cryptarithmetic and Data Sufficiency',
        ],
        cutoffTip: 'Every section has an independent sectional cutoff; never leave grid puzzles unattempted.',
      },
      {
        roundKey: 'infy_r3',
        roundNumber: 3,
        title: 'Specialist Technical & Behavioral Interview',
        duration: '45 Mins',
        format: 'Live Code Optimization + System Architecture',
        focusTopics: [
          'Optimizing O(N^2) solution from Online Round to O(N log N)',
          'REST API design, JWT Auth, Indexing in DBMS, and React/Spring Boot project discussion',
        ],
        cutoffTip: 'Explain your thought process aloud and analyze worst-case time/space complexity clearly.',
      },
    ],
    practiceQuestions: [
      {
        id: 'infy_q1',
        category: 'DSA & Coding',
        title: 'HackWithInfy SP: Minimum Monsters Defeated with Experience Gain',
        difficulty: 'Medium',
        askedInRound: 'HackWithInfy Round 1',
        questionPrompt:
          'You have initial energy E. Monster i requires power[i] to defeat and grants bonus[i] energy. In what order should you fight monsters to defeat the maximum number?',
        options: [
          'Sort monsters in ascending order of power[i] and greedily defeat while E >= power[i]',
          'Sort monsters in descending order of bonus[i] only',
          'Use Bellman-Ford negative cycle detection',
          'Fight in original array order',
        ],
        correctOptionIndex: 0,
        codeSolution: `def max_monsters_defeated(e: int, power: list[int], bonus: list[int]) -> int:
    monsters = sorted(zip(power, bonus), key=lambda x: x[0])
    defeated = 0
    for req_power, exp_gain in monsters:
        if e < req_power:
            break
        e += exp_gain
        defeated += 1
    return defeated`,
        approachExplanation:
          'Since bonuses are non-negative, sorting by required power ascending is optimal by exchange argument in O(N log N).',
      },
      {
        id: 'infy_q2',
        category: 'Core CS (OS / DBMS / CN / OOP)',
        title: 'Pseudocode Bitwise Trace',
        difficulty: 'Easy',
        askedInRound: 'Infosys Online Test',
        questionPrompt: 'What does the expression (n & (n - 1)) == 0 check for a positive integer n?',
        options: [
          'Whether n is a prime number',
          'Whether n is an exact power of 2',
          'Whether n is divisible by 3',
          'Whether n is a palindrome in binary',
        ],
        correctOptionIndex: 1,
        approachExplanation:
          'A power of 2 has exactly one set bit in binary (e.g., 8 = 1000_2, 7 = 0111_2). Clearing the lowest set bit via n & (n-1) yields 0.',
      },
    ],
    hrQuestions: [
      {
        q: 'Tell me about a time your code failed in an edge case or hackathon and how you debugged it.',
        sampleFramework:
          'Use STAR (Situation, Task, Action, Result): describe the failing input (e.g. integer overflow or empty graph), how you wrote unit tests, and the fix.',
      },
    ],
  },
  {
    id: 'wipro_capgemini_cognizant',
    name: 'Wipro / Cognizant / Capgemini / Accenture',
    shortName: 'Wipro · Cognizant · Accenture',
    programName: 'Wipro Turbo / GenC Next / Accenture Advanced App Eng.',
    tier: 'Mass & Digital IT Giants',
    headquarters: 'Bengaluru / Pune / Mumbai / Chennai',
    hiringLocations: ['Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Mumbai', 'Noida', 'Gurugram', 'Coimbatore'],
    rolesOffered: [
      { title: 'Accenture Advanced App Engineering Analyst (AAEA)', ctcRange: '₹6.5 – ₹8.5 LPA', bondOrNote: 'Cognitive + Coding + Communication' },
      { title: 'Wipro Project Engineer (Turbo) / Cognizant GenC Next', ctcRange: '₹6.5 – ₹6.75 LPA', bondOrNote: 'Java/Python + SQL + Automata Fix' },
      { title: 'Capgemini Senior Analyst (Exceller)', ctcRange: '₹7.5 LPA', bondOrNote: 'Game-Based Aptitude + DSA' },
    ],
    eligibility: {
      minCgpa: 6.0,
      allowedBacklogs: '0 Active Backlogs',
      branches: 'B.E. / B.Tech / MCA / M.Sc CS/IT',
    },
    hiringWindow: 'July – January (Pan-India Campus & Superset Drives)',
    overview:
      'Major enterprise technology consultancies recruiting across Superset and AMCAT/CoCubes platforms with specialized high-package tracks (Turbo, GenC Next, Exceller, AAEA).',
    selectionRounds: [
      {
        roundKey: 'wca_r1',
        roundNumber: 1,
        title: 'Cognitive, Pseudocode, Cloud/Network Fundamentals & Game-Based Aptitude',
        duration: '75 Mins',
        format: 'Adaptive MCQs + Capgemini Motion/Grid Games',
        focusTopics: [
          'C/C++/Java Pseudocode output prediction & recursion depth',
          'MS Office, Cloud Basics, Network Security & OSI 7 Layers (Accenture)',
          'Deductive Logical Thinking, Grid Challenge & Inductively-Timed Puzzles',
        ],
        cutoffTip: 'In Accenture/Capgemini, coding only unlocks AFTER clearing the Cognitive + Pseudocode cutoff on spot.',
      },
      {
        roundKey: 'wca_r2',
        roundNumber: 2,
        title: 'Automata Coding & SQL Query Assessment',
        duration: '45 Mins',
        format: '2 Coding Questions + 1 SQL Query (GenC Next)',
        focusTopics: [
          'String Anagrams, Frequency Hashing, Array Rotation & Prime Sieve',
          'SQL GROUP BY, HAVING, Subqueries & Date Functions',
        ],
        cutoffTip: 'Pass all public and hidden boundary test cases (N=0, negative numbers, duplicates).',
      },
      {
        roundKey: 'wca_r3',
        roundNumber: 3,
        title: 'Automated Versant Communication Test & Technical Interview',
        duration: '40 Mins',
        format: 'AI Voice Fluency Check + 1:1 Technical Interview',
        focusTopics: [
          'Sentence Repetition, Story Retelling & Spoken Clarity (sit in a quiet room)',
          'OOPs (Polymorphism, Abstract vs Interface), Exception Handling & Collections',
        ],
        cutoffTip: 'Use a noise-cancelling headset for the Versant communication round; speak at a steady pace.',
      },
    ],
    practiceQuestions: [
      {
        id: 'wca_q1',
        category: 'Core CS (OS / DBMS / CN / OOP)',
        title: 'Accenture / Capgemini Pseudocode & Networking',
        difficulty: 'Easy',
        askedInRound: 'Cognitive & Technical Assessment',
        questionPrompt:
          'Which layer of the OSI Model is responsible for end-to-end process-to-process delivery, flow control, and TCP/UDP port multiplexing?',
        options: ['Network Layer (Layer 3)', 'Transport Layer (Layer 4)', 'Session Layer (Layer 5)', 'Data Link Layer (Layer 2)'],
        correctOptionIndex: 1,
        approachExplanation:
          'Layer 4 (Transport Layer) manages segments, port addressing (TCP/UDP), flow control, and congestion control.',
      },
      {
        id: 'wca_q2',
        category: 'DSA & Coding',
        title: 'Wipro Turbo / GenC Next: Next Greater Element in Circular Array',
        difficulty: 'Medium',
        askedInRound: 'Coding Round (45 Mins)',
        questionPrompt:
          'Given a circular array of size N, find the next greater number for every element in O(N) time complexity.',
        options: [
          'Use a Monotonic Decreasing Stack iterating from 2N - 1 down to 0 with index i % N',
          'Sort the array and binary search',
          'Use Floyd Cycle Detection',
          'Compare only adjacent elements',
        ],
        correctOptionIndex: 0,
        codeSolution: `def next_greater_elements(nums: list[int]) -> list[int]:
    n = len(nums)
    res = [-1] * n
    stack = []
    for i in range(2 * n - 1, -1, -1):
        while stack and stack[-1] <= nums[i % n]:
            stack.pop()
        if i < n and stack:
            res[i] = stack[-1]
        stack.append(nums[i % n])
    return res`,
        approachExplanation:
          'By traversing 2N - 1 down to 0 with modulo indexing, each element is pushed and popped from the monotonic stack at most twice: O(N) time.',
      },
    ],
    hrQuestions: [
      {
        q: 'How do you handle conflicting deadlines when working in a multi-member project team?',
        sampleFramework:
          'Explain task prioritization (blocking vs non-blocking features), daily standups, and proactive communication with team leads.',
      },
    ],
  },
  {
    id: 'flipkart_razorpay_swiggy',
    name: 'Flipkart / Razorpay / Zomato / Swiggy / CRED',
    shortName: 'Flipkart · Razorpay · Swiggy',
    programName: 'Flipkart GRiD / SDE-1 Product & Unicorn Hiring',
    tier: 'Indian Startups & Unicorns',
    headquarters: 'Bengaluru / Gurugram',
    hiringLocations: ['Bengaluru (Bellandur / HSR / Koramangala)', 'Gurugram', 'Hyderabad', 'Mumbai'],
    rolesOffered: [
      { title: 'Software Development Engineer 1 (SDE-1)', ctcRange: '₹18.0 – ₹32.0 LPA', bondOrNote: 'Base ₹16–24L + ESOPs + Joining Bonus' },
      { title: 'Backend / Full-Stack Product Engineer', ctcRange: '₹15.0 – ₹26.0 LPA', bondOrNote: 'Machine Coding + Low-Level Design' },
    ],
    eligibility: {
      minCgpa: 7.0,
      allowedBacklogs: '0 Active Backlogs (Off-Campus open via Flipkart GRiD & Unstop)',
      branches: 'B.E. / B.Tech / Dual Degree (All Branches via GRiD)',
    },
    hiringWindow: 'June – August (Flipkart GRiD) & Year-Round Product Hiring',
    overview:
      'India’s premier consumer internet and fintech unicorns evaluate candidates heavily on a 90-minute Machine Coding Round (clean modular LLD) alongside DSA and CS Fundamentals.',
    selectionRounds: [
      {
        roundKey: 'uni_r1',
        roundNumber: 1,
        title: 'Online Assessment (3 Medium-Hard DSA Questions)',
        duration: '90 Mins',
        format: 'Graphs, DP, Tries, Heaps & Sliding Window',
        focusTopics: [
          'Multi-source BFS / Dijkstra on Grids (Swiggy/Zomato Delivery Routing)',
          'Trie Prefix Matching & Segment Trees / Binary Search on Answer',
          'DP with State Compression',
        ],
        cutoffTip: 'Clean O(N log N) solutions are mandatory as N is typically up to 2 * 10^5.',
      },
      {
        roundKey: 'uni_r2',
        roundNumber: 2,
        title: 'Machine Coding Round (Low-Level Design — 90 Mins Live Code)',
        duration: '90 Mins',
        format: 'Build a Working CLI / In-Memory System with SOLID Principles',
        focusTopics: [
          'Design Splitwise, Ride-Sharing (Ola/Uber), Parking Lot, or Food Ordering System',
          'Separation of Models, Repositories, Services, Strategy Pattern & Concurrency locks',
          'Working driver main() test script handling edge cases cleanly',
        ],
        cutoffTip: 'Code MUST compile and run end-to-end. Avoid putting all logic inside one God class.',
      },
      {
        roundKey: 'uni_r3',
        roundNumber: 3,
        title: 'Problem Solving / DSA + Hiring Manager (HM) System Design',
        duration: '60 Mins',
        format: 'Live DSA + High-Level Design & Concurrency',
        focusTopics: [
          'Idempotency keys in payment gateways (Razorpay), Redis caching & Rate Limiting',
          'Database indexing (B+ Trees), Deadlocks, ACID transactions & Kafka queues',
        ],
        cutoffTip: 'Discuss race conditions (e.g., two users booking the same seat or double payment) and row-level locking.',
      },
    ],
    practiceQuestions: [
      {
        id: 'uni_q1',
        category: 'System Design & HR',
        title: 'Machine Coding LLD: How to Prevent Double-Charging in Payment Retries (Razorpay / Flipkart)',
        difficulty: 'Hard',
        askedInRound: 'Machine Coding & System Design Round',
        questionPrompt:
          'When a user clicks "Pay ₹500" twice due to slow mobile network in India, how does a payment gateway ensure the customer is charged at most once?',
        options: [
          'Client-generated UUID Idempotency-Key stored with a unique DB constraint / Redis atomic SETNX lock',
          'Using HTTP GET requests instead of POST',
          'Disabling TLS encryption',
          'Increasing client timeout to 10 minutes',
        ],
        correctOptionIndex: 0,
        approachExplanation:
          'An Idempotency-Key header uniquely identifies the payment intent. The server atomically checks/stores the key in Redis/DB and returns the cached status for duplicate requests.',
      },
      {
        id: 'uni_q2',
        category: 'DSA & Coding',
        title: 'Flipkart / Swiggy OA: Minimum Riders Required for Overlapping Delivery Windows',
        difficulty: 'Medium',
        askedInRound: 'Online Coding Round',
        questionPrompt:
          'Given N delivery orders with [start_time, end_time], find the minimum number of delivery partners needed so no order is delayed.',
        options: [
          'Sort start and end times separately (or use a Min-Heap) in O(N log N)',
          'Use Bubble Sort in O(N^2)',
          'Take average of all delivery durations',
          'Use Depth First Search',
        ],
        correctOptionIndex: 0,
        codeSolution: `def min_delivery_partners(intervals: list[list[int]]) -> int:
    starts = sorted(i[0] for i in intervals)
    ends = sorted(i[1] for i in intervals)
    ptr_s = ptr_e = active = max_riders = 0
    while ptr_s < len(intervals):
        if starts[ptr_s] < ends[ptr_e]:
            active += 1
            max_riders = max(max_riders, active)
            ptr_s += 1
        else:
            active -= 1
            ptr_e += 1
    return max_riders`,
        approachExplanation:
          'Equivalent to Minimum Platforms / Meeting Rooms II. Sweep-line two pointers on sorted starts and ends takes O(N log N) time.',
      },
    ],
    hrQuestions: [
      {
        q: 'Tell me about a product feature in an Indian app (UPI, Swiggy Instamart, Flipkart) you would improve Technically.',
        sampleFramework:
          'Discuss latency under flash-sale spikes, offline resilience on patchy 4G/5G networks, or local-language voice search.',
      },
    ],
  },
  {
    id: 'zoho_freshworks',
    name: 'Zoho Corporation & Freshworks',
    shortName: 'Zoho · Freshworks',
    programName: 'Zoho Off-Campus / Campus Software Developer & QA',
    tier: 'Indian Startups & Unicorns',
    headquarters: 'Chennai / Tenkasi, Tamil Nadu',
    hiringLocations: ['Chennai (Estancia IT Park)', 'Tenkasi', 'Coimbatore', 'Madurai', 'Bengaluru', 'Hyderabad'],
    rolesOffered: [
      { title: 'Member Technical Staff (MTS — Zoho / Freshworks)', ctcRange: '₹8.4 – ₹14.0 LPA', bondOrNote: 'Zero CGPA Cutoff in Zoho Off-Campus!' },
      { title: 'Project Trainee / Associate SDE', ctcRange: '₹5.6 – ₹7.0 LPA', bondOrNote: 'Pure Logic & Console App Building' },
    ],
    eligibility: {
      minCgpa: 0.0,
      allowedBacklogs: 'Skills & Logic prioritized over marks/backlogs at Zoho',
      branches: 'All Engineering / Arts & Science / Diploma Graduates with strong coding',
    },
    hiringWindow: 'Monthly Off-Campus Drives & Campus Recruitment',
    overview:
      'Zoho is legendary in India for ignoring CGPA/resume pedigree and testing pure C programming pointers, pattern logic, and a 3-hour Console Application Design round.',
    selectionRounds: [
      {
        roundKey: 'zoho_r1',
        roundNumber: 1,
        title: 'Round 1: C Programming Output Trace (Pointers, Loops & Recursion) + Quantitative Aptitude',
        duration: '90 Mins',
        format: '25 Fill-in-the-Blank Questions (No MCQ Options!)',
        focusTopics: [
          'C Pointers, 2D Array memory offsets, static variables & recursion trees',
          'String manipulation without built-in library functions',
          'Time & Work, Clocks, Calendars, Profit & Loss word problems',
        ],
        cutoffTip: 'Because there are NO multiple-choice options, trace every loop iteration on rough paper carefully.',
      },
      {
        roundKey: 'zoho_r2',
        roundNumber: 2,
        title: 'Round 2: 5 Hands-On Algorithmic Coding Problems (No Built-In Sort/Regex)',
        duration: '150 Mins',
        format: 'Live IDE Check by Zoho Engineers after each problem',
        focusTopics: [
          'Matrix Spiral / Diagonal Printing & Cross-String X-Pattern',
          'Sliding Window, Custom Merge Sort, Roman/Number Conversions & Backtracking',
        ],
        cutoffTip: 'Avoid using built-in library helpers if asked; write clean helper functions with zero extra arrays when possible.',
      },
      {
        roundKey: 'zoho_r3',
        roundNumber: 3,
        title: 'Round 3: Advanced Console Application Design (Railway Ticket / Taxi Booking)',
        duration: '180 Mins',
        format: 'Build a Menu-Driven OOP System with 4–6 Modules',
        focusTopics: [
          'Railway Reservation (Confirmed / RAC / Waiting List automatic promotion on cancellation)',
          'Call Taxi Booking (Nearest free taxi at station, earnings calculation)',
          'Clean class hierarchy, edge-case validation & extensible state',
        ],
        cutoffTip: 'Design your classes so when the evaluator asks for a sudden modification (e.g., "Add Surge Pricing"), you only edit 1 method.',
      },
    ],
    practiceQuestions: [
      {
        id: 'zoho_q1',
        category: 'DSA & Coding',
        title: 'Zoho Classic Round 2: Look-and-Say Sequence / Run-Length String Compression',
        difficulty: 'Easy',
        askedInRound: 'Zoho Round 2 Coding',
        questionPrompt:
          'Given an encoded string like "a3b12c2", expand it in-place or linearly to output "aaabbbbbbbbbbbbcc" handling multi-digit counts properly.',
        options: [
          'Parse character followed by accumulating multi-digit number: num = num * 10 + (ch - "0")',
          'Assume every number is only 1 digit',
          'Use Floyd-Warshall',
          'Reverse the string twice',
        ],
        correctOptionIndex: 0,
        codeSolution: `def expand_zoho_string(s: str) -> str:
    out = []
    i = 0
    while i < len(s):
        ch = s[i]
        i += 1
        count = 0
        while i < len(s) and s[i].isdigit():
            count = count * 10 + int(s[i])
            i += 1
        out.append(ch * max(1, count))
    return "".join(out)`,
        approachExplanation:
          'Many candidates fail when the repeat count has 2+ digits (like b12). Accumulating digits with count = count * 10 + digit handles arbitrary numbers in O(N).',
      },
    ],
    hrQuestions: [
      {
        q: 'Why do you prefer building long-term products from scratch rather than short-term consulting?',
        sampleFramework:
          'Emphasize product ownership, deep engineering craftsmanship, customer empathy, and maintaining code quality over years.',
      },
    ],
  },
  {
    id: 'amazon_microsoft_google_india',
    name: 'Amazon / Microsoft / Google / Atlassian / Juspay India',
    shortName: 'Amazon · Microsoft · Google · Juspay',
    programName: 'SDE-1 / SWE University Graduate & Juspay Hiring Challenge',
    tier: 'Global Tech & FinTech India',
    headquarters: 'Bengaluru / Hyderabad / Noida / Pune',
    hiringLocations: ['Bengaluru', 'Hyderabad', 'Noida', 'Gurugram', 'Pune', 'Mumbai'],
    rolesOffered: [
      { title: 'SWE / SDE-1 (Google / Microsoft / Amazon India)', ctcRange: '₹28.0 – ₹52.0 LPA', bondOrNote: 'Base ₹16–22L + RSU Stock + Bonus' },
      { title: 'Juspay Product Engineer (FP / Backend)', ctcRange: '₹21.0 – ₹27.0 LPA', bondOrNote: 'Tree of Space Concurrency Hackathon' },
    ],
    eligibility: {
      minCgpa: 7.0,
      allowedBacklogs: '0 Active Backlogs',
      branches: 'B.E. / B.Tech / M.Tech / Dual Degree',
    },
    hiringWindow: 'July – December (Campus) & Off-Campus Hackathons (Juspay Hiring Challenge / Amazon WoW)',
    overview:
      'Global R&D centers in Bengaluru and Hyderabad test deep algorithmic problem solving, OS concurrency (Juspay Tree of Space), and Leadership Principles.',
    selectionRounds: [
      {
        roundKey: 'faang_r1',
        roundNumber: 1,
        title: 'Online Coding Assessment (Graphs, Trees, DP & Work Style Assessment)',
        duration: '90 Mins',
        format: '2–3 Medium/Hard DSA Problems',
        focusTopics: [
          'Trees (LCA, Serialization, Juspay Tree of Space Lock/Unlock/Upgrade)',
          'Graphs (Topological Sort, Bridges/Articulation Points, Dijkstra)',
          'Monotonic Deque, Prefix XOR & Binary Search on Answer',
        ],
        cutoffTip: 'In Amazon, the Work Style Assessment (Leadership Principles alignment) carries nearly equal weight to the coding score.',
      },
      {
        roundKey: 'faang_r2',
        roundNumber: 2,
        title: '2–3 Back-to-Back Technical DSA & Concurrency Rounds',
        duration: '60 Mins each',
        format: 'Live Shared Editor (No Autocomplete)',
        focusTopics: [
          'Clarifying constraints before coding, dry-running edge cases & optimal complexity',
          'Thread safety, Mutex vs Semaphore, Deadlock prevention & Virtual Memory',
        ],
        cutoffTip: 'Never jump straight into coding—spend the first 5 minutes clarifying constraints and proposing brute-force -> optimal trade-offs.',
      },
      {
        roundKey: 'faang_r3',
        roundNumber: 3,
        title: 'Bar Raiser & Behavioral Leadership Round',
        duration: '60 Mins',
        format: 'Deep Project Architecture + Behavioral STAR Stories',
        focusTopics: [
          'Customer Obsession, Ownership, Bias for Action, Dive Deep',
          'Scaling your college project from 100 users to 1 Million users',
        ],
        cutoffTip: 'Prepare 4 concrete stories using "I" (your specific technical contribution) rather than vague "we" statements.',
      },
    ],
    practiceQuestions: [
      {
        id: 'faang_q1',
        category: 'DSA & Coding',
        title: 'Juspay / Amazon Classic: Tree of Space — Locking & Upgrading Descendant Nodes',
        difficulty: 'Hard',
        askedInRound: 'Juspay Hackathon & Amazon SDE-1 Round',
        questionPrompt:
          'In an M-ary tree with lock(node, uid), unlock(node, uid), and upgradeLock(node, uid), how do you check if any descendant is locked in O(1) or O(locked_descendants) instead of O(N) subtree traversal?',
        options: [
          'Maintain a hash set of lockedDescendants on every ancestor node during lock() and unlock() in O(log_M N) height',
          'Run a full BFS over the entire tree on every lock() call',
          'Rebuild the tree from scratch after every query',
          'Sort node values alphabetically',
        ],
        correctOptionIndex: 0,
        approachExplanation:
          'Since tree height is O(log_M N), propagating locked descendant pointers up to ancestors during lock/unlock keeps ancestor checks instantaneous.',
      },
    ],
    hrQuestions: [
      {
        q: 'Tell me about a time you took a calculated technical risk when you didn’t have 100% of the data (Bias for Action).',
        sampleFramework:
          'Describe the bottleneck, the reversible two-way door decision you made, metrics you monitored, and the measurable outcome.',
      },
    ],
  },
  {
    id: 'reliance_jio_lnt_airtel',
    name: 'Reliance Jio / Airtel / L&T Technology / Tata Elxsi',
    shortName: 'Jio · Airtel · L&T · Tata Elxsi',
    programName: 'Graduate Engineer Trainee (GET) & 5G/Cloud SDE',
    tier: 'Core Engineering & Telecom',
    headquarters: 'Navi Mumbai / Gurugram / Bengaluru / Chennai',
    hiringLocations: ['Navi Mumbai (Ghansoli)', 'Gurugram', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Vadodara'],
    rolesOffered: [
      { title: 'SDE / Cloud & 5G Platform Engineer (Jio / Airtel)', ctcRange: '₹7.5 – ₹14.5 LPA', bondOrNote: 'Distributed Systems + Networking + DSA' },
      { title: 'Embedded & Automotive Software Engineer (Tata Elxsi / L&T)', ctcRange: '₹5.5 – ₹9.0 LPA', bondOrNote: 'C/C++ Pointers, RTOS & Microcontrollers' },
    ],
    eligibility: {
      minCgpa: 6.5,
      allowedBacklogs: '0 Active Backlogs',
      branches: 'CSE / IT / ECE / EEE / Instrumentation / Mechanical',
    },
    hiringWindow: 'August – February (Campus GET Drives)',
    overview:
      'Ideal for CSE, ECE, and EEE students targeting telecom, 5G core, IoT, automotive embedded systems, and high-scale media streaming platforms in India.',
    selectionRounds: [
      {
        roundKey: 'core_r1',
        roundNumber: 1,
        title: 'Domain Technical + Aptitude + C/C++/Python Coding Test',
        duration: '90 Mins',
        format: 'Aptitude + Core Subject MCQs (CN/OS/Embedded C) + 2 Coding Questions',
        focusTopics: [
          'TCP/IP 3-Way Handshake, Subnet Masks, DNS, HTTP/3 & Socket Programming',
          'Volatile keyword, Memory Layout of C Program (Text, Data, BSS, Heap, Stack)',
          'Bit manipulation (Set, Clear, Toggle kth bit)',
        ],
        cutoffTip: 'ECE/EEE & CSE candidates should master bitwise manipulation and C memory management thoroughly.',
      },
      {
        roundKey: 'core_r2',
        roundNumber: 2,
        title: 'Technical Panel & System Debugging Interview',
        duration: '45 Mins',
        format: 'Live Code + Architecture / Hardware-Software Interface',
        focusTopics: [
          'Interrupt Service Routines (ISR), I2C/SPI/UART protocols, or Microservices scaling',
          'Linux commands (grep, netstat, top, chmod) and multithreading',
        ],
        cutoffTip: 'Connect your academic project to real-world reliability, latency, and power/memory optimization.',
      },
    ],
    practiceQuestions: [
      {
        id: 'core_q1',
        category: 'Core CS (OS / DBMS / CN / OOP)',
        title: 'Embedded C & Systems: Purpose of the `volatile` Keyword',
        difficulty: 'Medium',
        askedInRound: 'Tata Elxsi / L&T / Jio Technical Interview',
        questionPrompt:
          'Why do we declare a variable as `volatile` in C/C++ when reading hardware registers or variables modified by an Interrupt Service Routine (ISR)?',
        options: [
          'It prevents the compiler from caching the variable in a CPU register and forces every read/write from main memory',
          'It stores the variable in ROM permanently',
          'It automatically encrypts the variable in RAM',
          'It doubles CPU clock frequency',
        ],
        correctOptionIndex: 0,
        approachExplanation:
          'Without `volatile`, the compiler may optimize away repeated reads in a loop assuming the value never changes externally.',
      },
    ],
    hrQuestions: [
      {
        q: 'Where do you see yourself in 3 years in India’s deep-tech / telecom / automotive ecosystem?',
        sampleFramework:
          'Discuss growing from a Graduate Engineer Trainee into a module lead owning end-to-end production systems.',
      },
    ],
  },
];

interface IndiaPlacementPrepHubProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledPrompt?: string) => void;
  onNavigateToQuiz?: () => void;
  onLogStudyMinutes?: (minutes: number, label?: string) => void;
}

export const IndiaPlacementPrepHub: React.FC<IndiaPlacementPrepHubProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
  onLogStudyMinutes,
}) => {
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(INDIAN_COMPANIES[0].id);
  const [activeSubView, setActiveSubView] = useState<'rounds' | 'questions' | 'hr_ats' | 'calendar'>('rounds');

  // Target companies & solved question IDs persisted in profile
  const [targetCompanyIds, setTargetCompanyIds] = useState<string[]>(() => {
    return profile.placementPrep?.targetCompanyIds || ['tcs_nqt_prime', 'infosys_sp_dse', 'flipkart_razorpay_swiggy'];
  });
  const [completedQuestionIds, setCompletedQuestionIds] = useState<string[]>(() => {
    return profile.placementPrep?.completedQuestionIds || [];
  });
  const [completedRoundKeys, setCompletedRoundKeys] = useState<string[]>(() => {
    return profile.placementPrep?.completedRoundKeys || ['tcs_r1'];
  });

  // Student CGPA & Backlog Eligibility Checker state
  const [studentCgpa, setStudentCgpa] = useState<number>(profile.placementPrep?.cgpa || 7.8);
  const [activeBacklogs, setActiveBacklogs] = useState<number>(0);

  // Interactive Question Solver state
  const [selectedOptionMap, setSelectedOptionMap] = useState<Record<string, number>>({});
  const [revealedSolutionMap, setRevealedSolutionMap] = useState<Record<string, boolean>>({});
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 4000);
  };

  const persistPlacementState = async (
    nextTargets: string[],
    nextQuestions: string[],
    nextRounds: string[],
    nextCgpa: number
  ) => {
    const updatedPlacementPrep = {
      targetCompanyIds: nextTargets,
      completedQuestionIds: nextQuestions,
      completedRoundKeys: nextRounds,
      mockTestScores: profile.placementPrep?.mockTestScores || [],
      cgpa: nextCgpa,
    };

    const updatedProfile: StudentProfile = {
      ...profile,
      placementPrep: updatedPlacementPrep,
    };
    onProfileUpdate(updatedProfile);

    try {
      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placementPrep: updatedPlacementPrep }),
      });
    } catch {}

    try {
      await setDoc(
        doc(db, 'profiles', profile.userId),
        {
          userId: profile.userId,
          name: profile.name,
          whatsappNumber: profile.whatsappNumber,
          preferredLanguage: profile.preferredLanguage || 'en',
          placementPrep: updatedPlacementPrep,
        },
        { merge: true }
      );
    } catch {}
  };

  const handleToggleTargetCompany = (companyId: string, companyName: string) => {
    const exists = targetCompanyIds.includes(companyId);
    const nextTargets = exists
      ? targetCompanyIds.filter((id) => id !== companyId)
      : [...targetCompanyIds, companyId];
    setTargetCompanyIds(nextTargets);
    persistPlacementState(nextTargets, completedQuestionIds, completedRoundKeys, studentCgpa);
    showToast(
      exists
        ? `Removed ${companyName} from your Target Drives.`
        : `Added ${companyName} to your Target Placement Drives!`
    );
  };

  const handleToggleRoundChecklist = (roundKey: string, roundTitle: string) => {
    const exists = completedRoundKeys.includes(roundKey);
    const nextRounds = exists
      ? completedRoundKeys.filter((k) => k !== roundKey)
      : [...completedRoundKeys, roundKey];
    setCompletedRoundKeys(nextRounds);
    if (!exists && onLogStudyMinutes) {
      onLogStudyMinutes(20, `Placement Round Prep: ${roundTitle}`);
    }
    persistPlacementState(targetCompanyIds, completedQuestionIds, nextRounds, studentCgpa);
    showToast(
      exists
        ? `Unmarked "${roundTitle}".`
        : `Completed round prep: "${roundTitle}" (+20m study logged)`
    );
  };

  const handleAnswerPlacementQuestion = (q: PlacementQuestion, optIndex: number) => {
    setSelectedOptionMap((prev) => ({ ...prev, [q.id]: optIndex }));
    setRevealedSolutionMap((prev) => ({ ...prev, [q.id]: true }));

    if (optIndex === q.correctOptionIndex && !completedQuestionIds.includes(q.id)) {
      const nextQuestions = [...completedQuestionIds, q.id];
      setCompletedQuestionIds(nextQuestions);
      if (onLogStudyMinutes) {
        onLogStudyMinutes(10, `Solved Placement Question: ${q.title}`);
      }
      persistPlacementState(targetCompanyIds, nextQuestions, completedRoundKeys, studentCgpa);
      showToast(`Correct! Marked "${q.title}" as solved (+10m logged).`);
    }
  };

  const handleSendPlacementSheetToWhatsApp = async (company: IndianCompanyProfile) => {
    setSendingWhatsAppId(company.id);
    try {
      const rolesSummary = company.rolesOffered
        .map((r) => `• ${r.title}: ${r.ctcRange}`)
        .join('\n');
      const roundsSummary = company.selectionRounds
        .map((r) => `${r.roundNumber}. ${r.title} (${r.duration})`)
        .join('\n');

      const message =
        `🇮🇳 *India Placement Prep Sheet — ${company.name}*\n` +
        `📋 *Program:* ${company.programName}\n\n` +
        `💼 *Roles & CTC Packages:*\n${rolesSummary}\n\n` +
        `🎯 *Selection Rounds:*\n${roundsSummary}\n\n` +
        `💡 *Reply with "Mock Interview ${company.shortName}" to start a live 1:1 Technical & HR interview simulation!*`;

      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: profile.whatsappNumber,
          userId: profile.userId,
          message,
        }),
      });
      showToast(`Sent ${company.shortName} Placement Cheat Sheet to WhatsApp (${profile.whatsappNumber})!`);
    } catch {
      showToast(`Prepared ${company.shortName} cheat sheet for WhatsApp.`);
    } finally {
      setSendingWhatsAppId(null);
    }
  };

  const filteredCompanies = useMemo(() => {
    return INDIAN_COMPANIES.filter((c) => {
      const matchesTier = selectedTier === 'All' || c.tier === selectedTier;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.programName.toLowerCase().includes(q) ||
        c.hiringLocations.some((loc) => loc.toLowerCase().includes(q)) ||
        c.rolesOffered.some((r) => r.title.toLowerCase().includes(q));
      return matchesTier && matchesSearch;
    });
  }, [selectedTier, searchQuery]);

  const activeCompany = useMemo(() => {
    return (
      INDIAN_COMPANIES.find((c) => c.id === selectedCompanyId) ||
      filteredCompanies[0] ||
      INDIAN_COMPANIES[0]
    );
  }, [selectedCompanyId, filteredCompanies]);

  const totalQuestionsCount = useMemo(
    () => INDIAN_COMPANIES.reduce((acc, c) => acc + c.practiceQuestions.length, 0),
    []
  );
  const totalRoundsCount = useMemo(
    () => INDIAN_COMPANIES.reduce((acc, c) => acc + c.selectionRounds.length, 0),
    []
  );

  const readinessPercentage = useMemo(() => {
    const totalItems = totalQuestionsCount + totalRoundsCount;
    if (totalItems === 0) return 0;
    return Math.min(
      100,
      Math.round(((completedQuestionIds.length + completedRoundKeys.length) / totalItems) * 100)
    );
  }, [completedQuestionIds.length, completedRoundKeys.length, totalQuestionsCount, totalRoundsCount]);

  const isEligibleForActiveCompany =
    studentCgpa >= activeCompany.eligibility.minCgpa &&
    (activeBacklogs === 0 || activeCompany.id === 'tcs_nqt_prime' || activeCompany.id === 'zoho_freshworks');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold">
            <Briefcase className="w-4 h-4" />
            <span>India Campus & Off-Campus Placement Preparation Cell</span>
            <span aria-hidden="true">·</span>
            <span>CTC ₹3.5 LPA to ₹52 LPA Tracks</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Multi-Company Placement & Interview Hub (India)
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Prepare systematically for mass IT recruiters (TCS NQT Prime, Infosys SP/DSE, Wipro, Accenture), Indian product unicorns (Flipkart GRiD, Razorpay, Zomato, Zoho), and global tech R&D centers across Bengaluru, Hyderabad, Pune, Chennai, Mumbai & NCR.
          </p>
        </div>

        {/* Readiness Summary Metrics */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
            <div className="text-[11px] text-slate-400">Target Companies</div>
            <div className="text-base font-bold font-mono tabular-nums text-white">
              {targetCompanyIds.length} / {INDIAN_COMPANIES.length}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
            <div className="text-[11px] text-slate-400">Questions Solved</div>
            <div className="text-base font-bold font-mono tabular-nums text-emerald-400">
              {completedQuestionIds.length} / {totalQuestionsCount}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
            <div className="text-[11px] text-slate-400">Placement Readiness</div>
            <div className="text-base font-bold font-mono tabular-nums text-amber-400">
              {readinessPercentage}%
            </div>
          </div>
        </div>
      </div>

      {statusToast && (
        <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="text-emerald-300 hover:text-white text-[11px] font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search, Tier Filter & Student CGPA Eligibility Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-950/70 border border-slate-800/90 rounded-xl p-4">
        <div className="lg:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search TCS, Infosys, Zoho, Flipkart, Bengaluru, SDE..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="lg:col-span-5 flex flex-wrap items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {['All', 'Mass & Digital IT Giants', 'Indian Startups & Unicorns', 'Global Tech & FinTech India', 'Core Engineering & Telecom'].map(
            (tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  selectedTier === tier
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tier === 'All'
                  ? 'All Tracks'
                  : tier === 'Mass & Digital IT Giants'
                  ? 'IT Service & Digital'
                  : tier === 'Indian Startups & Unicorns'
                  ? 'Startups & Zoho'
                  : tier === 'Global Tech & FinTech India'
                  ? 'Global Product'
                  : 'Core & Telecom'}
              </button>
            )
          )}
        </div>

        <div className="lg:col-span-3 flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
          <div>
            <label className="block text-[10px] text-slate-400">Your CGPA</label>
            <input
              type="number"
              step="0.1"
              min="4.0"
              max="10.0"
              value={studentCgpa}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStudentCgpa(val);
                persistPlacementState(targetCompanyIds, completedQuestionIds, completedRoundKeys, val);
              }}
              className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400">Backlogs</label>
            <select
              value={activeBacklogs}
              onChange={(e) => setActiveBacklogs(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-white"
            >
              <option value={0}>0 Active</option>
              <option value={1}>1 Active</option>
              <option value={2}>2+ Active</option>
            </select>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">Eligible</div>
            <div className="text-xs font-bold font-mono text-emerald-400">
              {
                INDIAN_COMPANIES.filter(
                  (c) =>
                    studentCgpa >= c.eligibility.minCgpa &&
                    (activeBacklogs === 0 || c.id === 'tcs_nqt_prime' || c.id === 'zoho_freshworks')
                ).length
              }
              /{INDIAN_COMPANIES.length}
            </div>
          </div>
        </div>
      </div>

      {/* Company Selector Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredCompanies.map((company) => {
          const isSelected = company.id === activeCompany.id;
          const isTarget = targetCompanyIds.includes(company.id);
          const companySolvedCount = company.practiceQuestions.filter((q) =>
            completedQuestionIds.includes(q.id)
          ).length;

          return (
            <div
              key={company.id}
              onClick={() => setSelectedCompanyId(company.id)}
              className={`rounded-xl p-4 border transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800/90 border-emerald-500/70 shadow-lg'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] text-slate-400">
                      {company.tier} · Min {company.eligibility.minCgpa > 0 ? `${company.eligibility.minCgpa} CGPA` : 'No CGPA Cutoff'}
                    </div>
                    <h3 className="text-sm font-bold text-white mt-0.5">{company.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTargetCompany(company.id, company.shortName);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer shrink-0 ${
                      isTarget
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-white'
                    }`}
                  >
                    {isTarget ? '★ Target Drive' : '+ Shortlist'}
                  </button>
                </div>

                <div className="text-xs text-emerald-400 font-medium mt-1.5">
                  {company.programName}
                </div>

                <div className="mt-2.5 space-y-1">
                  {company.rolesOffered.slice(0, 2).map((role, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 truncate pr-2">{role.title}</span>
                      <span className="font-mono tabular-nums text-amber-300 font-semibold shrink-0">
                        {role.ctcRange}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  {company.selectionRounds.length} Rounds · {companySolvedCount}/{company.practiceQuestions.length} Solved
                </span>
                <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                  <span>{isSelected ? 'Viewing Details' : 'Open Blueprint'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Company Deep-Dive Workspace */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="text-emerald-400 font-semibold">{activeCompany.shortName}</span>
              <span aria-hidden="true">·</span>
              <span>HQ: {activeCompany.headquarters}</span>
              <span aria-hidden="true">·</span>
              <span>Window: {activeCompany.hiringWindow}</span>
              <span aria-hidden="true">·</span>
              <span className={isEligibleForActiveCompany ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                {isEligibleForActiveCompany
                  ? `✓ Eligible with your ${studentCgpa} CGPA`
                  : `Requires ${activeCompany.eligibility.minCgpa} CGPA & ${activeCompany.eligibility.allowedBacklogs}`}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              {activeCompany.name} — {activeCompany.programName}
            </h3>
            <p className="text-xs text-slate-300 mt-1">{activeCompany.overview}</p>
            <div className="text-[11px] text-slate-400 mt-2">
              <strong className="text-slate-300">Hiring Locations in India:</strong>{' '}
              {activeCompany.hiringLocations.join(' · ')}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                onNavigateToChat(
                  `Conduct a realistic 1-on-1 Mock Placement Interview for ${activeCompany.name} (${activeCompany.programName}). Ask me 1 DSA question, 1 Core CS/Project question, and 1 HR question one by one and evaluate my answers.`
                )
              }
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Start AI Mock Interview ({activeCompany.shortName})</span>
            </button>

            <button
              type="button"
              onClick={() => handleSendPlacementSheetToWhatsApp(activeCompany)}
              disabled={sendingWhatsAppId === activeCompany.id}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {sendingWhatsAppId === activeCompany.id
                  ? 'Sending...'
                  : 'Send Cheat Sheet to WhatsApp'}
              </span>
            </button>
          </div>
        </div>

        {/* Role & CTC Breakdown Table */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {activeCompany.rolesOffered.map((role, i) => (
            <div
              key={i}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-semibold text-white">{role.title}</div>
                <div className="text-base font-bold font-mono tabular-nums text-amber-400 mt-1">
                  {role.ctcRange}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
                Focus: {role.bondOrNote}
              </div>
            </div>
          ))}
        </div>

        {/* Sub-Navigation Tabs inside Active Company */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveSubView('rounds')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeSubView === 'rounds'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1. Selection Process & Round Blueprint ({activeCompany.selectionRounds.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView('questions')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeSubView === 'questions'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2. Company-Specific Previous Questions & Code ({activeCompany.practiceQuestions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView('hr_ats')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeSubView === 'hr_ats'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3. HR Interview & India Campus Resume Checklist
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView('calendar')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeSubView === 'calendar'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            4. All-India Off-Campus & Hackathon Calendar
          </button>
        </div>

        {/* Sub-View 1: Selection Rounds */}
        {activeSubView === 'rounds' && (
          <div className="space-y-3.5">
            {activeCompany.selectionRounds.map((round) => {
              const isDone = completedRoundKeys.includes(round.roundKey);
              return (
                <div
                  key={round.roundKey}
                  className={`rounded-xl p-4 border transition ${
                    isDone
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-400">
                        Round 0{round.roundNumber} · Duration: {round.duration} · Format: {round.format}
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5">{round.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToChat(
                            `Help me prepare for ${activeCompany.shortName} Round ${round.roundNumber}: "${round.title}". Give me a 5-question rapid drill covering ${round.focusTopics.join(', ')}.`
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-emerald-300 font-medium transition cursor-pointer"
                      >
                        Practice Round Drill
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleRoundChecklist(round.roundKey, round.title)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isDone ? 'Round Mastered' : 'Mark Prepared'}</span>
                      </button>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1 text-xs text-slate-300 list-disc list-inside">
                    {round.focusTopics.map((topic, idx) => (
                      <li key={idx}>{topic}</li>
                    ))}
                  </ul>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-xs text-amber-300">
                    <strong>Shortlist Strategy:</strong> {round.cutoffTip}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sub-View 2: Company-Specific Practice Questions */}
        {activeSubView === 'questions' && (
          <div className="space-y-4">
            {activeCompany.practiceQuestions.map((q, idx) => {
              const selectedOpt = selectedOptionMap[q.id];
              const isRevealed = revealedSolutionMap[q.id];
              const isSolved = completedQuestionIds.includes(q.id);

              return (
                <div
                  key={q.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-400">
                        Q0{idx + 1} · {q.category} · {q.askedInRound} · Difficulty: {q.difficulty}
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5">{q.title}</h4>
                    </div>
                    {isSolved && (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Solved</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">{q.questionPrompt}</p>

                  {q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const isPicked = selectedOpt === optIdx;
                        const isRight = q.correctOptionIndex === optIdx;
                        let btnStyle =
                          'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700';
                        if (isRevealed) {
                          if (isRight) {
                            btnStyle =
                              'bg-emerald-950/60 border-emerald-500/60 text-emerald-200 font-semibold';
                          } else if (isPicked && !isRight) {
                            btnStyle = 'bg-rose-950/60 border-rose-500/60 text-rose-200';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleAnswerPlacementQuestion(q, optIdx)}
                            className={`text-left px-3.5 py-2.5 rounded-lg border text-xs transition cursor-pointer ${btnStyle}`}
                          >
                            <span className="font-mono mr-2 text-slate-400">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedSolutionMap((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                      }
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                    >
                      {isRevealed ? 'Hide Optimal Solution & Code' : 'View Optimal Explanation & Code'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onNavigateToChat(
                          `Explain this ${activeCompany.shortName} placement problem step by step with dry run and follow-up interview questions: "${q.title} — ${q.questionPrompt}"`
                        )
                      }
                      className="text-xs text-slate-300 hover:text-white underline cursor-pointer"
                    >
                      Ask AI Tutor for Dry Run →
                    </button>
                  </div>

                  {isRevealed && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
                      <div className="text-slate-300">
                        <strong className="text-emerald-400">Optimal Approach: </strong>
                        {q.approachExplanation}
                      </div>
                      {q.codeSolution && (
                        <pre className="bg-slate-900 border border-slate-800 rounded-lg p-3 overflow-x-auto font-mono text-[11px] text-emerald-300">
                          <code>{q.codeSolution}</code>
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Sub-View 3: HR & Campus Resume Checklist */}
        {activeSubView === 'hr_ats' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-bold text-white">
                {activeCompany.shortName} HR & Managerial Panel Questions
              </h4>
              {activeCompany.hrQuestions.map((hr, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5">
                  <div className="text-xs font-semibold text-white">Q: “{hr.q}”</div>
                  <p className="text-xs text-slate-300">
                    <strong className="text-emerald-400">Winning Answer Structure: </strong>
                    {hr.sampleFramework}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateToChat(
                        `Help me craft a personalized STAR answer for the ${activeCompany.shortName} interview question: "${hr.q}" using my skills in ${(profile.subjects || ['Python', 'DSA']).join(', ')}.`
                      )
                    }
                    className="text-[11px] text-emerald-400 hover:underline font-medium cursor-pointer"
                  >
                    Draft My Personalized Answer in AI Chat →
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-bold text-white">
                Indian Campus & Off-Campus ATS Resume Checklist
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Single-Page LaTeX Format:</strong> Keep 10th, 12th/Diploma, and B.Tech CGPA clearly visible for Superset / TCS NextStep / Naukri Campus parsers.
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>2 Deployed Full-Stack / AI Projects:</strong> Include live GitHub links, tech stack (React, Node, Python, SQL, Firestore), and measurable latency/accuracy metrics.
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>DSA & Hackathon Profiles:</strong> Mention LeetCode / GeeksforGeeks / CodeChef problem counts and Smart India Hackathon (SIH) or Flipkart GRiD participation.
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Core CS Readiness:</strong> Be prepared to draw your project’s ER Diagram and explain SQL Joins, Indexing, OS Deadlocks, and OOP pillars on a whiteboard.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Sub-View 4: Pan-India Off-Campus & Hackathon Calendar */}
        {activeSubView === 'calendar' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {[
              {
                drive: 'TCS National Qualifier Test (NQT — Ninja / Digital / Prime)',
                portal: 'TCS NextStep Portal',
                window: 'August – November & Quarterly iON Cycles',
                ctc: '₹3.36 LPA – ₹11.5 LPA',
                prompt: 'Create a 14-day study plan for TCS NQT Prime covering Numerical Ability, Reasoning, and 2 Advanced Coding problems.',
              },
              {
                drive: 'HackWithInfy & Infosys SP / DSE National Hiring',
                portal: 'Infosys InfyTQ / Springboard',
                window: 'March – July (HackWithInfy) & Sept – Dec',
                ctc: '₹6.25 LPA – ₹13.0 LPA',
                prompt: 'Give me a Greedy, Dynamic Programming, and Graph roadmap to clear HackWithInfy Specialist Programmer (SP).',
              },
              {
                drive: 'Flipkart GRiD & Juspay Hiring Challenge (Unstop / HackerEarth)',
                portal: 'Unstop (formerly Dare2Compete)',
                window: 'June – October',
                ctc: '₹21.0 LPA – ₹32.0 LPA',
                prompt: 'Simulate the Juspay Tree of Space locking problem and Flipkart Machine Coding round for me.',
              },
              {
                drive: 'Zoho Off-Campus Software Developer Drive (Chennai / Tenkasi)',
                portal: 'Zoho Careers (Monthly Off-Campus)',
                window: 'Monthly Rolling Drives (No CGPA Cutoff)',
                ctc: '₹5.6 LPA – ₹14.0 LPA',
                prompt: 'Test me with 5 Zoho Round 1 C Pointer output trace questions and 1 Round 3 Console App design prompt.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{item.portal}</span>
                    <span className="font-mono text-amber-400 font-semibold">{item.ctc}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1">{item.drive}</h4>
                  <div className="text-xs text-emerald-400 mt-1">Window: {item.window}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateToChat(item.prompt)}
                  className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
                >
                  Generate Custom Prep Plan →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
