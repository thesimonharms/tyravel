import { join } from 'node:path';
import { Route } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';
import {
  ConversationMemory,
  Rag,
  ingestDocument,
  ingestFile,
  loadPromptTemplate,
  renderGroundedPrompt,
  streamRagResponse,
  type RerankFn,
} from '@pondoknusa/rag';
import { Document } from '../models/document.js';
import { ConversationMessage } from '../models/conversation-message.js';
import { embed } from '../embed.js';

const rag = new Rag({ model: Document, embed });
const promptTemplatePath = join(import.meta.dirname ?? import.meta.dir, '../../resources/prompts/grounded-qna.txt');

const rerankByLength: RerankFn = async (_query, chunks) =>
  [...chunks].sort((left, right) => right.content.length - left.content.length);

export function registerWebRoutes(): void {
Route.post('/rag/ingest', async (request) => {
  const body = await request.json() as { source?: string; content?: string; path?: string };
  if (body.path) {
    const ids = await ingestFile(Document, body.path, { source: body.source });
    return Response.json({ chunks: ids.length, ids, path: body.path });
  }

  if (!body.source || !body.content) {
    return Response.json({ message: 'source and content are required (or provide path).' }, { status: 422 });
  }

  const ids = await ingestDocument(Document, {
    source: body.source,
    content: body.content,
  });

  return Response.json({ chunks: ids.length, ids });
});

Route.post('/rag/ask', async (request) => {
  const body = await request.json() as { question?: string; sessionId?: string };
  if (!body.question) {
    return Response.json({ message: 'question is required.' }, { status: 422 });
  }

  const memory = body.sessionId
    ? new ConversationMemory(ConversationMessage, body.sessionId)
    : undefined;

  const chunks = await rag.retrieve(body.question, {
    topK: 3,
    minScore: 0.1,
    hybrid: { textQuery: body.question },
    rerank: rerankByLength,
  });
  const template = await loadPromptTemplate(promptTemplatePath);
  const prompt = renderGroundedPrompt(body.question, chunks, template);

  if (memory) {
    await memory.add('user', body.question);
    await memory.add('assistant', prompt);
  }

  return Response.json({
    prompt,
    chunks,
    note: 'Send prompt to your LLM SDK in the app layer.',
  });
});

Route.post('/rag/ask/stream', async (request) => {
  const body = await request.json() as { question?: string; sessionId?: string };
  if (!body.question) {
    return Response.json({ message: 'question is required.' }, { status: 422 });
  }

  const template = await loadPromptTemplate(promptTemplatePath);
  const memory = body.sessionId
    ? new ConversationMemory(ConversationMessage, body.sessionId)
    : undefined;

  async function* tokenStream(_prompt: string): AsyncGenerator<string> {
    yield 'Replace ';
    yield 'streamTokens ';
    yield 'with your LLM SDK.';
  }

  return Response.sse(streamRagResponse(rag, body.question, tokenStream, {
    topK: 3,
    minScore: 0.1,
    hybrid: { textQuery: body.question },
    rerank: rerankByLength,
    promptTemplate: template,
    memory,
  }));
});
}