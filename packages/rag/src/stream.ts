import type { SseEvent } from '@pondoknusa/http';
import type { Rag } from './rag.js';
import { renderGroundedPrompt } from './prompt-template.js';
import type { RagChunk, RagRetrieveOptions } from './types.js';
import type { ConversationMemory } from './conversation.js';

export interface RagStreamOptions extends RagRetrieveOptions {
  promptTemplate?: string;
  memory?: ConversationMemory;
}

export interface RagTokenStream {
  (prompt: string): AsyncIterable<string>;
}

export async function* streamRagResponse(
  rag: Rag,
  question: string,
  streamTokens: RagTokenStream,
  options: RagStreamOptions = {},
): AsyncGenerator<SseEvent> {
  if (options.memory) {
    await options.memory.add('user', question);
  }

  yield { event: 'retrieval', data: JSON.stringify({ status: 'started' }) };

  const chunks = await rag.retrieve(question, options);
  yield {
    event: 'chunks',
    data: JSON.stringify({ chunks }),
  };

  const prompt = options.promptTemplate
    ? renderGroundedPrompt(question, chunks, options.promptTemplate)
    : rag.buildPrompt(question, chunks);

  yield {
    event: 'prompt',
    data: JSON.stringify({ prompt }),
  };

  let answer = '';
  for await (const token of streamTokens(prompt)) {
    answer += token;
    yield {
      event: 'token',
      data: JSON.stringify({ token }),
    };
  }

  if (options.memory) {
    await options.memory.add('assistant', answer);
  }

  yield {
    event: 'done',
    data: JSON.stringify({ answer, chunks }),
  };
}