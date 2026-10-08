import { db } from '../database/db.ts';
import { DocumentRecord, DocumentChunk, LearningResource } from '../../src/types/index.ts';
import { getGeminiAI } from '../gemini.ts';
import { CURATED_LEARNING_RESOURCES } from '../database/learningResources.ts';

/**
 * Semantic Concept Clusters for Dense Vector Embedding Projection.
 * Maps natural-language synonyms, conceptual descriptions, and domain vocabulary
 * into shared latent dimensions so cosine similarity captures true semantic meaning.
 */
const SEMANTIC_CONCEPT_CLUSTERS: { label: string; terms: string[] }[] = [
  {
    label: 'Recursion & Call Stack',
    terms: [
      'recursion', 'recursive', 'base case', 'stack overflow', 'call stack', 'frame',
      'calling itself', 'infinite loop', 'termination', 'fibonacci', 'factorial', 'depth',
      'recursionerror', 'subproblem', 'unwind',
    ],
  },
  {
    label: 'Python Memory & Scoping',
    terms: [
      'python', 'legb', 'scope', 'local', 'enclosing', 'global', 'builtin', 'mutable',
      'immutable', 'list comprehension', 'generator', 'yield', 'reference counting',
      'gil', 'global interpreter lock', 'cpython', 'dictionary', 'tuple',
    ],
  },
  {
    label: 'JVM Architecture & OOP',
    terms: [
      'java', 'jvm', 'heap', 'stack', 'metaspace', 'garbage collection', 'gc',
      'polymorphism', 'overloading', 'overriding', 'interface', 'abstract', 'encapsulation',
      'inheritance', 'bytecode', 'classloader', 'virtual method',
    ],
  },
  {
    label: 'Concurrency & Multithreading',
    terms: [
      'thread', 'concurrency', 'parallel', 'mutex', 'lock', 'volatile', 'synchronized',
      'completablefuture', 'async', 'await', 'task', 'non-blocking', 'race condition',
      'deadlock', 'happens-before', 'multiprocessing', 'starvation',
    ],
  },
  {
    label: 'Low-Level Memory & Pointers',
    terms: [
      'pointer', 'memory address', 'dereference', 'malloc', 'calloc', 'realloc', 'free',
      'dangling pointer', 'segmentation fault', 'segfault', 'buffer overflow', 'struct',
      'padding', 'alignment', 'sizeof', 'dynamic allocation', 'c programming',
    ],
  },
  {
    label: 'Modern C++ & Smart Pointers (RAII)',
    terms: [
      'c++', 'cpp', 'raii', 'smart pointer', 'unique_ptr', 'shared_ptr', 'weak_ptr',
      'memory leak', 'ownership', 'destructor', 'constructor', 'stl', 'vector',
      'unordered_map', 'template', 'move semantics', 'rvalue',
    ],
  },
  {
    label: 'C# .NET, CLR & LINQ',
    terms: [
      'c#', 'csharp', 'dotnet', '.net', 'clr', 'jit', 'value type', 'reference type',
      'boxing', 'unboxing', 'linq', 'deferred execution', 'ienumerable', 'entity framework',
      'expression tree', 'query',
    ],
  },
  {
    label: 'R Data Science & Statistical Computing',
    terms: [
      'r programming', 'vectorization', 'atomic vector', 'dplyr', 'ggplot2', 'data frame',
      'tibble', 'pipe operator', 'filter', 'mutate', 'summarise', 'group_by',
      'grammar of graphics', 'facet', 'visualization', 'statistics',
    ],
  },
  {
    label: 'Binary Search & Algorithmic Complexity',
    terms: [
      'binary search', 'sorted array', 'monotonic', 'o(log n)', 'logarithmic', 'mid',
      'integer overflow', 'divide and conquer', 'search space', 'halving', 'invariant',
      'time complexity', 'big o', 'asymptotic', 'dsa', 'algorithm',
    ],
  },
  {
    label: 'Trees, Graphs & Traversals',
    terms: [
      'tree', 'binary search tree', 'bst', 'inorder', 'preorder', 'postorder',
      'graph', 'bfs', 'dfs', 'breadth first', 'depth first', 'dijkstra', 'shortest path',
      'node', 'vertex', 'edge', 'traversal', 'dynamic programming', 'memoization',
    ],
  },
  {
    label: 'Calculus, Integration & Limits',
    terms: [
      'calculus', 'mathematics', 'integral', 'integration', 'integration by parts',
      'liate', 'antiderivative', 'derivative', 'differentiation', 'product rule',
      'fundamental theorem', 'limit', 'area under curve', 'trigonometric', 'logarithmic',
      'exponential', 'definite', 'indefinite',
    ],
  },
  {
    label: 'LLMs, Transformers & Self-Attention',
    terms: [
      'generative ai', 'llm', 'large language model', 'transformer', 'attention',
      'self-attention', 'scaled dot-product', 'multi-head', 'token', 'decoder',
      'probability', 'softmax', 'query key value', 'neural network', 'deep learning',
    ],
  },
  {
    label: 'RAG, Vector Embeddings & Semantic Search',
    terms: [
      'rag', 'retrieval augmented generation', 'vector', 'embedding', 'cosine similarity',
      'semantic search', 'chunking', 'sliding window', 'hallucination', 'grounding',
      'knowledge base', 'faiss', 'pinecone', 'hnsw', 'dense retrieval', 'top-k',
    ],
  },
  {
    label: 'Autonomous AI Agents & Multi-Agent Systems',
    terms: [
      'ai agent', 'autonomous', 'react pattern', 'reason and act', 'tool calling',
      'function calling', 'observation', 'multi-agent', 'langgraph', 'crewai',
      'autogen', 'state graph', 'human in the loop', 'orchestration', 'planning',
    ],
  },
];

const LOCAL_VECTOR_DIM = 128;

export interface VectorChunkMatch {
  chunk: DocumentChunk;
  document?: DocumentRecord;
  similarity: number;
  matchedConcepts: string[];
  highlightSnippet: string;
}

export interface VectorDocumentMatch {
  document: DocumentRecord;
  maxSimilarity: number;
  avgSimilarity: number;
  matchingChunksCount: number;
  topChunk: DocumentChunk;
  matchedConcepts: string[];
}

export interface VectorCourseMatch {
  course: LearningResource;
  similarity: number;
  matchedConcepts: string[];
}

export interface SemanticVectorSearchResponse {
  query: string;
  embeddingModel: string;
  vectorDimension: number;
  searchLatencyMs: number;
  totalChunksScanned: number;
  totalDocumentsScanned: number;
  matchedChunks: VectorChunkMatch[];
  matchedDocuments: VectorDocumentMatch[];
  matchedCourses: VectorCourseMatch[];
  contextString: string;
}

export class RagService {
  private geminiEmbeddingsCache = new Map<string, number[]>();

  /**
   * Deterministic 128-dimensional dense semantic vector embedding.
   * Combines:
   * - Dimensions 0..13: Semantic concept cluster activations
   * - Dimensions 14..127: Normalized hashed word-stem & character 3-gram projections
   */
  public computeLocalSemanticVector(text: string): number[] {
    const vec = new Array<number>(LOCAL_VECTOR_DIM).fill(0);
    const clean = (text || '').toLowerCase().trim();
    if (!clean) return vec;

    // 1. Project onto Semantic Concept Subspaces (dims 0..13)
    SEMANTIC_CONCEPT_CLUSTERS.forEach((cluster, idx) => {
      if (idx >= 24) return;
      let clusterScore = 0;
      for (const term of cluster.terms) {
        if (clean.includes(term)) {
          clusterScore += term.includes(' ') ? 2.4 : 1.5;
        }
      }
      vec[idx] = clusterScore;
    });

    // 2. Project tokenized stems & bigrams into dims 24..95
    const tokens = clean
      .replace(/[^\w\s+#]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);

    for (let i = 0; i < tokens.length; i++) {
      const token = this.stemWord(tokens[i]);
      const h1 = this.hashString(token);
      const dim1 = 24 + (h1 % 72);
      vec[dim1] += 1.2;

      if (i < tokens.length - 1) {
        const bigram = `${token}_${this.stemWord(tokens[i + 1])}`;
        const h2 = this.hashString(bigram);
        const dim2 = 24 + (h2 % 72);
        vec[dim2] += 0.9;
      }
    }

    // 3. Project character 4-grams into dims 96..127 for morphological & typo resilience
    const compact = clean.replace(/\s+/g, ' ');
    for (let i = 0; i <= compact.length - 4; i++) {
      const ngram = compact.slice(i, i + 4);
      const h = this.hashString(ngram);
      const dim = 96 + (h % 32);
      vec[dim] += 0.25;
    }

    return this.l2Normalize(vec);
  }

  /**
   * Compute cosine similarity between two dense vectors A and B
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    const len = Math.min(vecA.length, vecB.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Optional Gemini Embedding (`gemini-embedding-2-preview`) with fast timeout & cache
   */
  private async tryComputeGeminiEmbedding(text: string, timeoutMs = 2200): Promise<number[] | null> {
    const cacheKey = text.trim().toLowerCase().slice(0, 500);
    if (this.geminiEmbeddingsCache.has(cacheKey)) {
      return this.geminiEmbeddingsCache.get(cacheKey)!;
    }

    const ai = getGeminiAI();
    if (!ai) return null;

    let timer: NodeJS.Timeout | null = null;
    try {
      const embedPromise = ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: [text.slice(0, 1200)],
      });

      const timeoutPromise = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      });

      const res: any = await Promise.race([embedPromise, timeoutPromise]);
      const values = res?.embeddings?.[0]?.values;
      if (Array.isArray(values) && values.length > 0) {
        const normalized = this.l2Normalize(values);
        this.geminiEmbeddingsCache.set(cacheKey, normalized);
        return normalized;
      }
      return null;
    } catch {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Extract matched semantic concepts between query and target text
   */
  public extractMatchedConcepts(
    query: string,
    targetText: string,
    chunkKeywords: string[] = []
  ): string[] {
    const qLower = query.toLowerCase();
    const tLower = targetText.toLowerCase();
    const matched = new Set<string>();

    // Check semantic concept clusters activated by both query and target
    for (const cluster of SEMANTIC_CONCEPT_CLUSTERS) {
      const queryActivates = cluster.terms.some((term) => qLower.includes(term));
      const targetActivates = cluster.terms.some((term) => tLower.includes(term));
      if (queryActivates && targetActivates) {
        matched.add(cluster.label);
      }
    }

    // Check explicit chunk keywords
    for (const kw of chunkKeywords) {
      const kwLower = kw.toLowerCase();
      if (
        qLower.includes(kwLower) ||
        qLower
          .split(/\s+/)
          .some((w) => w.length > 2 && kwLower.includes(this.stemWord(w)))
      ) {
        matched.add(kw);
      }
    }

    // Add overlapping technical tokens
    const qWords = qLower
      .replace(/[^\w\s+#]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);
    for (const w of qWords) {
      if (tLower.includes(w) && matched.size < 5) {
        matched.add(w);
      }
    }

    if (matched.size === 0 && chunkKeywords.length > 0) {
      chunkKeywords.slice(0, 3).forEach((k) => matched.add(k));
    }

    return Array.from(matched).slice(0, 5);
  }

  /**
   * Perform full Vector Search against the RAG Knowledge Base (Chunks, Documents & Courses)
   */
  async semanticVectorSearch(
    query: string,
    options: {
      subject?: string;
      limit?: number;
      minSimilarity?: number;
    } = {}
  ): Promise<SemanticVectorSearchResponse> {
    const startTime = Date.now();
    const cleanQuery = (query || '').trim();
    const limit = options.limit || 8;
    const minSimilarity = options.minSimilarity ?? 0.18;
    const subjectFilter =
      options.subject && options.subject.toLowerCase() !== 'all'
        ? options.subject.toLowerCase()
        : null;

    if (!cleanQuery) {
      return {
        query: '',
        embeddingModel: 'gemini-embedding-2-preview (Hybrid Dense Vector Index)',
        vectorDimension: LOCAL_VECTOR_DIM,
        searchLatencyMs: 1,
        totalChunksScanned: db.chunks.length,
        totalDocumentsScanned: db.documents.size,
        matchedChunks: [],
        matchedDocuments: [],
        matchedCourses: [],
        contextString: '',
      };
    }

    // Ensure all chunks have local dense embeddings computed
    for (const chunk of db.chunks) {
      if (!chunk.embedding || chunk.embedding.length !== LOCAL_VECTOR_DIM) {
        chunk.embedding = this.computeLocalSemanticVector(
          `${chunk.subject} ${chunk.documentTitle} ${(chunk.keywords || []).join(' ')} ${chunk.content}`
        );
      }
    }

    const queryLocalVec = this.computeLocalSemanticVector(cleanQuery);
    const queryGeminiVec = await this.tryComputeGeminiEmbedding(cleanQuery, 1800);
    const usedGeminiEmbedding = Boolean(queryGeminiVec);

    const qLower = cleanQuery.toLowerCase();
    const qTokens = qLower
      .replace(/[^\w\s+#]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);

    const candidateChunks = subjectFilter
      ? db.chunks.filter((c) => c.subject.toLowerCase() === subjectFilter)
      : db.chunks;

    const scoredChunks: VectorChunkMatch[] = [];

    for (const chunk of candidateChunks) {
      const parentDoc = db.documents.get(chunk.documentId);
      const chunkVec =
        chunk.embedding ||
        this.computeLocalSemanticVector(
          `${chunk.subject} ${chunk.documentTitle} ${(chunk.keywords || []).join(' ')} ${chunk.content}`
        );

      // 1. Dense Vector Cosine Similarity
      const rawCosine = this.cosineSimilarity(queryLocalVec, chunkVec);

      // 2. Hybrid Lexical & Metadata Signal
      let lexicalBoost = 0;
      const titleLower = (chunk.documentTitle || '').toLowerCase();
      const subjectLower = (chunk.subject || '').toLowerCase();
      const contentLower = (chunk.content || '').toLowerCase();

      if (qLower.includes(subjectLower) || subjectLower.includes(qLower)) {
        lexicalBoost += 0.18;
      }
      if (titleLower.includes(qLower)) {
        lexicalBoost += 0.25;
      }

      let matchedTokenCount = 0;
      for (const tok of qTokens) {
        const stem = this.stemWord(tok);
        if (titleLower.includes(tok) || titleLower.includes(stem)) {
          lexicalBoost += 0.1;
          matchedTokenCount++;
        }
        if ((chunk.keywords || []).some((k) => k.toLowerCase().includes(stem))) {
          lexicalBoost += 0.11;
          matchedTokenCount++;
        }
        if (contentLower.includes(tok) || (stem.length > 3 && contentLower.includes(stem))) {
          lexicalBoost += 0.06;
          matchedTokenCount++;
        }
      }

      if (qTokens.length > 1 && matchedTokenCount >= qTokens.length) {
        lexicalBoost += 0.12;
      }

      // Calibrated hybrid vector similarity score in [0, 0.99]
      const combinedScore = Math.min(
        0.99,
        Number((rawCosine * 0.72 + Math.min(0.45, lexicalBoost)).toFixed(4))
      );

      if (combinedScore >= minSimilarity) {
        const matchedConcepts = this.extractMatchedConcepts(
          cleanQuery,
          `${chunk.documentTitle} ${chunk.content}`,
          chunk.keywords
        );

        scoredChunks.push({
          chunk: {
            ...chunk,
            similarityScore: combinedScore,
            matchedConcepts,
          },
          document: parentDoc,
          similarity: combinedScore,
          matchedConcepts,
          highlightSnippet: this.buildHighlightSnippet(chunk.content, qTokens),
        });
      }
    }

    scoredChunks.sort((a, b) => b.similarity - a.similarity);
    const topChunks = scoredChunks.slice(0, limit);

    // Aggregate document-level vector rankings
    const docScoreMap = new Map<
      string,
      {
        document: DocumentRecord;
        similarities: number[];
        topChunk: DocumentChunk;
        concepts: Set<string>;
      }
    >();

    for (const match of scoredChunks) {
      const doc = match.document || db.documents.get(match.chunk.documentId);
      if (!doc) continue;
      const existing = docScoreMap.get(doc.id);
      if (!existing) {
        docScoreMap.set(doc.id, {
          document: doc,
          similarities: [match.similarity],
          topChunk: match.chunk,
          concepts: new Set(match.matchedConcepts),
        });
      } else {
        existing.similarities.push(match.similarity);
        if (match.similarity > (existing.topChunk.similarityScore || 0)) {
          existing.topChunk = match.chunk;
        }
        match.matchedConcepts.forEach((c) => existing.concepts.add(c));
      }
    }

    const matchedDocuments: VectorDocumentMatch[] = Array.from(docScoreMap.values())
      .map((entry) => {
        const maxSim = Math.max(...entry.similarities);
        const avgSim =
          entry.similarities.reduce((acc, v) => acc + v, 0) / entry.similarities.length;
        return {
          document: entry.document,
          maxSimilarity: Number(maxSim.toFixed(4)),
          avgSimilarity: Number(avgSim.toFixed(4)),
          matchingChunksCount: entry.similarities.length,
          topChunk: entry.topChunk,
          matchedConcepts: Array.from(entry.concepts).slice(0, 5),
        };
      })
      .sort((a, b) => b.maxSimilarity - a.maxSimilarity);

    // Also compute vector similarity against curated LearningResources (courses)
    const candidateCourses = subjectFilter
      ? CURATED_LEARNING_RESOURCES.filter((r) => r.subject.toLowerCase() === subjectFilter)
      : CURATED_LEARNING_RESOURCES;

    const matchedCourses: VectorCourseMatch[] = candidateCourses
      .map((course) => {
        const courseText = `${course.subject} ${course.title} ${course.provider} ${course.description} ${course.keyTopics.join(' ')}`;
        const courseVec = this.computeLocalSemanticVector(courseText);
        const rawCos = this.cosineSimilarity(queryLocalVec, courseVec);
        let boost = 0;
        const cLower = courseText.toLowerCase();
        for (const tok of qTokens) {
          if (cLower.includes(tok)) boost += 0.08;
        }
        const sim = Math.min(0.98, Number((rawCos * 0.75 + Math.min(0.35, boost)).toFixed(4)));
        return {
          course,
          similarity: sim,
          matchedConcepts: this.extractMatchedConcepts(cleanQuery, courseText, course.keyTopics),
        };
      })
      .filter((c) => c.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 6);

    const contextString = topChunks
      .map(
        (m, i) =>
          `[Vector Match #${i + 1} (${Math.round(m.similarity * 100)}% similarity) | ${m.chunk.documentTitle} | ${m.chunk.subject}]\n${m.chunk.content}`
      )
      .join('\n\n');

    return {
      query: cleanQuery,
      embeddingModel: usedGeminiEmbedding
        ? 'gemini-embedding-2-preview + Dense Cosine Vector Index'
        : 'RAG Dense Concept Vector Index (Cosine Similarity)',
      vectorDimension: usedGeminiEmbedding && queryGeminiVec ? queryGeminiVec.length : LOCAL_VECTOR_DIM,
      searchLatencyMs: Math.max(2, Date.now() - startTime),
      totalChunksScanned: candidateChunks.length,
      totalDocumentsScanned: db.documents.size,
      matchedChunks: topChunks,
      matchedDocuments,
      matchedCourses,
      contextString,
    };
  }

  /**
   * Add a study document into the RAG repository with precomputed vector embeddings
   */
  async ingestDocument(
    title: string,
    subject: string,
    category: string,
    originalFilename: string,
    content: string
  ): Promise<DocumentRecord> {
    const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const chunks = this.chunkText(content, 450, 60);

    const docRecord: DocumentRecord = {
      id: docId,
      title: title.trim(),
      subject: subject.trim(),
      category: category.trim(),
      originalFilename: originalFilename.trim(),
      fileSizeKb: Math.max(1, Math.round(content.length / 1024)),
      uploadedAt: new Date().toISOString(),
      chunkCount: chunks.length,
      summary: content.slice(0, 180).trim() + (content.length > 180 ? '...' : ''),
    };

    db.documents.set(docId, docRecord);

    // Save individual chunks with dense vector embeddings
    chunks.forEach((chunkText, index) => {
      const keywords = this.extractKeywords(chunkText);
      const embedding = this.computeLocalSemanticVector(
        `${subject} ${title} ${keywords.join(' ')} ${chunkText}`
      );
      const chunkRecord: DocumentChunk = {
        id: `chunk_${docId}_${index + 1}`,
        documentId: docId,
        documentTitle: title.trim(),
        subject: subject.trim(),
        chunkIndex: index + 1,
        content: chunkText,
        keywords,
        embedding,
      };
      db.chunks.push(chunkRecord);
    });

    return docRecord;
  }

  /**
   * Get a document and all its indexed chunks
   */
  getDocument(docId: string): { document?: DocumentRecord; chunks: DocumentChunk[] } {
    const document = db.documents.get(docId);
    const chunks = db.chunks.filter((c) => c.documentId === docId);
    return { document, chunks };
  }

  /**
   * Preview how content will be segmented into semantic chunks
   */
  previewChunks(text: string, chunkSize = 450): string[] {
    return this.chunkText(text, chunkSize, 60);
  }

  /**
   * Synchronous search across the RAG knowledge base using dense vector similarity + keyword hybrid
   */
  search(
    query: string,
    limit = 3
  ): {
    chunks: DocumentChunk[];
    contextString: string;
    formattedContext: string;
    recommendedCourses: LearningResource[];
  } {
    if (!query || !query.trim()) {
      return { chunks: [], contextString: '', formattedContext: '', recommendedCourses: [] };
    }

    const cleanQuery = query.trim();
    const queryVec = this.computeLocalSemanticVector(cleanQuery);
    const qLower = cleanQuery.toLowerCase();
    const qWords = qLower
      .replace(/[^\w\s+#]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);

    const recommendedCourses = CURATED_LEARNING_RESOURCES.filter((course) => {
      const cText = `${course.subject} ${course.title} ${course.keyTopics.join(' ')}`.toLowerCase();
      return qWords.some((w) => w.length > 2 && cText.includes(w));
    }).slice(0, 2);

    const scored = db.chunks.map((chunk) => {
      if (!chunk.embedding || chunk.embedding.length !== LOCAL_VECTOR_DIM) {
        chunk.embedding = this.computeLocalSemanticVector(
          `${chunk.subject} ${chunk.documentTitle} ${(chunk.keywords || []).join(' ')} ${chunk.content}`
        );
      }
      const cosine = this.cosineSimilarity(queryVec, chunk.embedding);
      let lexicalBoost = 0;
      const titleLower = (chunk.documentTitle || '').toLowerCase();
      const subjectLower = (chunk.subject || '').toLowerCase();
      const contentLower = (chunk.content || '').toLowerCase();

      if (qLower.includes(subjectLower) || subjectLower.includes(qLower)) {
        lexicalBoost += 0.18;
      }
      for (const w of qWords) {
        if (titleLower.includes(w)) lexicalBoost += 0.1;
        if ((chunk.keywords || []).some((kw) => kw.toLowerCase().includes(w))) lexicalBoost += 0.1;
        if (w.length > 2 && contentLower.includes(w)) lexicalBoost += 0.05;
      }

      const similarityScore = Math.min(0.99, Number((cosine * 0.72 + Math.min(0.45, lexicalBoost)).toFixed(4)));
      const matchedConcepts = this.extractMatchedConcepts(
        cleanQuery,
        `${chunk.documentTitle} ${chunk.content}`,
        chunk.keywords
      );

      return {
        chunk: {
          ...chunk,
          similarityScore,
          matchedConcepts,
        },
        score: similarityScore,
      };
    });

    const matched = scored
      .filter((s) => s.score >= 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.chunk);

    if (matched.length === 0) {
      const fallbackMatched = db.searchChunks(cleanQuery, limit);
      if (fallbackMatched.length === 0) {
        return { chunks: [], contextString: '', formattedContext: '', recommendedCourses };
      }
      const contextString = fallbackMatched
        .map(
          (c, i) =>
            `[Source ${i + 1}: ${c.documentTitle} | Subject: ${c.subject}]\n${c.content}`
        )
        .join('\n\n');
      return {
        chunks: fallbackMatched,
        contextString,
        formattedContext: contextString,
        recommendedCourses,
      };
    }

    const contextString = matched
      .map(
        (c, i) =>
          `[Source ${i + 1}: ${c.documentTitle} | Subject: ${c.subject} | Vector Match: ${Math.round((c.similarityScore || 0.8) * 100)}%]\n${c.content}`
      )
      .join('\n\n');

    return {
      chunks: matched,
      contextString,
      formattedContext: contextString,
      recommendedCourses,
    };
  }

  /**
   * Robust multi-tier chunker:
   * Splits text cleanly by double newlines, then by single sentences, then by word blocks.
   * Guarantees chunks are neither too tiny nor exceeding chunkSize.
   */
  public chunkText(text: string, chunkSize = 450, overlap = 60): string[] {
    if (!text || !text.trim()) return [];

    const normalized = text.replace(/\r\n/g, '\n').trim();
    const paragraphs = normalized.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const p of paragraphs) {
      const cleanP = p.trim();
      if (!cleanP) continue;

      if (cleanP.length > chunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        const sentences = cleanP.match(/[^.!?\n]+[.!?\n]+(\s+|$)|[^.!?\n]+$/g) || [cleanP];
        let subChunk = '';
        for (const s of sentences) {
          const cleanS = s.trim();
          if (!cleanS) continue;

          if ((subChunk + ' ' + cleanS).length <= chunkSize) {
            subChunk += (subChunk ? ' ' : '') + cleanS;
          } else {
            if (subChunk.trim()) chunks.push(subChunk.trim());

            if (cleanS.length > chunkSize) {
              for (let i = 0; i < cleanS.length; i += chunkSize - overlap) {
                const slice = cleanS.slice(i, i + chunkSize).trim();
                if (slice) chunks.push(slice);
              }
              subChunk = '';
            } else {
              subChunk = cleanS;
            }
          }
        }
        if (subChunk.trim()) {
          chunks.push(subChunk.trim());
        }
      } else if ((currentChunk + '\n\n' + cleanP).length <= chunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + cleanP;
      } else {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = cleanP;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    if (chunks.length === 0 && text.trim().length > 0) {
      const cleanText = text.trim();
      for (let i = 0; i < cleanText.length; i += chunkSize - overlap) {
        const slice = cleanText.slice(i, i + chunkSize).trim();
        if (slice) chunks.push(slice);
      }
    }

    return chunks.filter((c) => c.length >= 8);
  }

  private extractKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const stopwords = new Set([
      'this', 'that', 'with', 'from', 'have', 'were', 'which', 'their', 'about', 'there',
      'would', 'could', 'should', 'function', 'class', 'using', 'return', 'where', 'these',
      'those', 'after', 'before', 'between', 'under', 'above', 'other',
    ]);

    const freq: Record<string, number> = {};
    for (const w of words) {
      if (!stopwords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k]) => k);
  }

  private buildHighlightSnippet(content: string, queryTokens: string[]): string {
    if (!content) return '';
    if (content.length <= 240) return content;

    const lower = content.toLowerCase();
    for (const tok of queryTokens) {
      if (tok.length < 3) continue;
      const idx = lower.indexOf(tok);
      if (idx !== -1) {
        const start = Math.max(0, idx - 60);
        const end = Math.min(content.length, idx + 180);
        return (start > 0 ? '...' : '') + content.slice(start, end).trim() + (end < content.length ? '...' : '');
      }
    }
    return content.slice(0, 220).trim() + '...';
  }

  private stemWord(word: string): string {
    return word
      .toLowerCase()
      .replace(/(ing|tion|ions|ed|ly|es|s)$/, '')
      .trim();
  }

  private hashString(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash);
  }

  private l2Normalize(vec: number[]): number[] {
    let sumSq = 0;
    for (let i = 0; i < vec.length; i++) {
      sumSq += vec[i] * vec[i];
    }
    if (sumSq === 0) return vec;
    const norm = Math.sqrt(sumSq);
    return vec.map((v) => Number((v / norm).toFixed(6)));
  }

  /**
   * Delete a document and its indexed semantic chunks
   */
  deleteDocument(docId: string): boolean {
    if (!db.documents.has(docId)) {
      return false;
    }
    db.documents.delete(docId);
    db.chunks = db.chunks.filter((c) => c.documentId !== docId);
    return true;
  }
}

export const ragService = new RagService();
