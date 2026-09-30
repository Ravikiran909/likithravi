import { db } from '../database/db.ts';
import { DocumentRecord, DocumentChunk } from '../../src/types/index.ts';

export class RagService {
  /**
   * Add a study document into the RAG repository
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

    // Save individual chunks
    chunks.forEach((chunkText, index) => {
      const chunkRecord: DocumentChunk = {
        id: `chunk_${docId}_${index + 1}`,
        documentId: docId,
        documentTitle: title.trim(),
        subject: subject.trim(),
        chunkIndex: index + 1,
        content: chunkText,
        keywords: this.extractKeywords(chunkText),
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
   * Search knowledge base for relevant chunks
   */
  search(query: string, limit = 3): { chunks: DocumentChunk[]; contextString: string } {
    if (!query || !query.trim()) {
      return { chunks: [], contextString: '' };
    }

    const matched = db.searchChunks(query.trim(), limit);
    if (matched.length === 0) {
      return { chunks: [], contextString: '' };
    }

    const contextString = matched
      .map(
        (c, i) =>
          `[Source ${i + 1}: ${c.documentTitle} | Subject: ${c.subject}]\n${c.content}`
      )
      .join('\n\n');

    return { chunks: matched, contextString };
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

      // If the paragraph itself is longer than chunkSize, break into sentences
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
              // Hard split very long continuous lines
              for (let i = 0; i < cleanS.length; i += (chunkSize - overlap)) {
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

    // Safety fallback
    if (chunks.length === 0 && text.trim().length > 0) {
      const cleanText = text.trim();
      for (let i = 0; i < cleanText.length; i += (chunkSize - overlap)) {
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
      'those', 'after', 'before', 'between', 'under', 'above', 'other'
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
