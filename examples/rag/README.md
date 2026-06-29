# Pondoknusa RAG example

Minimal ingest → embed → ask flow. Embedding and LLM calls use your own SDK in the app layer (`src/embed.ts`); Pondoknusa handles chunking, storage, and retrieval.

```bash
npm install
cp .env.example .env
pondoknusa migrate
pondoknusa serve
```

In another terminal, embed ingested chunks and process the queue:

```bash
pondoknusa vector:embed --model=Document
pondoknusa queue:work
```

Then `POST /rag/ask` with `{ "question": "..." }` returns a grounded prompt plus retrieved chunks.

Ingest from a file path (`.txt`, `.md`, `.pdf`):

```bash
curl -X POST http://127.0.0.1:3000/rag/ingest \
  -H 'content-type: application/json' \
  -d '{"path":"./docs/guide/introduction.md"}'
```

Stream a grounded answer over SSE (replace the stub token stream with your SDK):

```bash
curl -N -X POST http://127.0.0.1:3000/rag/ask/stream \
  -H 'content-type: application/json' \
  -d '{"question":"How does broadcasting work?","sessionId":"demo-1"}'
```

Scaffold a new app with AI routes and vector config:

```bash
pondoknusa new my-ai-app --ai
```

Run the MCP server for agent tooling:

```bash
pondoknusa mcp:serve
```

Export Cursor / Claude agent rules from the capability manifest:

```bash
pondoknusa mcp:export-rules --format=cursor
pondoknusa mcp:export-rules --format=agents --output=AGENTS.md
```