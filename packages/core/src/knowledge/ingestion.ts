import type { DocumentParser, ParsedDocument, TextChunk } from '@axon-ai/adapters';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import * as cheerio from 'cheerio';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 50;

export function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): TextChunk[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: TextChunk[] = [];
  const wordsPerChunk = Math.floor(chunkSize / 1.3);
  const overlapWords = Math.floor(overlap / 1.3);
  let index = 0;
  let chunkIndex = 0;

  while (index < words.length) {
    const chunkWords = words.slice(index, index + wordsPerChunk);
    chunks.push({ content: chunkWords.join(' '), index: chunkIndex++ });
    index += wordsPerChunk - overlapWords;
    if (index <= 0) break;
  }

  return chunks.length ? chunks : [{ content: text, index: 0 }];
}

class TxtParser implements DocumentParser {
  readonly supportedExtensions = ['.txt', '.md'];
  canParse(source: string) {
    return this.supportedExtensions.includes(extname(source).toLowerCase()) || source.startsWith('raw:');
  }
  async parse(source: string, content?: Buffer): Promise<ParsedDocument> {
    if (source.startsWith('raw:')) return { text: source.slice(4) };
    const text = content ? content.toString('utf-8') : await readFile(source, 'utf-8');
    return { text };
  }
}

class PdfParser implements DocumentParser {
  readonly supportedExtensions = ['.pdf'];
  canParse(source: string) {
    return extname(source).toLowerCase() === '.pdf';
  }
  async parse(source: string, content?: Buffer): Promise<ParsedDocument> {
    const buf = content ?? (await readFile(source));
    const data = await pdfParse(buf);
    return { text: data.text };
  }
}

class DocxParser implements DocumentParser {
  readonly supportedExtensions = ['.docx'];
  canParse(source: string) {
    return extname(source).toLowerCase() === '.docx';
  }
  async parse(source: string, content?: Buffer): Promise<ParsedDocument> {
    const buf = content ?? (await readFile(source));
    const result = await mammoth.extractRawText({ buffer: buf });
    return { text: result.value };
  }
}

class CsvParser implements DocumentParser {
  readonly supportedExtensions = ['.csv'];
  canParse(source: string) {
    return extname(source).toLowerCase() === '.csv';
  }
  async parse(source: string, content?: Buffer): Promise<ParsedDocument> {
    const text = content ? content.toString('utf-8') : await readFile(source, 'utf-8');
    const rows = text.split('\n').filter(Boolean);
    return { text: rows.join('\n') };
  }
}

class UrlParser implements DocumentParser {
  readonly supportedExtensions = ['.url'];
  canParse(source: string) {
    return source.startsWith('http://') || source.startsWith('https://');
  }
  async parse(source: string): Promise<ParsedDocument> {
    const res = await fetch(source);
    const html = await res.text();
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    return { text, metadata: { url: source } };
  }
}

const parsers: DocumentParser[] = [new TxtParser(), new PdfParser(), new DocxParser(), new CsvParser(), new UrlParser()];

export function getParser(source: string): DocumentParser {
  const parser = parsers.find((p) => p.canParse(source));
  if (!parser) throw new Error(`Unsupported document source: ${source}`);
  return parser;
}

export async function parseDocument(source: string, content?: Buffer): Promise<TextChunk[]> {
  const parser = getParser(source);
  const doc = await parser.parse(source, content);
  return chunkText(doc.text);
}

export { parsers };
