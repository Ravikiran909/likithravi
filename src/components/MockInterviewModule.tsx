import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Building2,
  Code2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Play,
  Send,
  ChevronRight,
  Clock,
  Award,
  Terminal,
  MessageSquare,
  Lightbulb,
  Share2,
  RotateCcw,
  Brain,
  Check,
  Video,
  VideoOff,
  Lock,
  Unlock,
  HelpCircle,
  Layers,
  Flame,
  Eye,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { doc, setDoc } from 'firebase/firestore';

interface MockInterviewModuleProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
  onLogStudyMinutes?: (mins: number, label?: string) => void;
}

export interface ProgressiveLearningStage {
  stageIndex: number;
  levelLabel: 'Stage 1: Scratch Foundation' | 'Stage 2: Intermediate Optimization' | 'Stage 3: Advanced Bar-Raiser Complication';
  shortTag: '1. Scratch' | '2. Intermediate' | '3. Advanced';
  questionPrompt: string;
  socraticCheckQuestion: string;
  progressiveHints: [string, string, string];
  stepByStepScratchToAdvancedSolution: string;
}

export interface InterviewQuestionScenario {
  id: string;
  roundType: 'DSA & Problem Solving' | 'System Design & Architecture' | 'Core CS (DBMS / OS / OOP)' | 'Behavioral & Ownership';
  difficulty: 'Medium' | 'Hard' | 'Bar-Raiser';
  title: string;
  interviewerPersona: string;
  scenarioContext: string;
  questionPrompt: string;
  starterCode: string;
  expectedKeyConcepts: string[];
  hint: string;
  sampleHighScoringOutline: string;
  progressiveStages: ProgressiveLearningStage[];
}

export interface CompanyInterviewTrack {
  id: string;
  name: string;
  tier: string;
  role: string;
  ctcBand: string;
  accentColor: string;
  interviewerName: string;
  interviewerTitle: string;
  evaluationFocus: string[];
  scenarios: InterviewQuestionScenario[];
}

interface TurnFeedback {
  overallScore: number;
  technicalAccuracyScore: number;
  problemSolvingScore: number;
  communicationClarityScore: number;
  verdict: 'Strong Hire' | 'Hire' | 'Leaning Hire' | 'Needs Practice';
  canRevealFullSolution?: boolean;
  socraticGuidance?: string;
  progressiveHints?: string[];
  strengths: string[];
  improvements: string[];
  complexityCritique: string;
  modelExemplarAnswer: string;
  interviewerFollowUpQuestion: string;
  nextComplicatedChallenge?: string;
}

const COMPANY_INTERVIEW_TRACKS: CompanyInterviewTrack[] = [
  {
    id: 'google_india',
    name: 'Google India',
    tier: 'Global Big Tech (Bengaluru / Hyderabad)',
    role: 'Software Engineer (SWE L3 - University Grad)',
    ctcBand: '₹32.0 – ₹46.0 LPA',
    accentColor: 'emerald',
    interviewerName: 'Vikramaditya Rao',
    interviewerTitle: 'Staff Software Engineer (Search Infrastructure)',
    evaluationFocus: ['Asymptotic Optimality', 'Ambiguity Resolution', 'Clean Bug-Free Code', 'Edge-Case Rigor'],
    scenarios: [
      {
        id: 'goog_q1',
        roundType: 'DSA & Problem Solving',
        difficulty: 'Hard',
        title: 'Dynamic Network Latency & K-Stops Shortest Path',
        interviewerPersona: 'Vikramaditya Rao (Google L6 Bar-Raiser)',
        scenarioContext:
          'We are routing RPC packets across Google Cloud data centers in Mumbai, Singapore, and Tokyo. Each hop has a latency cost and a strict maximum hop budget K.',
        questionPrompt:
          'Given N data centers, a list of directed links with latency [u, v, cost], a source node, destination node, and at most K intermediate stops, how would you compute the minimum latency path? Walk me through why standard Dijkstra can fail if we naively mark nodes visited, and write the optimal algorithm.',
        starterCode: `def find_cheapest_rpc_route(n: int, links: list[list[int]], src: int, dst: int, k: int) -> int:\n    # Write your optimal Bellman-Ford / Modified Dijkstra solution\n    pass`,
        expectedKeyConcepts: [
          'Bellman-Ford',
          'Modified Dijkstra',
          'Stops constraint',
          'Time Complexity O(K * E)',
          'Space Complexity',
          'Pruning',
        ],
        hint: 'Track the minimum stops used to reach each node; a higher-cost path with fewer stops might still be valid later.',
        sampleHighScoringOutline:
          'Use K+1 iterations of Bellman-Ford with a temp distance copy array (Time: O(K·E), Space: O(V)), or Modified Dijkstra tracking min_stops[node] so we only re-explore a node if we reach it in strictly fewer stops.',
        progressiveStages: [
          {
            stageIndex: 0,
            levelLabel: 'Stage 1: Scratch Foundation',
            shortTag: '1. Scratch',
            questionPrompt:
              'Stage 1 (Scratch): Before writing any complex graph code, how would you model the N data centers and directed latency links from scratch? If we used a simple BFS or DFS exploring all paths up to K stops, what happens when the graph has cycles or dense edges?',
            socraticCheckQuestion:
              'Think aloud: If Path A reaches Singapore with cost 10 in 3 hops (exceeding budget K=2), and Path B reaches Singapore with cost 15 in 1 hop, which path is actually useful for reaching Tokyo next?',
            progressiveHints: [
              'Hint 1 (Intuition): Represent the graph as an adjacency list adj[u] = [(v, weight)] and trace a 3-node triangle where a cheaper path uses too many hops.',
              'Hint 2 (Bottleneck): Naive DFS explores O(V^K) paths. Standard Dijkstra greedily locks the lowest-cost arrival and discards a slightly costlier arrival that has fewer stops remaining.',
              'Hint 3 (State Definition): Every state in your search must track TWO dimensions: (current_latency_cost, stops_used_so_far).',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch Intuition: Build an adjacency list. Naive DFS/BFS explores exponential paths unless we prune suboptimal states.\n2. Intermediate Optimization (Bellman-Ford K+1 Relaxations): Maintain dist[0..n-1] = inf, dist[src] = 0. Loop K+1 times using a copy 'temp = dist[:]' so each iteration only extends paths by 1 hop in O(K·E) time and O(V) space.\n3. Advanced Bar-Raiser (Modified Dijkstra with Stop Pruning): Use a Min-Heap (cost, u, stops) and an array min_stops[u]. Only push neighbor v if stops <= K and (new_cost < best_cost[v] OR stops < min_stops[u]).`,
          },
          {
            stageIndex: 1,
            levelLabel: 'Stage 2: Intermediate Optimization',
            shortTag: '2. Intermediate',
            questionPrompt:
              'Stage 2 (Intermediate): Now let’s eliminate the exponential blowup. How can you use either K+1 iterations of Bellman-Ford (with a temporary distance array) OR a Modified Min-Heap Dijkstra that tracks `min_stops[node]` to guarantee O(K · E) or optimal priority-queue pruning?',
            socraticCheckQuestion:
              'Why is it mandatory to clone the distance array (`temp = dist.copy()`) at the start of each Bellman-Ford outer loop iteration when K is strictly bounded?',
            progressiveHints: [
              'Hint 1 ( Cascading Update Trap): Without cloning `dist` per round, relaxing edge (u->v) and then (v->w) in the same loop iteration uses 2 hops in a single round, violating the K-stop limit!',
              'Hint 2 (Modified Dijkstra Rule): In Min-Heap Dijkstra, pop (cost, u, stops). If u == dst, return cost immediately. If stops > k or stops >= min_stops[u], skip!',
              'Hint 3 (Complexity): Record `min_stops[u] = stops` whenever you pop `u` from the min-heap—since heap pops in non-decreasing order of cost, any future pop of `u` is only useful if it used strictly fewer stops.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch Baseline: Standard Dijkstra fails because it only tracks 1D distance.\n2. Intermediate Code Pattern:\n   dist = [float('inf')] * n; dist[src] = 0\n   for _ in range(k + 1):\n       nxt = dist[:]\n       for u, v, w in links:\n           if dist[u] != float('inf') and dist[u] + w < nxt[v]:\n               nxt[v] = dist[u] + w\n       dist = nxt\n3. Advanced Scale: Add dynamic link-failure circuit breakers and multi-region shard caching.`,
          },
          {
            stageIndex: 2,
            levelLabel: 'Stage 3: Advanced Bar-Raiser Complication',
            shortTag: '3. Advanced',
            questionPrompt:
              'Stage 3 (Complicated Google Bar-Raiser): Suppose link latencies fluctuate every 50ms due to live congestion AND 10% of packets are high-priority RPCs that can bypass up to M congested links by paying a fixed penalty P. How do you extend your state-space graph (3D DP / Multi-State Dijkstra) without blowing up memory across 10,000 nodes?',
            socraticCheckQuestion:
              'How does your state tuple change when you must track both `stops_remaining` (up to K) and `bypasses_used` (up to M), and how do you bit-pack or prune dominated states?',
            progressiveHints: [
              'Hint 1 (Multi-Dimensional State): Define state as (u, stops_used, bypasses_used). For each link (u, v, w), transition either normally (cost + w, stops+1, bypass) or with bypass (cost + P, stops+1, bypass+1).',
              'Hint 2 (Pareto Dominance Pruning): A state at node u is dominated if we have already visited u with <= stops AND <= bypasses at a lower cost.',
              'Hint 3 (Production Architecture): Precompute regional hub landmarks (Contraction Hierarchies) so cross-continent queries resolve in sub-millisecond SLA.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: Model multi-criteria path constraints.\n2. Intermediate: 2D state table dp[u][stops] with Bellman-Ford or Heap.\n3. Advanced Bar-Raiser: 3D Pareto-pruned Dijkstra over state (cost, node, stops, bypasses) combined with Contraction Hierarchies for 100k QPS routing.`,
          },
        ],
      },
      {
        id: 'goog_q2',
        roundType: 'System Design & Architecture',
        difficulty: 'Bar-Raiser',
        title: 'Distributed Typeahead Autocomplete for Google Search',
        interviewerPersona: 'Vikramaditya Rao (Google L6 Bar-Raiser)',
        scenarioContext:
          'Users type queries at 100,000+ QPS across India in English, Hindi, and Kannada. We must return the top-5 completions in under 50ms.',
        questionPrompt:
          'How would you design the in-memory data structure and sharding layer for low-latency prefix autocomplete? How do you avoid rebuilding the entire Trie on every keystroke or trending news spike?',
        starterCode: `# Architectural Notes / Pseudocode:\n# 1. Prefix Trie with precomputed Top-5 cached at every node\n# 2. Sharding strategy & async aggregation pipeline`,
        expectedKeyConcepts: [
          'Prefix Trie',
          'Top-K caching at node',
          'Consistent Hashing',
          'Write-behind aggregation',
          'O(L) lookup',
        ],
        hint: 'Cache the top K queries directly inside each Trie node so lookup is O(prefix_length) instead of traversing the entire subtree.',
        sampleHighScoringOutline:
          'Store top-5 completions at every Trie node for O(L) read latency. Decouple read-serving replicas from write aggregation using Kafka + MapReduce/Spark hourly snapshots plus a fast trending overlay cache.',
        progressiveStages: [
          {
            stageIndex: 0,
            levelLabel: 'Stage 1: Scratch Foundation',
            shortTag: '1. Scratch',
            questionPrompt:
              'Stage 1 (Scratch): Let’s start from scratch on a single machine. If we store 10 million search queries in a relational SQL table and run `SELECT query FROM searches WHERE query LIKE "ipl%" ORDER BY freq DESC LIMIT 5`, why does this collapse at 100,000 QPS? How does a basic Prefix Trie solve prefix lookups?',
            socraticCheckQuestion:
              'In a naive Prefix Trie of depth L, if the user types a 2-letter prefix like "in", how many subtree nodes would you have to traverse if you didn’t cache anything inside the node?',
            progressiveHints: [
              'Hint 1 (Scratch Bottleneck): A prefix like "in" has millions of descendant words; traversing the entire subtree on every keystroke takes O(Subtree_Size) which violates our 50ms SLA.',
              'Hint 2 (Node-Level Caching): What if each Trie node directly stores a min-heap or sorted list of the Top-5 most frequent completions beneath it?',
              'Hint 3 (Read Complexity): With Top-5 cached at every node, looking up a prefix of length L takes strictly O(L) pointer hops—completely independent of total dictionary size!',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: Replace slow SQL LIKE scans with an in-memory Prefix Trie.\n2. Intermediate: Cache the Top-5 completions + frequencies directly at every Trie node so read latency drops from O(N) subtree traversal to O(L) prefix length.\n3. Advanced: Shard by prefix range using Consistent Hashing, aggregate keystrokes asynchronously via Kafka + Flink, and merge a real-time "Breaking News Overlay Trie" with immutable hourly base snapshots.`,
          },
          {
            stageIndex: 1,
            levelLabel: 'Stage 2: Intermediate Optimization',
            shortTag: '2. Intermediate',
            questionPrompt:
              'Stage 2 (Intermediate): Caching Top-5 at every Trie node gives O(L) reads, but what happens on writes? If 50,000 users search "Chandrayaan" every second, updating the Trie synchronously on every search will lock memory and thrash CPU caches. How do you decouple the Read Path from the Write/Aggregation Path?',
            socraticCheckQuestion:
              'Do autocomplete suggestions need to reflect every single individual keystroke within 1 millisecond, or can we batch-aggregate query counts asynchronously?',
            progressiveHints: [
              'Hint 1 (Read/Write Separation): Never mutate the live serving Trie on every user search request! Log search events asynchronously to Kafka.',
              'Hint 2 (Sampling & Aggregation): Sample 1 in N queries (or use Count-Min Sketch / Spark Streaming) to aggregate frequency deltas every 15 minutes.',
              'Hint 3 (Zero-Downtime Swap): Build a new immutable Compressed Radix Trie snapshot offline and atomically swap pointers on read replicas.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: O(L) Prefix Trie with Top-5 cached per node.\n2. Intermediate: Decouple read replicas from write pipeline using Kafka -> stream aggregator -> offline Radix Trie builder -> blue/green memory swap.\n3. Advanced: Two-tier Lambda/Kappa overlay for sub-minute viral spikes + multi-script Unicode normalization.`,
          },
          {
            stageIndex: 2,
            levelLabel: 'Stage 3: Advanced Bar-Raiser Complication',
            shortTag: '3. Advanced',
            questionPrompt:
              'Stage 3 (Complicated Google Bar-Raiser): During an IPL final or breaking election results in India, a brand-new query spikes from 0 to 500,000 QPS in 90 seconds, AND hot-prefix shards (like "i" or "s") get 40x more traffic than rare prefixes like "z". How do you handle hot-shard skew and sub-minute viral trends simultaneously?',
            socraticCheckQuestion:
              'How can you combine a small, mutable "Real-Time Trending Overlay Trie" (updated via Apache Flink sliding windows) with your large hourly Base Trie, and how do you shard prefixes dynamically?',
            progressiveHints: [
              'Hint 1 (Two-Tier Overlay): Query both the immutable Base Trie and a tiny in-memory Real-Time Trending Trie (powered by Flink + Count-Min Sketch heavy hitters), then merge the Top-5 in O(1).',
              'Hint 2 (Prefix Range Sharding): Instead of sharding by first character (where "s" is huge and "x" is tiny), assign variable-length prefix ranges ("s", "sa", "sh", "st") to balanced consistent-hash virtual nodes.',
              'Hint 3 (Client & Edge Optimization): Debounce keystrokes by 80ms on client, cache 1-3 char prefixes in CDN/Edge Redis, and enforce safety/profanity bloom filters.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: In-memory Trie with O(L) Top-5 node cache.\n2. Intermediate: Async Kafka aggregation + Compressed Radix Trie snapshots.\n3. Advanced Bar-Raiser: Prefix-density-aware Consistent Hashing + Flink Count-Min Sketch Trending Overlay Trie + Edge CDN caching for 1-3 character prefixes.`,
          },
        ],
      },
      {
        id: 'goog_q3',
        roundType: 'Core CS (DBMS / OS / OOP)',
        difficulty: 'Medium',
        title: 'Virtual Memory Page Faults & Thread Concurrency',
        interviewerPersona: 'Vikramaditya Rao (Google L6 Bar-Raiser)',
        scenarioContext:
          'A high-throughput C++/Python worker service suddenly experiences latency spikes due to page thrashing and lock contention.',
        questionPrompt:
          'Explain what happens at the OS kernel and TLB hardware level during a Page Fault, and how you would diagnose and eliminate a Deadlock or Lock Convoy in a multi-threaded service.',
        starterCode: `# Key OS & Concurrency Invariants:\n# 1. TLB Miss -> Page Table Walk -> Page Fault Interrupt\n# 2. Coffman Deadlock conditions & Lock-Free / Ordered Locking`,
        expectedKeyConcepts: [
          'TLB',
          'Page Table',
          'Context Switch',
          'Coffman conditions',
          'Lock ordering',
          'Mutex vs Read-Write Lock',
        ],
        hint: 'Mention TLB lookup, page table walk, disk I/O page-in, and enforcing a global lock acquisition order.',
        sampleHighScoringOutline:
          'On TLB miss, MMU walks page table; if valid bit is 0, CPU traps to OS kernel, schedules disk read, blocks thread, and updates page table on interrupt. Prevent deadlocks by breaking Circular Wait via strict lock ordering.',
        progressiveStages: [
          {
            stageIndex: 0,
            levelLabel: 'Stage 1: Scratch Foundation',
            shortTag: '1. Scratch',
            questionPrompt:
              'Stage 1 (Scratch): Let’s start from the hardware basics. Why can’t every process directly use physical RAM addresses? When a CPU instruction accesses a virtual memory address, what is the exact role of the MMU and the TLB (Translation Lookaside Buffer)?',
            socraticCheckQuestion:
              'What is the difference between a Soft (Minor) Page Fault and a Hard (Major) Page Fault in terms of latency?',
            progressiveHints: [
              'Hint 1 (Hardware Lookup): CPU checks the TLB cache first (~1ns). On a TLB miss, the MMU walks the multi-level Page Table in RAM.',
              'Hint 2 (Trap to Kernel): If the Page Table Entry (PTE) has Valid Bit = 0, the CPU triggers a Page Fault trap (interrupt) into the OS kernel.',
              'Hint 3 (Minor vs Major): Minor fault means the page is already in RAM (e.g. shared library or copy-on-write); Major fault requires reading from NVMe/SSD swap, blocking the thread via context switch.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: Virtual-to-Physical translation via MMU + TLB cache -> Multi-level Page Table walk -> Kernel trap on invalid bit.\n2. Intermediate: Break Coffman's 4 Deadlock conditions (specifically Circular Wait) by enforcing a strict global lock hierarchy.\n3. Advanced: Eliminate TLB shootdowns with HugePages (2MB/1GB) and replace coarse mutexes with Read-Copy-Update (RCU) or lock-free CAS rings.`,
          },
          {
            stageIndex: 1,
            levelLabel: 'Stage 2: Intermediate Optimization',
            shortTag: '2. Intermediate',
            questionPrompt:
              'Stage 2 (Intermediate): Now suppose two worker threads freeze completely under load. State all 4 Coffman Deadlock conditions and show with concrete pseudocode how Thread 1 and Thread 2 deadlock, and how breaking Circular Wait fixes it.',
            socraticCheckQuestion:
              'Why is breaking "Circular Wait" (via global lock ordering) the most practical deadlock prevention technique in production application code compared to breaking Mutual Exclusion?',
            progressiveHints: [
              'Hint 1 (Coffman 4 Pillars): Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.',
              'Hint 2 (Deadlock Reproduction): Thread A locks Account_1 then requests Account_2; Thread B locks Account_2 then requests Account_1.',
              'Hint 3 (Deterministic Fix): Always acquire locks in ascending order of resource ID: `first = min(id1, id2); second = max(id1, id2)`.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: Identify TLB/Page Fault lifecycle.\n2. Intermediate: State Coffman's 4 conditions and enforce deterministic lock acquisition order (e.g. lock by sorted memory/account ID).\n3. Advanced: Resolve Lock Convoy & False Sharing (64-byte cache line padding) + HugePages.`,
          },
          {
            stageIndex: 2,
            levelLabel: 'Stage 3: Advanced Bar-Raiser Complication',
            shortTag: '3. Advanced',
            questionPrompt:
              'Stage 3 (Complicated Google Bar-Raiser): Even after fixing deadlocks, your 64-core server suffers from "False Sharing" across CPU L1/L2 cache lines and "TLB Shootdowns" during high-rate memory allocation. How do you diagnose and resolve both at the systems level?',
            socraticCheckQuestion:
              'What happens when two threads on different CPU cores frequently mutate independent atomic counters that happen to sit on the same 64-byte hardware cache line?',
            progressiveHints: [
              'Hint 1 (MESI Cache Coherency & False Sharing): Modifying any byte invalidates the entire 64-byte cache line on other cores. Fix by aligning/padding thread-local counters (`alignas(64)`) or sharding counters per core.',
              'Hint 2 (HugePages for TLB): Standard 4KB pages cause frequent TLB misses on multi-GB heaps; enabling 2MB Transparent HugePages drastically reduces TLB misses.',
              'Hint 3 (Thread-Caching Allocators): Use `tcmalloc` or `jemalloc` per-thread arenas so threads allocate memory without global heap mutex contention or frequent `mmap`/`munmap` TLB shootdowns.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: TLB -> Page Table -> Kernel Fault Interrupt.\n2. Intermediate: Global Lock Ordering to prevent Circular Wait deadlocks.\n3. Advanced Bar-Raiser: Cache-line padding (64B alignment) to stop MESI False Sharing, 2MB HugePages to prevent TLB thrashing, and per-thread tcmalloc arenas.`,
          },
        ],
      },
    ],
  },
  {
    id: 'tcs_prime',
    name: 'TCS Prime & Digital',
    tier: 'India Tier-1 Campus & NQT Top Track',
    role: 'Prime Systems Engineer / Digital Full-Stack',
    ctcBand: '₹7.0 – ₹11.5 LPA',
    accentColor: 'indigo',
    interviewerName: 'Rajeshwari Deshmukh',
    interviewerTitle: 'Principal Delivery Architect (TCS BFSI Practice)',
    evaluationFocus: ['DSA Implementation', 'SQL & Normalization', 'OOP Pillars', 'Project Ownership'],
    scenarios: [
      {
        id: 'tcs_q1',
        roundType: 'DSA & Problem Solving',
        difficulty: 'Medium',
        title: 'Longest Subarray with Sum K (Positive & Negative Elements)',
        interviewerPersona: 'Rajeshwari Deshmukh (TCS Prime Technical Panel)',
        scenarioContext:
          'In TCS NQT Advanced Coding, we process daily net settlement deltas (which can be positive, zero, or negative) for banking transactions.',
        questionPrompt:
          'Explain why the standard two-pointer sliding window fails when negative numbers are present, and implement the O(N) Prefix Sum + HashMap algorithm to find the length of the longest subarray summing to K.',
        starterCode: `def longest_subarray_sum_k(arr: list[int], k: int) -> int:\n    prefix_map = {}\n    curr_sum = 0\n    max_len = 0\n    # Complete the O(N) implementation\n    return max_len`,
        expectedKeyConcepts: [
          'Prefix Sum',
          'HashMap',
          'Negative numbers',
          'First occurrence index',
          'O(N) time',
          'O(N) space',
        ],
        hint: 'Store only the earliest index of each prefix_sum in the dictionary so the subarray length (i - first_idx) is maximized.',
        sampleHighScoringOutline:
          'Sliding window assumes monotonicity (expanding increases sum). With negatives, use a HashMap storing the first index of each cumulative sum. If (curr_sum - k) exists in map, update max_len = max(max_len, i - map[curr_sum - k]).',
        progressiveStages: [
          {
            stageIndex: 0,
            levelLabel: 'Stage 1: Scratch Foundation',
            shortTag: '1. Scratch',
            questionPrompt:
              'Stage 1 (Scratch): Start from the basics. How would you check every possible subarray using two nested loops (Brute Force), what is its Time Complexity, and why does the popular Two-Pointer Sliding Window break down as soon as the array contains negative numbers?',
            socraticCheckQuestion:
              'In a sliding window `[left..right]`, we shrink `left++` when `sum > K` assuming that shrinking will decrease the sum. What happens if `arr[left]` or future elements are negative?',
            progressiveHints: [
              'Hint 1 (Brute Force from Scratch): Two nested loops `for i in range(n): for j in range(i, n)` compute subarray sums in O(N^2) time and O(1) space.',
              'Hint 2 (Why Sliding Window Fails): Sliding window relies on monotonic sums (adding elements increases sum). With negative numbers, extending `right` might later reduce a sum back down to K!',
              'Hint 3 (Prefix Sum Identity): Notice that `sum(arr[j+1 .. i]) == K` is algebraically identical to `prefix_sum[i] - prefix_sum[j] == K`, which means `prefix_sum[j] == prefix_sum[i] - K`.',
            ],
            stepByStepScratchToAdvancedSolution:
              '1. Scratch: O(N^2) nested loops baseline; explain that two-pointer sliding window fails because negative numbers break sum monotonicity.\n2. Intermediate: Use Prefix Sum + HashMap storing {prefix_sum: earliest_index}. At index i, check if (curr_sum - k) is in the map -> O(N) Time, O(N) Space.\n3. Advanced: Handle streaming 64-bit overflow, zero-sum segments, and Count of Subarrays with Sum K + Modulo arithmetic.',
          },
          {
            stageIndex: 1,
            levelLabel: 'Stage 2: Intermediate Optimization',
            shortTag: '2. Intermediate',
            questionPrompt:
              'Stage 2 (Intermediate): Now write the O(N) Prefix Sum + HashMap solution. Suppose the array has zeros or negative numbers that cause the SAME `curr_sum` to appear at index 2 and again at index 5. Should you overwrite `prefix_map[curr_sum]` with index 5 or keep index 2?',
            socraticCheckQuestion:
              'Since we want the LONGEST subarray `i - j`, do we want `j` (the earlier prefix index) to be as small (leftmost) as possible or as large as possible?',
            progressiveHints: [
              'Hint 1 (Earliest Index Invariant): Never overwrite an existing `curr_sum` in `prefix_map`! Only insert `if curr_sum not in prefix_map: prefix_map[curr_sum] = i`.',
              'Hint 2 (Base Case for Prefix Starting at Index 0): Initialize `prefix_map = {0: -1}` (or check `if curr_sum == k: max_len = i + 1`) so subarrays starting at index 0 are counted accurately.',
              'Hint 3 (Complexity): Every element is visited once with O(1) hash lookup -> Time O(N), Auxiliary Space O(N).',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: Derive prefix_sum[i] - prefix_sum[j] = K.\n2. Intermediate Code:\n   prefix_map = {0: -1}\n   curr_sum = max_len = 0\n   for i, num in enumerate(arr):\n       curr_sum += num\n       if (curr_sum - k) in prefix_map:\n           max_len = max(max_len, i - prefix_map[curr_sum - k])\n       if curr_sum not in prefix_map:\n           prefix_map[curr_sum] = i\n3. Advanced: Adapt to 2D Matrix Submatrix with Sum K or Longest Subarray with Sum Divisible by K.`,
          },
          {
            stageIndex: 2,
            levelLabel: 'Stage 3: Advanced Bar-Raiser Complication',
            shortTag: '3. Advanced',
            questionPrompt:
              'Stage 3 (Complicated TCS Prime Challenge): Now let’s twist the problem: Instead of exact sum K, how do you find (A) the Longest Subarray whose sum is DIVISIBLE by K (even when elements are negative), and (B) the Shortest Subarray with Sum AT LEAST K when negative numbers exist?',
            socraticCheckQuestion:
              'For divisibility by K with negative prefix sums, why must you normalize the remainder as `((curr_sum % k) + k) % k` in languages like C++/Java, and why does Shortest Subarray >= K require a Monotonic Increasing Deque?',
            progressiveHints: [
              'Hint 1 (Modulo Arithmetic with Negatives): If `prefix[i] % k == prefix[j] % k`, their difference is divisible by K. Always normalize negative remainders into `[0, k-1]`.',
              'Hint 2 (Monotonic Deque for Shortest Subarray >= K): Maintain a deque of indices with strictly increasing `prefix_sum`. Pop from front while `curr_sum - prefix[dq[0]] >= K` to record shortest length.',
              'Hint 3 (Why Pop Back of Deque): If `curr_sum <= prefix[dq[-1]]`, the older index `dq[-1]` has a larger prefix sum AND is further left, so it can never beat `i` for future indices—pop it!',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: O(N^2) brute force -> Prefix Sum identity.\n2. Intermediate: O(N) HashMap preserving earliest index for exact sum K.\n3. Advanced Bar-Raiser: Normalized modulo remainders for Divisible-by-K, and O(N) Monotonic Increasing Deque over Prefix Sums for Shortest Subarray >= K.`,
          },
        ],
      },
      {
        id: 'tcs_q2',
        roundType: 'Core CS (DBMS / OS / OOP)',
        difficulty: 'Medium',
        title: 'SQL Window Functions, 3NF vs BCNF & ACID Properties',
        interviewerPersona: 'Rajeshwari Deshmukh (TCS Prime Technical Panel)',
        scenarioContext:
          'Our enterprise banking database needs a query to find the 2nd highest salary in every department without losing ties, alongside strict transaction guarantees.',
        questionPrompt:
          'Write the SQL query using DENSE_RANK() partitioned by department, contrast RANK() vs DENSE_RANK(), and explain how ACID isolation levels prevent Dirty Reads.',
        starterCode: `WITH RankedSalaries AS (\n  SELECT emp_name, dept_id, salary,\n         DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) as rnk\n  FROM employees\n)\nSELECT emp_name, dept_id, salary FROM RankedSalaries WHERE rnk = 2;`,
        expectedKeyConcepts: [
          'DENSE_RANK',
          'PARTITION BY',
          'ACID',
          'Read Committed',
          'Dirty Read',
          'BCNF',
        ],
        hint: 'DENSE_RANK does not skip rank numbers after ties, whereas RANK skips.',
        sampleHighScoringOutline:
          'Use CTE with DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) and filter rnk = 2. Explain Atomicity, Consistency, Isolation (Read Committed blocks uncommitted dirty reads), and Durability (WAL logs).',
        progressiveStages: [
          {
            stageIndex: 0,
            levelLabel: 'Stage 1: Scratch Foundation',
            shortTag: '1. Scratch',
            questionPrompt:
              'Stage 1 (Scratch): Before using Window Functions, how would you find the global 2nd highest salary using a simple `MAX()` subquery from scratch? And why does `LIMIT 1 OFFSET 1` fail when multiple employees tie for the highest salary or when we need it per department?',
            socraticCheckQuestion:
              'If two employees in Dept 10 both earn ₹1,00,000 (tied for 1st) and the next employee earns ₹90,000, what rank number do `ROW_NUMBER()`, `RANK()`, and `DENSE_RANK()` assign to ₹90,000?',
            progressiveHints: [
              'Hint 1 (Scratch Subquery): `SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)` works globally, but is clumsy for Nth highest per department.',
              'Hint 2 (Ranking Ties): For salaries `[100k, 100k, 90k]`, `ROW_NUMBER` gives `[1, 2, 3]`, `RANK` skips after ties `[1, 1, 3]`, and `DENSE_RANK` gives `[1, 1, 2]`.',
              'Hint 3 (Why DENSE_RANK Wins): If we filter `WHERE rnk = 2`, `RANK()` would return zero rows whenever there is a tie for 1st place! `DENSE_RANK()` guarantees we get the true 2nd distinct salary.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: Compare correlated subquery vs Window Functions (` +
              '`ROW_NUMBER`, `RANK`, `DENSE_RANK`' +
              `).\n2. Intermediate: Write CTE with ` +
              '`DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC)`' +
              ` and explain 3NF vs BCNF + ACID isolation levels.\n3. Advanced: Optimize execution plan with composite covering index ` +
              '`(dept_id, salary DESC) INCLUDE (emp_name)`' +
              ` and MVCC Snapshot Isolation.`,
          },
          {
            stageIndex: 1,
            levelLabel: 'Stage 2: Intermediate Optimization',
            shortTag: '2. Intermediate',
            questionPrompt:
              'Stage 2 (Intermediate): Write the complete `DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC)` CTE query. Then explain: (1) Why can’t we put `WHERE DENSE_RANK() = 2` directly in the same SELECT without a CTE/subquery, and (2) How does `READ COMMITTED` vs `REPEATABLE READ` prevent Dirty and Non-Repeatable Reads?',
            socraticCheckQuestion:
              'In SQL logical query processing order (`FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY`), when are Window Functions evaluated?',
            progressiveHints: [
              'Hint 1 (SQL Execution Order): `WHERE` executes BEFORE `SELECT` window functions are computed, so an outer query or CTE (`WITH Ranked AS (...)`) is mandatory.',
              'Hint 2 (Isolation Anomalies): Dirty Read = reading uncommitted data from another transaction (fixed by `READ COMMITTED`). Non-Repeatable Read = reading the same row twice and getting different committed values (fixed by `REPEATABLE READ`).',
              'Hint 3 (3NF vs BCNF): In 3NF, non-prime attributes depend only on superkeys. BCNF is stricter: for EVERY functional dependency `X -> Y`, `X` must be a superkey.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: Contrast ROW_NUMBER, RANK, DENSE_RANK on tied data.\n2. Intermediate: CTE query + SQL execution order + ACID Isolation matrix (Read Uncommitted, Read Committed, Repeatable Read, Serializable).\n3. Advanced: Composite B+ Tree index avoids sort operator + Write-Ahead Logging (WAL) & MVCC.`,
          },
          {
            stageIndex: 2,
            levelLabel: 'Stage 3: Advanced Bar-Raiser Complication',
            shortTag: '3. Advanced',
            questionPrompt:
              'Stage 3 (Complicated Banking Architect Scenario): Suppose `employees` has 50 million rows and your `DENSE_RANK()` query causes a full-table disk sort taking 12 seconds. Simultaneously, two concurrent banking transactions suffer a "Write Skew" anomaly even under `REPEATABLE READ` (Snapshot Isolation). How do you fix both?',
            socraticCheckQuestion:
              'Which exact B+ Tree composite index eliminates the `Sort` operator in the `OVER (PARTITION BY dept_id ORDER BY salary DESC)` window plan, and what is Write Skew?',
            progressiveHints: [
              'Hint 1 (Covering Index): Create `CREATE INDEX idx_dept_sal ON employees (dept_id ASC, salary DESC) INCLUDE (emp_name)`. The engine reads rows already pre-partitioned and pre-sorted in index order!',
              'Hint 2 (Write Skew under Snapshot Isolation): Two doctors on call check `count(on_call) >= 2` simultaneously and both update their own row to `on_call = false`, leaving 0 doctors on call because neither modified the same row.',
              'Hint 3 (Preventing Write Skew): Use `SERIALIZABLE` isolation (SSI) or explicit `SELECT ... FOR UPDATE` pessimistic row locking on the parent shift/department record.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: Subquery vs Window Function fundamentals.\n2. Intermediate: DENSE_RANK CTE + 3NF/BCNF + standard ACID isolation levels.\n3. Advanced Bar-Raiser: Covering B+ Tree Index (dept_id, salary DESC) for zero-sort window scan + Serializable Snapshot Isolation (SSI) / SELECT FOR UPDATE to prevent Write Skew.`,
          },
        ],
      },
    ],
  },
  {
    id: 'flipkart_razorpay',
    name: 'Flipkart & Razorpay',
    tier: 'Indian Product Unicorn (Bengaluru)',
    role: 'SDE-1 (Backend & Distributed Payments)',
    ctcBand: '₹24.0 – ₹32.5 LPA',
    accentColor: 'amber',
    interviewerName: 'Siddharth Menon',
    interviewerTitle: 'Engineering Manager (Checkout & Flash Sale Concurrency)',
    evaluationFocus: ['Idempotency & Concurrency', 'Machine Coding SOLID', 'Rate Limiting', 'Low-Latency DSA'],
    scenarios: [
      {
        id: 'flip_q1',
        roundType: 'System Design & Architecture',
        difficulty: 'Hard',
        title: 'Big Billion Days Flash Sale Inventory & Double-Payment Prevention',
        interviewerPersona: 'Siddharth Menon (Flipkart / Razorpay Bar-Raiser)',
        scenarioContext:
          '50,000 users click "Buy Now" in the same millisecond for 100 units of a smartphone, while network retries send duplicate UPI webhook callbacks.',
        questionPrompt:
          'How do you prevent overselling inventory under extreme concurrency AND ensure a customer is never charged twice if the payment gateway retries the webhook?',
        starterCode: `-- Option A: Optimistic / Pessimistic Locking or Redis Lua Atomic Decrement\n-- Option B: Idempotency-Key header + Unique DB Constraint`,
        expectedKeyConcepts: [
          'Idempotency Key',
          'Redis Lua atomic decrement',
          'Optimistic Locking',
          'SELECT FOR UPDATE',
          'Distributed Lock',
        ],
        hint: 'Combine Redis atomic DECR for fast gatekeeping at the edge with an Idempotency-Key unique index in PostgreSQL.',
        sampleHighScoringOutline:
          'Use Redis Lua script to atomically check and decrement stock in O(1) memory, reserve inventory with a 10-minute TTL, and enforce an Idempotency-Key unique constraint on the orders/payments table to make retries safe no-ops.',
        progressiveStages: [
          {
            stageIndex: 0,
            levelLabel: 'Stage 1: Scratch Foundation',
            shortTag: '1. Scratch',
            questionPrompt:
              'Stage 1 (Scratch): Let’s start from scratch. Why does the naive application code `qty = db.get(item_id); if qty > 0: db.update(qty - 1)` oversell 100 phones to 5,000 buyers under concurrency? Show the exact Race Condition (Time-of-Check to Time-of-Use).',
            socraticCheckQuestion:
              'If 500 threads execute `SELECT stock FROM inventory WHERE id = 1` at the exact same microsecond before any `UPDATE` commits, what value of `stock` do all 500 threads read?',
            progressiveHints: [
              'Hint 1 (Race Condition from Scratch): All 500 threads read `stock = 100` simultaneously and proceed to create orders, resulting in -400 inventory!',
              'Hint 2 (Database Atomic Guard): Even in a single SQL query, `UPDATE inventory SET stock = stock - 1 WHERE id = 1 AND stock > 0` uses row-level locking so `stock` never drops below 0.',
              'Hint 3 (Optimistic vs Pessimistic): Contrast `SELECT ... FOR UPDATE` (Pessimistic lock) vs `WHERE id = 1 AND version = v` (Optimistic concurrency control).',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: Identify the Read-Modify-Write TOCTOU race condition and fix it at the SQL level using atomic ` +
              '`UPDATE ... WHERE stock > 0`' +
              ` or Optimistic/Pessimistic locking.\n2. Intermediate: Offload 50,000 QPS flash-sale spikes from PostgreSQL using a single-threaded Redis Lua atomic decrement script + Idempotency-Key unique constraint for UPI webhooks.\n3. Advanced: Handle 10-minute abandoned-cart TTL stock release via delayed queues and distributed Saga reconciliation.`,
          },
          {
            stageIndex: 1,
            levelLabel: 'Stage 2: Intermediate Optimization',
            shortTag: '2. Intermediate',
            questionPrompt:
              'Stage 2 (Intermediate): If 50,000 users hit PostgreSQL `UPDATE inventory SET stock = stock - 1 WHERE id = 1` on the same hot row, the database CPU will melt from row-lock contention. How do you gatekeep inventory in Redis using an atomic Lua script, and how do you guarantee UPI payment webhook idempotency?',
            socraticCheckQuestion:
              'Why is a Redis Lua script (`EVAL`) guaranteed to execute atomically without race conditions, and what happens when a duplicate UPI webhook arrives with the same `Idempotency-Key`?',
            progressiveHints: [
              'Hint 1 (Redis Lua Atomicity): Redis executes Lua scripts single-threadedly as one atomic transaction: check `if tonumber(redis.call("GET", k)) > 0 then return redis.call("DECR", k) end`.Only the winning 100 requests ever touch PostgreSQL!',
              'Hint 2 (Idempotency Key Lifecycle): Store `idempotency_key VARCHAR UNIQUE` in the `payments` table. On `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING`, return the cached payment status.',
              'Hint 3 (Concurrent Webhook Lock): Take a short Redis lock `SETNX lock:webhook:{txn_id}` while processing the first webhook so simultaneous retries wait or return 200 OK safely.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: Prevent TOCTOU race condition.\n2. Intermediate: Gatekeep hot flash-sale SKU in Redis Lua (` +
              '`GET > 0 -> DECR`' +
              `) + enforce ` +
              '`UNIQUE(idempotency_key)`' +
              ` in PostgreSQL.\n3. Advanced: Abandoned-cart TTL inventory restoration + Outbox Pattern for crash recovery.`,
          },
          {
            stageIndex: 2,
            levelLabel: 'Stage 3: Advanced Bar-Raiser Complication',
            shortTag: '3. Advanced',
            questionPrompt:
              'Stage 3 (Complicated Flipkart/Razorpay Bar-Raiser): Suppose 30 of the 100 customers who reserved the phone in Redis close their app during the UPI PIN screen, OR the UPI webhook arrives 12 minutes late AFTER the 10-minute cart reservation TTL expired. How do you design the state machine so stock is neither permanently leaked nor double-allocated?',
            socraticCheckQuestion:
              'What happens if a reservation expires at minute 10:00 (releasing the phone to Buyer B), and at minute 10:05 the bank sends a delayed `PAYMENT_SUCCESS` webhook for Buyer A?',
            progressiveHints: [
              'Hint 1 (Two-Phase Reservation State Machine): States: `RESERVED (TTL 10m) -> PAYMENT_PENDING -> CONFIRMED` or `EXPIRED -> RELEASED`. Use a delayed queue / ZSET reaper to restore expired reservations back to Redis only if state is still `RESERVED`.',
              'Hint 2 (Late Webhook Fencing Token): Before releasing stock at minute 10:00, transition the DB order row `UPDATE orders SET status = "EXPIRED" WHERE id = X AND status = "RESERVED"`.',
              'Hint 3 (Automated Refund Saga): If a late `PAYMENT_SUCCESS` webhook arrives for an `EXPIRED` order, the state machine rejects order fulfillment and automatically triggers an idempotent `INSTANT_REFUND` job.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: Atomic SQL update vs TOCTOU race.\n2. Intermediate: Redis Lua atomic stock gatekeeper + Unique Idempotency-Key.\n3. Advanced Bar-Raiser: Two-Phase Reservation TTL Reaper + Transactional Outbox + Late-Webhook Fencing with Automated Refund Saga.`,
          },
        ],
      },
      {
        id: 'flip_q2',
        roundType: 'DSA & Problem Solving',
        difficulty: 'Hard',
        title: 'LRU Cache with TTL Expiry for API Gateway',
        interviewerPersona: 'Siddharth Menon (Flipkart / Razorpay Bar-Raiser)',
        scenarioContext:
          'Our API gateway caches merchant configuration objects. Lookups, insertions, and evictions must all run in O(1) average time.',
        questionPrompt:
          'Design and code an O(1) LRU Cache using a Doubly Linked List and HashMap. Explain how pointers are updated on get(key) and put(key, value).',
        starterCode: `class Node:\n    def __init__(self, k, v):\n        self.k, self.v = k, v\n        self.prev = self.next = None\n\nclass LRUCache:\n    def __init__(self, capacity: int):\n        self.cap = capacity\n        self.cache = {}\n        # Initialize dummy head and tail`,
        expectedKeyConcepts: [
          'Doubly Linked List',
          'HashMap',
          'Dummy Head and Tail',
          'O(1) get and put',
          'Thread safety',
        ],
        hint: 'Use dummy head and tail sentinel nodes so you never have to check for null pointers when removing or inserting a node.',
        sampleHighScoringOutline:
          'HashMap maps key -> DLL Node. Dummy head.next is LRU, dummy tail.prev is MRU. On get(key), remove node and insert before tail in O(1). On capacity overflow, evict head.next and delete its key from the HashMap.',
        progressiveStages: [
          {
            stageIndex: 0,
            levelLabel: 'Stage 1: Scratch Foundation',
            shortTag: '1. Scratch',
            questionPrompt:
              'Stage 1 (Scratch): Why can’t a single HashMap alone OR a single Singly Linked List alone support both `get(key)` and `put(key, value)` in O(1) time? Walk me through why we need a Doubly Linked List paired with a HashMap.',
            socraticCheckQuestion:
              'If you have a pointer to a node in the middle of a Singly Linked List, why can’t you delete that node in O(1) time when it becomes the Most Recently Used?',
            progressiveHints: [
              'Hint 1 (HashMap Limitation): A HashMap gives O(1) key lookup, but has no ordering to tell you which item was Least Recently Used in O(1).',
              'Hint 2 (Singly vs Doubly Linked List): Deleting a node in a Linked List requires updating `node.prev.next = node.next`. Without a `prev` pointer (Doubly Linked List), finding the predecessor takes O(N) traversal!',
              'Hint 3 (Why Store `key` Inside `Node`): When capacity is full and we evict `head.next` (the LRU node), we must also delete its entry from `self.cache[lru.k]`—so every `Node` must store both `k` and `v`.',
            ],
            stepByStepScratchToAdvancedSolution:
              '1. Scratch: Combine HashMap (key -> Node for O(1) lookup) with Doubly Linked List (O(1) splice/move to MRU).\n2. Intermediate: Write two clean helper methods _remove(node) and _insert_mru(node) using Dummy Head & Dummy Tail sentinels so zero null checks are needed.\n3. Advanced: Add O(1) TTL expiration and Sharded Read-Write Locks (Striped Locking) for multi-threaded API gateways.',
          },
          {
            stageIndex: 1,
            levelLabel: 'Stage 2: Intermediate Optimization',
            shortTag: '2. Intermediate',
            questionPrompt:
              'Stage 2 (Intermediate): Now implement the clean O(1) `LRUCache` in code using Dummy `head` and Dummy `tail` sentinel nodes. Write out the exact 2-line pointer manipulation for `_remove(node)` and 4-line manipulation for `_insert_before_tail(node)`.',
            socraticCheckQuestion:
              'In `put(key, value)`, what edge case happens if `key` ALREADY exists in the cache when `len(cache) == capacity`?',
            progressiveHints: [
              'Hint 1 (Sentinel Setup): `self.head.next = self.tail` and `self.tail.prev = self.head`. Dummy nodes eliminate all `if node.prev is None` edge cases!',
              'Hint 2 (Helper Functions): In `_remove(node)`: `p, n = node.prev, node.next; p.next = n; n.prev = p`. In `_insert(node)` right before `tail`: `p = self.tail.prev; p.next = node; node.prev = p; node.next = self.tail; self.tail.prev = node`.',
              'Hint 3 (Existing Key Edge Case): In `put(k, v)`, if `k in self.cache`, first `_remove(self.cache[k])` before inserting the updated node—otherwise you might falsely trigger capacity eviction!',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: Justify HashMap + DLL.\n2. Intermediate Code:\n   def _remove(self, node):\n       p, n = node.prev, node.next\n       p.next, n.prev = n, p\n   def _insert(self, node):\n       p = self.tail.prev\n       p.next = self.tail.prev = node\n       node.prev, node.next = p, self.tail\n3. Advanced: TTL expiry + Concurrency Striping.`,
          },
          {
            stageIndex: 2,
            levelLabel: 'Stage 3: Advanced Bar-Raiser Complication',
            shortTag: '3. Advanced',
            questionPrompt:
              'Stage 3 (Complicated Unicorn Bar-Raiser): In our production API Gateway, every `get(key)` mutates the Doubly Linked List pointers, which means even read operations require a global Mutex lock! How do you (A) add per-key TTL expiry, and (B) scale this LRU Cache across 32 CPU threads without a global lock bottleneck?',
            socraticCheckQuestion:
              'How does "Lock Striping" (sharding the cache into N independent segments via `hash(key) % 16`) combined with buffered read-ring queues (like Java Caffeine / Guava Cache) eliminate lock contention?',
            progressiveHints: [
              'Hint 1 (Lazy + Periodic TTL Expiry): Store `expiry_ts` in `Node`. On `get(k)`, if `now > node.expiry_ts`, lazily `_remove(node)` and return `-1`. If all items share a fixed TTL, a secondary TTL Doubly Linked List is naturally sorted by expiration time!',
              'Hint 2 (Segmented Lock Striping): Partition the capacity across 16 or 32 independent `LRUCacheShard` instances selected by `hash(key) & 15`, reducing lock contention by 16x.',
              'Hint 3 (Lock-Free Read Buffer): Instead of mutating DLL pointers on every `get()`, append read hits to a lock-free ring buffer and replay pointer updates in batches.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: HashMap + Doubly Linked List invariant.\n2. Intermediate: Bug-free Sentinel Head/Tail O(1) implementation.\n3. Advanced Bar-Raiser: Lazy + Time-Wheel TTL eviction, 16-way Lock Striping (` +
              '`hash(key) % 16`' +
              `), and buffered read-access ring logs.`,
          },
        ],
      },
    ],
  },
  {
    id: 'infosys_sp_zoho',
    name: 'Infosys SP & Zoho',
    tier: 'Specialist Programmer & Product Craft',
    role: 'Specialist Programmer (SP) / Member Technical Staff',
    ctcBand: '₹9.5 – ₹21.0 LPA',
    accentColor: 'cyan',
    interviewerName: 'Aravindhan Subramanian',
    interviewerTitle: 'Principal Architect (Zoho Chennai / Infosys SP Panel)',
    evaluationFocus: ['Zero-Library Algorithmic Logic', 'Dynamic Programming', 'Low-Level OOP Design', 'Edge-Case Testing'],
    scenarios: [
      {
        id: 'zoho_q1',
        roundType: 'DSA & Problem Solving',
        difficulty: 'Hard',
        title: 'Trapping Rain Water & O(1) Space Two-Pointer Optimization',
        interviewerPersona: 'Aravindhan Subramanian (Infosys SP / Zoho Panel)',
        scenarioContext:
          'In Round 2 & 3 coding interviews, we test whether you can optimize an O(N) auxiliary-space array solution down to O(1) space.',
        questionPrompt:
          'Given an elevation map array, compute how much water can be trapped after raining. First state the O(N) prefix/suffix max approach, then optimize it to O(1) auxiliary space using two pointers.',
        starterCode: `def trap_rain_water(height: list[int]) -> int:\n    left, right = 0, len(height) - 1\n    left_max = right_max = water = 0\n    # Complete the O(1) space two-pointer loop\n    return water`,
        expectedKeyConcepts: [
          'Two Pointers',
          'left_max and right_max',
          'O(N) time',
          'O(1) auxiliary space',
          'Bottleneck invariant',
        ],
        hint: 'Water trapped at any index depends on min(left_max, right_max). Advance whichever side currently has the smaller height.',
        sampleHighScoringOutline:
          'Maintain left, right pointers and left_max, right_max. If height[left] <= height[right], water at left is bounded by left_max; add max(0, left_max - height[left]) and increment left. Otherwise process right. Time O(N), Space O(1).',
        progressiveStages: [
          {
            stageIndex: 0,
            levelLabel: 'Stage 1: Scratch Foundation',
            shortTag: '1. Scratch',
            questionPrompt:
              'Stage 1 (Scratch): Forget the whole terrain for a moment and focus on a SINGLE bar at index `i` with height `height[i]`. What is the exact formula for how many units of water can sit directly on top of index `i`?',
            socraticCheckQuestion:
              'If the tallest wall to the left of index `i` has height 5, the tallest wall to the right has height 8, and `height[i]` itself is 2, how much water sits at index `i` and why?',
            progressiveHints: [
              'Hint 1 (Single-Column Formula): Water at index `i` is determined by the shorter of the two surrounding tallest walls: `max(0, min(max_left[i], max_right[i]) - height[i])`.',
              'Hint 2 (Brute Force vs Precomputation): Computing `max_left` and `max_right` from scratch for every `i` takes O(N^2) time.',
              'Hint 3 (O(N) Space Precomputation): By precomputing a prefix array `left_max[i]` and suffix array `right_max[i]`, we reduce Time to O(N), using O(N) auxiliary memory.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: Water at index i = max(0, min(tallest_left, tallest_right) - height[i]). Naive scan is O(N^2).\n2. Intermediate: Precompute prefix_max[] and suffix_max[] arrays in O(N) time and O(N) space, then eliminate the arrays using Two Pointers (left, right) for O(1) auxiliary space.\n3. Advanced: Generalize to 3D Trapping Rain Water II on an M×N grid using a Min-Heap boundary flood-fill in O(M·N log(M·N)).`,
          },
          {
            stageIndex: 1,
            levelLabel: 'Stage 2: Intermediate Optimization',
            shortTag: '2. Intermediate',
            questionPrompt:
              'Stage 2 (Intermediate): Now let’s eliminate the O(N) `left_max[]` and `right_max[]` arrays! Using two pointers `left = 0` and `right = n - 1` and two scalar variables `left_max` and `right_max`, prove WHY we already know the exact bottleneck at `left` whenever `height[left] <= height[right]`—even without knowing the tallest bar in the middle!',
            socraticCheckQuestion:
              'If `height[left] <= height[right]`, we know there is a wall at `right` that is at least as tall as `height[left]` (and `left_max`). Why does that guarantee `min(left_max, true_right_max) == left_max`?',
            progressiveHints: [
              'Hint 1 (The Bottleneck Proof): Since we only move `left` when `height[left] <= height[right]`, `true_right_max` is guaranteed to be `>= height[right] >= left_max`. Thus `left_max` is strictly the smaller bottleneck!',
              'Hint 2 (Loop Condition): While `left < right`: if `height[left] <= height[right]`, update `left_max = max(left_max, height[left])`, add `left_max - height[left]` to `water`, and `left += 1`.',
              'Hint 3 (Symmetric Right Step): Otherwise (`height[right] < height[left]`), update `right_max = max(right_max, height[right])`, add `right_max - height[right]` to `water`, and `right -= 1`.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: Column water formula min(L, R) - h[i].\n2. Intermediate O(1) Space Code:\n   left, right = 0, len(height) - 1\n   left_max = right_max = water = 0\n   while left < right:\n       if height[left] <= height[right]:\n           left_max = max(left_max, height[left])\n           water += left_max - height[left]\n           left += 1\n       else:\n           right_max = max(right_max, height[right])\n           water += right_max - height[right]\n           right -= 1\n3. Advanced: 2D Grid Rain Water II with Min-Heap.`,
          },
          {
            stageIndex: 2,
            levelLabel: 'Stage 3: Advanced Bar-Raiser Complication',
            shortTag: '3. Advanced',
            questionPrompt:
              'Stage 3 (Complicated Infosys SP / Zoho Round 3): What if the elevation map is a 2D terrain grid `heightMap[M][N]` (Trapping Rain Water in 3D), OR what if individual bars in 1D have "leaky drains" at height 0? Why do 4-directional prefix/suffix scans fail on a 2D grid, and how does a Min-Heap boundary flood-fill solve it?',
            socraticCheckQuestion:
              'In a 2D grid, water can snake around a diagonal or L-shaped canyon path. Which outer boundary cell determines the water level of the entire interior basin first?',
            progressiveHints: [
              'Hint 1 (Why 4-Way Scans Fail in 2D): Water is not restricted to straight row/column lines; a low cell on Row 3 might drain sideways through Column 4 to the border.',
              'Hint 2 (Shortest Boundary Principle): Push all border cells of the M×N matrix into a Min-Heap `(height, r, c)` and mark them visited. The lowest cell on the current perimeter always dictates the water level of its inward neighbors!',
              'Hint 3 (Inward Flood-Fill): Pop the minimum boundary `(h, r, c)`. For each unvisited neighbor `(nr, nc)`, trapped water is `max(0, h - heightMap[nr][nc])`, and push `(max(h, heightMap[nr][nc]), nr, nc)` into the Min-Heap.',
            ],
            stepByStepScratchToAdvancedSolution:
              `1. Scratch: 1D column formula min(L, R) - h[i].\n2. Intermediate: 1D Two-Pointer O(N) Time, O(1) Space proof & implementation.\n3. Advanced Bar-Raiser: 2D Matrix Trapping Rain Water II using a Priority Queue (Min-Heap) shrinking boundary inward in O(M·N log(M·N)) time.`,
          },
        ],
      },
    ],
  },
];

export const MockInterviewModule: React.FC<MockInterviewModuleProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onLogStudyMinutes,
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(COMPANY_INTERVIEW_TRACKS[0].id);
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState<number>(0);

  const selectedCompany = useMemo(
    () => COMPANY_INTERVIEW_TRACKS.find((c) => c.id === selectedCompanyId) || COMPANY_INTERVIEW_TRACKS[0],
    [selectedCompanyId]
  );

  const activeScenario = useMemo(
    () => selectedCompany.scenarios[selectedScenarioIdx] || selectedCompany.scenarios[0],
    [selectedCompany, selectedScenarioIdx]
  );

  // Progressive Scratch -> Intermediate -> Advanced stage state
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [unlockedHintsCount, setUnlockedHintsCount] = useState<number>(0);
  const [attemptCountMap, setAttemptCountMap] = useState<Record<string, number>>({});
  const [manualSolutionUnlockedMap, setManualSolutionUnlockedMap] = useState<Record<string, boolean>>({});

  // Face-to-Face Video Camera state
  const [faceToFaceActive, setFaceToFaceActive] = useState<boolean>(false);
  const [cameraStreamActive, setCameraStreamActive] = useState<boolean>(false);
  const [cameraSimulatedMode, setCameraSimulatedMode] = useState<boolean>(false);
  const [eyeContactScore, setEyeContactScore] = useState<number>(94);
  const [interviewerSpeaking, setInterviewerSpeaking] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [candidateAnswer, setCandidateAnswer] = useState<string>('');
  const [codeSubmission, setCodeSubmission] = useState<string>(activeScenario.starterCode);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, TurnFeedback>>({});
  const [followUpReply, setFollowUpReply] = useState<string>('');
  const [followUpSubmitted, setFollowUpSubmitted] = useState<boolean>(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Voice & Timer states
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);

  const activeStage: ProgressiveLearningStage = useMemo(() => {
    const stages = activeScenario.progressiveStages || [];
    return (
      stages[currentStageIdx] ||
      stages[0] || {
        stageIndex: 0,
        levelLabel: 'Stage 1: Scratch Foundation',
        shortTag: '1. Scratch',
        questionPrompt: activeScenario.questionPrompt,
        socraticCheckQuestion: 'Start from scratch: What is the simplest baseline approach and its time/space complexity?',
        progressiveHints: [
          activeScenario.hint,
          `Focus on key invariants: ${activeScenario.expectedKeyConcepts.slice(0, 3).join(', ')}`,
          'State both worst-case Time Complexity and Auxiliary Space Complexity.',
        ],
        stepByStepScratchToAdvancedSolution: activeScenario.sampleHighScoringOutline,
      }
    );
  }, [activeScenario, currentStageIdx]);

  useEffect(() => {
    setCodeSubmission(activeScenario.starterCode);
    setCurrentStageIdx(0);
    setUnlockedHintsCount(0);
    setFollowUpReply('');
    setFollowUpSubmitted(false);
  }, [activeScenario]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Clean up webcam stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const toggleFaceToFaceCamera = async () => {
    if (faceToFaceActive) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setCameraStreamActive(false);
      setCameraSimulatedMode(false);
      setFaceToFaceActive(false);
      return;
    }

    setFaceToFaceActive(true);
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        mediaStreamRef.current = stream;
        setCameraStreamActive(true);
        setCameraSimulatedMode(false);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }, 100);
        setStatusToast('📹 Live Face-to-Face Interview Camera connected! Maintain eye contact and think aloud.');
        setTimeout(() => setStatusToast(null), 3500);
        return;
      } catch {
        // Fallback to simulated face-to-face studio mode if camera permission is denied in iframe
      }
    }

    setCameraStreamActive(false);
    setCameraSimulatedMode(true);
    setEyeContactScore(96);
    setStatusToast('📹 Face-to-Face Interview Studio Active! Socratic Anti-Spoiler Mode enabled.');
    setTimeout(() => setStatusToast(null), 3500);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const speakText = (text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      utterance.lang = 'en-IN';
      utterance.onstart = () => setInterviewerSpeaking(true);
      utterance.onend = () => setInterviewerSpeaking(false);
      utterance.onerror = () => setInterviewerSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setInterviewerSpeaking(false);
    }
  };

  const handleToggleVoiceDictation = () => {
    if (isRecordingVoice) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecordingVoice(false);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      // Insert a non-spoiler thinking-aloud framework so the student still fills in their own reasoning
      setCandidateAnswer((prev) =>
        prev
          ? `${prev}\n[Spoken Reasoning]: First, my scratch baseline idea is: `
          : `1. Scratch Baseline Idea: [Explain your initial brute-force intuition here]\n2. Bottleneck Identified: [Why is the naive approach slow or limited?]\n3. Proposed Optimization & Big-O: [State your data structure and Time/Space complexity]`
      );
      setStatusToast('🎙️ Socratic reasoning scaffold inserted! Fill in your own intuition—no early spoilers.');
      setTimeout(() => setStatusToast(null), 3500);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'en-IN';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onstart = () => setIsRecordingVoice(true);
      rec.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setCandidateAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      rec.onerror = () => setIsRecordingVoice(false);
      rec.onend = () => setIsRecordingVoice(false);
      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsRecordingVoice(false);
    }
  };

  // Socratic Thinking Scaffold (NEVER leaks the direct answer before the student attempts!)
  const handleLoadSocraticScaffold = () => {
    setCandidateAnswer(
      `[Stage ${currentStageIdx + 1} — ${activeStage.shortTag} Walkthrough]\n` +
        `1. Clarifying Constraints & Scratch Baseline:\n   - Input assumptions & edge cases: \n   - Naive / Scratch approach & why it bottlenecks: \n\n` +
        `2. Step-by-Step Optimization (${activeStage.shortTag}):\n   - Data structure / invariant I will maintain: \n   - How state transitions work on each step: \n\n` +
        `3. Asymptotic Complexity:\n   - Time Complexity: O(...)\n   - Auxiliary Space Complexity: O(...)`
    );
    setStatusToast('🧭 Socratic Thinking Framework loaded! Complete your own reasoning before unlocking the solution.');
    setTimeout(() => setStatusToast(null), 3500);
  };

  const handleRequestNextProgressiveHint = () => {
    const nextCount = Math.min(3, unlockedHintsCount + 1);
    setUnlockedHintsCount(nextCount);
    const hintText = activeStage.progressiveHints[nextCount - 1];
    if (hintText && ttsEnabled) {
      speakText(`Interviewer Coaching Nudge ${nextCount}: ${hintText}`);
    }
  };

  // When a student is genuinely stuck ("I'm Stuck — Guide Me Step-by-Step"), give a Socratic coach breakdown instead of dumping raw answers immediately
  const handleStuckSocraticCoaching = () => {
    if (unlockedHintsCount < 3) {
      const nextCount = unlockedHintsCount + 1;
      setUnlockedHintsCount(nextCount);
      setStatusToast(
        `💡 Step ${nextCount}/3 Socratic Hint unlocked! Read the nudge and try answering "${activeStage.socraticCheckQuestion}" before viewing the full solution.`
      );
      setTimeout(() => setStatusToast(null), 4500);
    } else {
      setManualSolutionUnlockedMap((prev) => ({
        ...prev,
        [activeScenario.id]: true,
      }));
      setStatusToast(
        '🔓 All 3 Socratic hints reviewed! Step-by-Step Scratch-to-Advanced Solution Blueprint is now unlocked in the Coaching Panel.'
      );
      setTimeout(() => setStatusToast(null), 4500);
    }
  };

  const handleSubmitResponseForFeedback = async () => {
    const nextAttempt = (attemptCountMap[activeScenario.id] || 0) + 1;
    setAttemptCountMap((prev) => ({
      ...prev,
      [activeScenario.id]: nextAttempt,
    }));
    setIsEvaluating(true);

    try {
      const res = await fetch('/api/mock-interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: selectedCompany.name,
          role: selectedCompany.role,
          roundType: activeScenario.roundType,
          questionPrompt: activeStage.questionPrompt,
          expectedKeyConcepts: activeScenario.expectedKeyConcepts,
          candidateAnswer,
          codeSubmission,
          currentStageIndex: currentStageIdx,
          attemptNumber: nextAttempt,
          stageTitle: activeStage.levelLabel,
          starterCode: activeScenario.starterCode,
        }),
      });

      const data = await res.json();
      if (data.evaluation) {
        const evalResult: TurnFeedback = data.evaluation;
        setFeedbackMap((prev) => ({
          ...prev,
          [activeScenario.id]: evalResult,
        }));

        // Automatically unlock at least 1 progressive hint if the student's attempt needs practice
        if (!evalResult.canRevealFullSolution && unlockedHintsCount === 0) {
          setUnlockedHintsCount(1);
        }

        // Auto-advance progressive stage if student scored well (>= 75) and isn't on Stage 3 yet
        if (evalResult.overallScore >= 75 && currentStageIdx < 2) {
          setStatusToast(
            `🔥 Great job on ${activeStage.shortTag} (${evalResult.overallScore}%)! Click "Escalate to Stage ${currentStageIdx + 2}" to tackle the complicated Bar-Raiser level.`
          );
          setTimeout(() => setStatusToast(null), 5000);
        }

        if (ttsEnabled) {
          if (evalResult.canRevealFullSolution) {
            speakText(
              `Evaluation complete. Verdict: ${evalResult.verdict}, score ${evalResult.overallScore} percent. ${evalResult.socraticGuidance || ''} Follow up question: ${evalResult.interviewerFollowUpQuestion}`
            );
          } else {
            speakText(
              `I noticed your answer is still in progress. I will not give away the direct answer yet so you can learn deeply. ${evalResult.socraticGuidance || activeStage.socraticCheckQuestion}`
            );
          }
        }

        // Persist mock interview session to profile & Firestore
        const sessionRecord = {
          id: `mock_${selectedCompany.id}_${Date.now()}`,
          companyId: selectedCompany.id,
          companyName: selectedCompany.name,
          role: selectedCompany.role,
          roundType: activeScenario.roundType,
          overallScore: evalResult.overallScore,
          questionsCount: 1,
          completedAt: new Date().toISOString(),
        };

        const existingHistory = Array.isArray(profile.mockInterviewHistory)
          ? profile.mockInterviewHistory
          : [];
        const updatedHistory = [sessionRecord, ...existingHistory].slice(0, 20);
        const updatedProfile: StudentProfile = {
          ...profile,
          mockInterviewHistory: updatedHistory,
        };
        onProfileUpdate(updatedProfile);

        if (onLogStudyMinutes) {
          onLogStudyMinutes(15, `Mock Interview: ${selectedCompany.name} (${activeScenario.roundType})`);
        }

        try {
          await setDoc(
            doc(db, 'mock_interviews', sessionRecord.id),
            {
              ...sessionRecord,
              userId: profile.userId,
            },
            { merge: true }
          );
          await setDoc(
            doc(db, 'profiles', profile.userId),
            { mockInterviewHistory: updatedHistory },
            { merge: true }
          );
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.WRITE, `mock_interviews/${sessionRecord.id}`);
        }
      }
    } catch (err) {
      console.warn('Error evaluating mock interview response:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleShareScorecardToWhatsApp = async (feedback: TurnFeedback) => {
    try {
      await fetch('/api/simulate/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPhone: profile.whatsappNumber,
          userId: profile.userId,
          senderName: profile.name,
          text: `Save my ${selectedCompany.name} Face-to-Face Mock Interview scorecard (${feedback.overallScore}/100 - ${feedback.verdict}) on ${activeScenario.title} (${activeStage.levelLabel}) and send 2 complicated follow-up problems from scratch to advanced.`,
        }),
      });
      setStatusToast(
        `📲 Mock Interview Scorecard (${feedback.overallScore}/100) synced to WhatsApp (${profile.whatsappNumber})!`
      );
      setTimeout(() => setStatusToast(null), 4000);
    } catch {
      onNavigateToChat(
        `Review my ${selectedCompany.name} mock interview answer on ${activeScenario.title}`
      );
    }
  };

  const currentFeedback = feedbackMap[activeScenario.id];
  const currentAttempts = attemptCountMap[activeScenario.id] || 0;
  const isSolutionUnlocked =
    Boolean(currentFeedback?.canRevealFullSolution) ||
    Boolean(manualSolutionUnlockedMap[activeScenario.id]) ||
    (currentAttempts >= 2 && unlockedHintsCount >= 2);

  const completedCount = Object.keys(feedbackMap).length;
  const averageScore = useMemo(() => {
    const vals = Object.values(feedbackMap);
    if (vals.length === 0) return null;
    const sum = vals.reduce((acc, v) => acc + v.overallScore, 0);
    return Math.round(sum / vals.length);
  }, [feedbackMap]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-400 shrink-0 shadow-lg shadow-emerald-950/50">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                Face-to-Face AI Technical Mock Interview Studio
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Socratic Anti-Spoiler Mode • Scratch → Advanced
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-1">
              Face-to-Face Role-Play & Progressive Complicated Problem Solving
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Simulate a real face-to-face technical interview where the interviewer guides you from{' '}
              <strong className="text-slate-200">Stage 1 (Scratch Intuition)</strong> to{' '}
              <strong className="text-slate-200">Stage 3 (Complicated Bar-Raiser Scale)</strong>. Direct answers are locked until you reason through the problem or step through progressive coaching hints.
            </p>
          </div>
        </div>

        {/* Live Session Metrics & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={toggleFaceToFaceCamera}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer ${
              faceToFaceActive
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-lg shadow-rose-950/40'
                : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/25'
            }`}
          >
            {faceToFaceActive ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            <span>{faceToFaceActive ? 'End Face-to-Face Cam' : 'Start Face-to-Face Video'}</span>
          </button>

          <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Interview Timer</div>
              <div className="text-xs font-mono font-bold text-white flex items-center space-x-1.5">
                <span>{formatTimer(elapsedSeconds)}</span>
                <button
                  type="button"
                  onClick={() => setTimerRunning(!timerRunning)}
                  className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                >
                  {timerRunning ? 'Pause' : 'Resume'}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer ${
              ttsEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle AI Interviewer Voice Readout"
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{ttsEnabled ? 'Interviewer Voice ON' : 'Voice Muted'}</span>
          </button>

          {averageScore !== null && (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center space-x-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-200">Session Avg</div>
                <div className="text-xs font-black text-white">
                  {averageScore}/100 ({completedCount} {completedCount === 1 ? 'Round' : 'Rounds'})
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {statusToast && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl px-4 py-3 text-xs text-emerald-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="text-[11px] text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Face-to-Face Dual Video Call Bar (Shown when Face-to-Face mode is active) */}
      {faceToFaceActive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/90 border border-indigo-500/40 rounded-2xl p-4 shadow-xl">
          {/* AI Interviewer Live Feed Panel */}
          <div className="relative rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-950 border border-indigo-500/30 p-4 flex flex-col justify-between min-h-[170px] overflow-hidden">
            <div className="flex items-center justify-between z-10">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${interviewerSpeaking ? 'bg-emerald-400 animate-ping' : 'bg-indigo-400'}`} />
                <span>AI INTERVIEWER • LIVE FACE-TO-FACE</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400">{selectedCompany.name} Panel</span>
            </div>

            <div className="my-3 flex items-center space-x-3.5 z-10">
              <div
                className={`w-14 h-14 rounded-2xl bg-indigo-500/25 border-2 flex items-center justify-center text-lg font-black text-indigo-200 transition-all ${
                  interviewerSpeaking ? 'border-emerald-400 scale-105 shadow-lg shadow-emerald-500/30' : 'border-indigo-500/50'
                }`}
              >
                {selectedCompany.interviewerName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div className="flex-1">
                <div className="text-sm font-black text-white">{selectedCompany.interviewerName}</div>
                <div className="text-[11px] text-indigo-300">{selectedCompany.interviewerTitle}</div>
                <div className="text-[11px] text-slate-300 mt-1 italic line-clamp-2">
                  “{activeStage.socraticCheckQuestion}”
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 z-10">
              <span>Pedagogy: Socratic Questioning (No Early Spoilers)</span>
              <button
                type="button"
                onClick={() => speakText(`${activeStage.questionPrompt} ${activeStage.socraticCheckQuestion}`)}
                className="text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                🔊 Hear Interviewer Question
              </button>
            </div>
          </div>

          {/* Student Candidate Live Webcam / Studio Panel */}
          <div className="relative rounded-xl bg-slate-900 border border-emerald-500/30 p-4 flex flex-col justify-between min-h-[170px] overflow-hidden">
            {cameraStreamActive && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover opacity-65"
              />
            )}
            <div className="relative z-10 flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{cameraStreamActive ? 'CANDIDATE WEBCAM LIVE' : 'CANDIDATE FACE-TO-FACE STUDIO'}</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-950/80 border border-slate-700 text-[10px] text-emerald-300 font-bold flex items-center space-x-1">
                <Eye className="w-3 h-3" />
                <span>Presence & Focus: {eyeContactScore}%</span>
              </span>
            </div>

            {!cameraStreamActive && cameraSimulatedMode && (
              <div className="relative z-10 my-3 flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-sm font-black text-emerald-300">
                  {profile.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{profile.name} (Candidate)</div>
                  <div className="text-[11px] text-slate-300">
                    Active Stage: <strong className="text-emerald-300">{activeStage.levelLabel}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-200 bg-slate-950/75 rounded-lg px-2.5 py-1.5 border border-slate-800">
              <span>Attempts on Round: {currentAttempts}</span>
              <span>Hints Used: {unlockedHintsCount}/3</span>
              <span className={isSolutionUnlocked ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>
                {isSolutionUnlocked ? '🔓 Blueprint Unlocked' : '🔒 Direct Answer Guarded'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Select Target Company Track */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>1. Select Target Company Interview Panel</span>
          </span>
          <span className="text-[11px] text-slate-400">
            Past Mock Sessions Completed: <strong className="text-white">{(profile.mockInterviewHistory || []).length}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {COMPANY_INTERVIEW_TRACKS.map((company) => {
            const isSelected = company.id === selectedCompany.id;
            return (
              <button
                key={company.id}
                type="button"
                onClick={() => {
                  setSelectedCompanyId(company.id);
                  setSelectedScenarioIdx(0);
                  setCandidateAnswer('');
                }}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white">{company.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {company.ctcBand}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-300 mt-1">{company.role}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{company.tier}</div>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {company.evaluationFocus.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Scenario Tabs within Company */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          {selectedCompany.scenarios.map((scen, idx) => {
            const isActive = idx === selectedScenarioIdx;
            const doneFeedback = feedbackMap[scen.id];
            return (
              <button
                key={scen.id}
                type="button"
                onClick={() => {
                  setSelectedScenarioIdx(idx);
                  setCandidateAnswer('');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>
                  Round {idx + 1}: {scen.roundType}
                </span>
                {doneFeedback && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/90 text-emerald-300 font-black">
                    {doneFeedback.overallScore}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() =>
            speakText(
              `Hello ${profile.name}, I am ${selectedCompany.interviewerName} at ${selectedCompany.name}. We are on ${activeStage.levelLabel}. ${activeStage.questionPrompt}`
            )
          }
          className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Speak Current Stage Prompt</span>
        </button>
      </div>

      {/* Step 3: Progressive Scratch -> Intermediate -> Advanced Difficulty Escalator */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              Progressive Learning Ladder (Scratch to Complicated Advanced)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Master the foundation first, then escalate to complicated Bar-Raiser constraints
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {(activeScenario.progressiveStages || []).map((st, idx) => {
            const isCurrent = idx === currentStageIdx;
            return (
              <button
                key={st.levelLabel}
                type="button"
                onClick={() => setCurrentStageIdx(idx)}
                className={`text-left p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                  isCurrent
                    ? idx === 2
                      ? 'bg-rose-950/60 border-rose-500/60 text-white shadow-md'
                      : idx === 1
                      ? 'bg-indigo-950/60 border-indigo-500/60 text-white shadow-md'
                      : 'bg-emerald-950/60 border-emerald-500/60 text-white shadow-md'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1.5">
                    {idx === 2 && <Flame className="w-3.5 h-3.5 text-rose-400" />}
                    <span>{st.levelLabel}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                    {idx === 0
                      ? 'Build core intuition & identify brute-force bottlenecks'
                      : idx === 1
                      ? 'Write optimal Time & Space algorithm / SQL / architecture'
                      : 'Complicated scale, concurrency, & Bar-Raiser edge cases'}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Role-Play Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interviewer Role-Play Prompt & Candidate Response Input */}
        <div className="lg:col-span-7 space-y-4">
          {/* Interviewer Persona Card */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30 border border-indigo-500/30 rounded-2xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-black text-sm">
                  {selectedCompany.interviewerName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white">
                      {selectedCompany.interviewerName}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      {activeScenario.difficulty}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {selectedCompany.interviewerTitle} • {selectedCompany.name}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                {activeStage.shortTag}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Scenario: {activeScenario.title}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                  {activeStage.levelLabel}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeScenario.scenarioContext}
              </p>
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <p className="text-sm font-semibold text-white leading-relaxed">
                  “{activeStage.questionPrompt}”
                </p>
                <div className="p-2.5 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-xs text-indigo-200">
                  <strong className="text-indigo-300">Socratic Check-In Question:</strong>{' '}
                  {activeStage.socraticCheckQuestion}
                </div>
              </div>
            </div>

            {/* Progressive 3-Level Hint Ladder (Never reveals full code prematurely) */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Key Concepts Tested:
                  </span>
                  {activeScenario.expectedKeyConcepts.map((concept) => (
                    <span
                      key={concept}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300"
                    >
                      {concept}
                    </span>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleRequestNextProgressiveHint}
                    disabled={unlockedHintsCount >= 3}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 disabled:opacity-50 flex items-center space-x-1 cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>
                      {unlockedHintsCount === 0
                        ? 'Unlock Hint 1/3 (Intuition)'
                        : unlockedHintsCount < 3
                        ? `Unlock Hint ${unlockedHintsCount + 1}/3`
                        : 'All 3 Hints Unlocked'}
                    </span>
                  </button>
                </div>
              </div>

              {unlockedHintsCount > 0 && (
                <div className="space-y-1.5">
                  {activeStage.progressiveHints.slice(0, unlockedHintsCount).map((hText, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start space-x-2"
                    >
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black text-[10px] shrink-0">
                        Step {idx + 1}/3
                      </span>
                      <span>{hText}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Candidate Verbal / Written Walkthrough Input */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-white flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Your Face-to-Face Explanation ({activeStage.shortTag})</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleVoiceDictation}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer ${
                    isRecordingVoice
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isRecordingVoice ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      <span>Stop Mic</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>Speak Answer</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleLoadSocraticScaffold}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition cursor-pointer"
                  title="Inserts a structured thinking outline without giving away the answer"
                >
                  Socratic Thinking Outline (No Spoilers)
                </button>
                <button
                  type="button"
                  onClick={handleStuckSocraticCoaching}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-xs font-bold text-amber-300 border border-amber-500/30 flex items-center space-x-1 transition cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>
                    {unlockedHintsCount < 3
                      ? `I'm Stuck (Get Nudge ${unlockedHintsCount + 1}/3)`
                      : 'Unlock Step-by-Step Solution'}
                  </span>
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={candidateAnswer}
              onChange={(e) => setCandidateAnswer(e.target.value)}
              placeholder={`Explain your ${activeStage.shortTag} reasoning to ${selectedCompany.interviewerName}. Start from scratch intuition, answer the Socratic check-in question, and state your Time & Space complexity...`}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed"
            />

            {/* Live Code / SQL / Architecture Whiteboard */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <span>Live Code / SQL / System Design Whiteboard</span>
                </label>
                <button
                  type="button"
                  onClick={() => setCodeSubmission(activeScenario.starterCode)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Starter Code</span>
                </button>
              </div>
              <textarea
                rows={5}
                value={codeSubmission}
                onChange={(e) => setCodeSubmission(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-slate-400">
                Anti-Spoiler Guard: If your answer is incomplete, the interviewer gives Socratic guidance first instead of revealing the final answer early.
              </span>
              <div className="flex items-center space-x-2">
                {currentStageIdx < 2 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStageIdx((prev) => Math.min(2, prev + 1))}
                    className="px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Escalate to Stage {currentStageIdx + 2}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSubmitResponseForFeedback}
                  disabled={isEvaluating}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs shadow-lg shadow-emerald-600/25 flex items-center space-x-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isEvaluating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Evaluating Attempt...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Attempt #{currentAttempts + 1}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Socratic Evaluation, Guarded Solution Blueprint & Escalation */}
        <div className="lg:col-span-5 space-y-4">
          {currentFeedback ? (
            <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
              {/* Verdict Banner */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                    Face-to-Face Evaluation ({activeStage.shortTag})
                  </span>
                  <h3 className="text-base font-black text-white mt-0.5">
                    Verdict: {currentFeedback.verdict}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">
                    {currentFeedback.overallScore}
                    <span className="text-xs text-slate-400 font-normal">/100</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Attempt #{currentAttempts}</div>
                </div>
              </div>

              {/* Socratic Interviewer Coaching Banner */}
              {currentFeedback.socraticGuidance && (
                <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 space-y-1.5">
                  <div className="text-xs font-extrabold text-indigo-300 flex items-center space-x-1.5">
                    <Brain className="w-3.5 h-3.5" />
                    <span>Socratic Interviewer Guidance:</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {currentFeedback.socraticGuidance}
                  </p>
                </div>
              )}

              {/* 3-Axis Progress Bars */}
              <div className="space-y-2.5">
                {[
                  {
                    label: 'Technical Accuracy & Edge Cases',
                    score: currentFeedback.technicalAccuracyScore,
                    color: 'bg-emerald-500',
                  },
                  {
                    label: 'Algorithmic & Problem-Solving Depth',
                    score: currentFeedback.problemSolvingScore,
                    color: 'bg-indigo-500',
                  },
                  {
                    label: 'Communication & Structured Clarity',
                    score: currentFeedback.communicationClarityScore,
                    color: 'bg-amber-500',
                  },
                ].map((metric) => (
                  <div key={metric.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">{metric.label}</span>
                      <span className="text-white font-bold">{metric.score}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${metric.color} rounded-full transition-all duration-500`}
                        style={{ width: `${metric.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Strengths & Actionable Improvements */}
              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                  <div className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>What Stood Out (Strengths)</span>
                  </div>
                  <ul className="text-xs text-slate-200 space-y-1 list-disc list-inside">
                    {currentFeedback.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                  <div className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Next Step to Improve (Without Giving Away the Answer)</span>
                  </div>
                  <ul className="text-xs text-slate-200 space-y-1 list-disc list-inside">
                    {currentFeedback.improvements.map((imp, i) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Anti-Spoiler Solution Gate: Locked until student answers well OR works through Socratic hints */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-indigo-300">
                    Asymptotic Complexity Critique:
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                      isSolutionUnlocked
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isSolutionUnlocked ? (
                      <>
                        <Unlock className="w-3 h-3" />
                        <span>Full Solution Unlocked</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Early Answer Locked for Learning</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{currentFeedback.complexityCritique}</p>

                {isSolutionUnlocked ? (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-emerald-300">
                      Scratch-to-Advanced Complete Solution Blueprint:
                    </div>
                    <pre className="text-[11px] text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800 whitespace-pre-wrap font-mono leading-relaxed">
                      {activeStage.stepByStepScratchToAdvancedSolution}
                    </pre>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong className="text-emerald-300">Interviewer Summary:</strong>{' '}
                      {currentFeedback.modelExemplarAnswer}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2">
                    <div className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Why is the Direct Answer Hidden Right Now?</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      In a real face-to-face interview, the interviewer will not hand you the solution when a question is unanswered or incomplete. Refine your attempt using the Socratic hint below, or step through all 3 hints to unlock the full Scratch-to-Advanced solution!
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleStuckSocraticCoaching}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold cursor-pointer"
                      >
                        {unlockedHintsCount < 3
                          ? `Reveal Progressive Hint (${unlockedHintsCount + 1}/3)`
                          : 'I Tried All 3 Hints — Unlock Solution Now'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Complicated Next-Stage Escalation & Interviewer Follow-Up Probe */}
              <div className="p-3.5 rounded-xl bg-indigo-950/50 border border-indigo-500/40 space-y-2.5">
                <div className="text-xs font-extrabold text-indigo-300 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Complicated Interviewer Follow-Up Probe:</span>
                </div>
                <p className="text-xs text-white font-medium">
                  “{currentFeedback.interviewerFollowUpQuestion}”
                </p>
                {currentFeedback.nextComplicatedChallenge && (
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-200">
                    <strong className="text-rose-300">Next Complicated Escalation:</strong>{' '}
                    {currentFeedback.nextComplicatedChallenge}
                  </div>
                )}
                {!followUpSubmitted ? (
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      value={followUpReply}
                      onChange={(e) => setFollowUpReply(e.target.value)}
                      placeholder="Defend your design under this complicated follow-up..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (followUpReply.trim()) {
                          setFollowUpSubmitted(true);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Defend
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-emerald-300 flex items-center space-x-1.5 pt-1">
                    <Check className="w-4 h-4" />
                    <span>
                      Follow-up defense logged! {selectedCompany.interviewerName} recorded your trade-off defense.
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleShareScorecardToWhatsApp(currentFeedback)}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Send Scorecard to WhatsApp</span>
                </button>
                {selectedScenarioIdx < selectedCompany.scenarios.length - 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedScenarioIdx((prev) => prev + 1);
                      setCandidateAnswer('');
                    }}
                    className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                  >
                    <span>Next Round</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between h-full space-y-5">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Brain className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Socratic Scratch-to-Advanced Face-to-Face Coaching
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  To help you genuinely master technical interviews at{' '}
                  <strong className="text-white">{selectedCompany.name}</strong>, our AI Interviewer never dumps the final answer prematurely:
                </p>
                <div className="space-y-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200">
                    <strong className="text-emerald-400">1. Stage 1 (Scratch Foundation):</strong> Start with brute-force intuition and identify why naive approaches bottleneck.
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200">
                    <strong className="text-indigo-400">2. Stage 2 (Intermediate Optimization):</strong> Use progressive Socratic hints (1/3 → 3/3) to derive the optimal O(N) / O(1) algorithm yourself.
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200">
                    <strong className="text-rose-400">3. Stage 3 (Complicated Bar-Raiser):</strong> Stress-test your solution under 100,000+ QPS concurrency, distributed sharding, or 3D constraints.
                  </div>
                </div>
              </div>

              {/* Recent Mock Interview History */}
              {profile.mockInterviewHistory && profile.mockInterviewHistory.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Recent Mock Interview Attempts
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {profile.mockInterviewHistory.slice(0, 4).map((hist) => (
                      <div
                        key={hist.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">{hist.companyName}</div>
                          <div className="text-[10px] text-slate-400">{hist.roundType}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs">
                          {hist.overallScore}/100
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
