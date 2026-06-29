# RAG Q&A endpoint

Build a minimal retrieval-augmented Q&A flow with `@pondoknusa/rag` and `@pondoknusa/vector`.

## Scaffold

```bash
pondoknusa new knowledge-base --ai
npm install
pondoknusa vector:install
```

The `--ai` flag adds vector config, embed jobs, models, and example routes.

## Ingest documents

```typescript
import { ingestFile } from '@pondoknusa/rag';

await ingestFile('storage/docs/handbook.pdf', {
  source: 'handbook',
  chunkSize: 800,
});
```

Embed chunks:

```bash
pondoknusa vector:embed
```

## Ask endpoint

```typescript
import { Route } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';
import { retrieveAndAnswer } from '@pondoknusa/rag';

Route.post('/api/ask', async (request) => {
  const { question } = await request.json();
  const answer = await retrieveAndAnswer(question, { topK: 5 });
  return Response.json(answer);
});
```

Use your preferred LLM SDK in the app layer — Pondoknusa handles storage, retrieval, and prompt templates.

## Example app

See [`examples/rag`](https://github.com/pondoknusa/pondoknusa/tree/main/examples/rag) for ingest → embed → ask → stream with GraphQL read API.