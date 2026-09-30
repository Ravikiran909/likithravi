import * as pdfjsLib from 'pdfjs-dist';

// Configure worker safely for Vite environment
try {
  if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.0'}/build/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn('PDF.js worker initialization notice:', e);
}

/**
 * Fallback binary text extractor for PDFs if PDF.js fails or is blocked
 */
export function extractTextFromPdfBinary(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let rawStr = '';
  // Convert chunks to avoid stack overflow
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    rawStr += String.fromCharCode.apply(null, Array.from(chunk));
  }

  const extractedLines: string[] = [];

  // 1. Look for Tj and TJ operator strings in uncompressed text blocks
  // e.g. (Hello World) Tj or [(Hello) -10 (World)] TJ
  const tjRegex = /\(([^)]+)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(rawStr)) !== null) {
    const clean = match[1].replace(/\\([()\\])/g, '$1').trim();
    if (clean.length > 1) {
      extractedLines.push(clean);
    }
  }

  const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(rawStr)) !== null) {
    const inner = match[1];
    const subMatch = inner.match(/\(([^)]+)\)/g);
    if (subMatch) {
      const line = subMatch
        .map((m) => m.slice(1, -1).replace(/\\([()\\])/g, '$1'))
        .join(' ')
        .trim();
      if (line.length > 1) {
        extractedLines.push(line);
      }
    }
  }

  // If simple operators found sufficient text, return joined lines
  if (extractedLines.length > 5) {
    return extractedLines.join('\n');
  }

  // 2. Fallback heuristic: search for printable ASCII strings (e.g. sentences)
  const printableRegex = /[A-Za-z0-9][A-Za-z0-9\s.,!?:;'"()\/\-+=]{20,}/g;
  const printableMatches = rawStr.match(printableRegex) || [];
  const validLines = printableMatches
    .map((s) => s.trim())
    .filter((s) => !s.startsWith('/Filter') && !s.startsWith('obj') && !s.startsWith('endobj') && !s.startsWith('stream'));

  return validLines.join('\n\n');
}

/**
 * Primary PDF extraction method: tries PDF.js first, falls back to raw stream decoding
 */
export async function extractTextFromPdfFile(file: File): Promise<{
  text: string;
  numPages: number;
  filename: string;
  sizeKb: number;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const sizeKb = Math.max(1, Math.round(file.size / 1024));

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageString = textContent.items
        .map((item: any) => item.str || '')
        .filter((str: string) => str.trim().length > 0)
        .join(' ');

      if (pageString.trim()) {
        pageTexts.push(`--- Page ${pageNum} ---\n${pageString}`);
      }
    }

    const fullText = pageTexts.join('\n\n').trim();

    if (fullText.length > 20) {
      return {
        text: fullText,
        numPages,
        filename: file.name,
        sizeKb,
      };
    }
  } catch (pdfJsErr) {
    console.warn('PDF.js standard parser failed or had worker restriction, using binary fallback:', pdfJsErr);
  }

  // Fallback to binary stream parsing
  const fallbackText = extractTextFromPdfBinary(arrayBuffer);
  return {
    text: fallbackText || `Extracted content from ${file.name}`,
    numPages: 1,
    filename: file.name,
    sizeKb,
  };
}

/**
 * Extracts plain text from text-based files (.txt, .md, .py, .java, .json, .csv)
 */
export async function extractTextFromGenericFile(file: File): Promise<{
  text: string;
  filename: string;
  sizeKb: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      resolve({
        text,
        filename: file.name,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}
