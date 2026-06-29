import type { NewProjectOptions } from './new-project-options.js';

export function ragResourceModel(name: string): string {
  const table = `${name.charAt(0).toLowerCase()}${name.slice(1)}s`;

  return `import { Model } from '@pondoknusa/database';

export interface ${name}Attributes {
  id: number;
  content: string;
  source: string;
  metadata?: string | null;
  embedding?: string | null;
}

export class ${name} extends Model<${name}Attributes> {
  static override table = '${table}';
  static override vectorColumn = 'embedding';
}
`;
}

export function ragResourceMigration(name: string, timestamp: string): string {
  const table = `${name.charAt(0).toLowerCase()}${name.slice(1)}s`;

  return `import { Migration } from '@pondoknusa/database';
import type { DatabaseConnection } from '@pondoknusa/database';
import type { SchemaBuilder } from '@pondoknusa/database';

export default class Create${name}sTable extends Migration {
  override async up(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.create('${table}', (table) => {
      table.id();
      table.text('content');
      table.string('source');
      table.text('metadata').nullable();
      table.text('embedding').nullable();
      table.timestamps();
    });
  }

  override async down(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.drop('${table}');
  }
}
`;
}

export function ragIngestJob(name: string): string {
  const modelImport = `${name}.js`;
  const variable = `${name.charAt(0).toLowerCase()}${name.slice(1)}`;

  return `import { Job } from '@pondoknusa/queue';
import { ingestFile } from '@pondoknusa/rag';
import { ${name} } from '../models/${modelImport}';

export interface Ingest${name}Payload extends Record<string, unknown> {
  path: string;
  source?: string;
}

export class Ingest${name} extends Job<Ingest${name}Payload> {
  override async handle(): Promise<void> {
    await ingestFile(${name}, this.data.path, { source: this.data.source });
  }
}
`;
}

export function vectorConfig(): string {
  return `import { env } from '@pondoknusa/config';

export default {
  defaultMetric: env('VECTOR_METRIC', 'cosine'),
  embedBatchSize: env('VECTOR_EMBED_BATCH', 32),
} as const;
`;
}

export function embedStub(): string {
  return `import type { EmbedFn } from '@pondoknusa/vector';

/**
 * Replace with your provider SDK (OpenAI, Anthropic, local model, etc.).
 */
export const embed: EmbedFn = async (text) => {
  const dimensions = 8;
  const vector = new Array<number>(dimensions).fill(0);
  for (let i = 0; i < text.length; i++) {
    vector[i % dimensions] = (vector[i % dimensions] ?? 0) + text.charCodeAt(i) / 1000;
  }
  return vector;
};
`;
}

export function graphqlRoutes(): string {
  return `import { Route } from '@pondoknusa/core';
import { ArrayStore } from '@pondoknusa/cache';
import {
  createGraphQLHandler,
  createOperationRegistry,
  defineSchema,
  defineType,
} from '@pondoknusa/graphql';
import { Document } from '../models/Document.js';

const cache = new ArrayStore();

const schema = defineSchema({
  Query: {
    hello: {
      resolve: () => 'Pondoknusa RAG',
    },
    documents: {
      resolve: async () => Document.query().limit(10).get(),
    },
  },
  types: {
    Document: defineType({
      id: {
        resolve: (parent) => (parent as { id: number }).id,
      },
      source: {
        resolve: (parent) => (parent as { source: string }).source,
      },
      content: {
        resolve: (parent) => (parent as { content: string }).content,
      },
    }),
  },
});

const operations = createOperationRegistry([
  {
    name: 'Hello',
    type: 'query',
    document: 'query Hello { hello }',
  },
  {
    name: 'Documents',
    type: 'query',
    document: 'query Documents { documents { id source content } }',
  },
]);

Route.post('/graphql', createGraphQLHandler({
  schema,
  operations,
  cache,
  defaultCacheTtl: 30,
}));

Route.get('/graphql', createGraphQLHandler({
  schema,
  operations,
  cache,
  defaultCacheTtl: 30,
}));
`;
}

export function ragRoutes(): string {
  return `import { join } from 'node:path';
import { Route } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';
import {
  ConversationMemory,
  Rag,
  ingestDocument,
  ingestFile,
  loadPromptTemplate,
  streamRagResponse,
} from '@pondoknusa/rag';
import { Document } from '../models/Document.js';
import { ConversationMessage } from '../models/ConversationMessage.js';
import { embed } from '../embed.js';

const rag = new Rag({ model: Document, embed });
const promptTemplatePath = join(import.meta.dirname ?? import.meta.dir, '../../resources/prompts/grounded-qna.txt');

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
  });
  const template = await loadPromptTemplate(promptTemplatePath);
  const prompt = rag.buildPrompt(body.question, chunks, template);

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
    yield 'Replace streamTokens with your LLM SDK async iterator.';
  }

  return Response.sse(streamRagResponse(rag, body.question, tokenStream, {
    topK: 3,
    minScore: 0.1,
    hybrid: { textQuery: body.question },
    promptTemplate: template,
    memory,
  }));
});
`;
}

export function conversationMessageModel(): string {
  return `import { Model } from '@pondoknusa/database';

export interface ConversationMessageAttributes {
  id: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class ConversationMessage extends Model<ConversationMessageAttributes> {
  static override table = 'conversation_messages';
}
`;
}

export function conversationMessagesMigration(timestamp: string): string {
  return `import { Migration } from '@pondoknusa/database';
import type { DatabaseConnection } from '@pondoknusa/database';
import type { SchemaBuilder } from '@pondoknusa/database';

export default class CreateConversationMessagesTable extends Migration {
  override async up(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.create('conversation_messages', (table) => {
      table.id();
      table.string('session_id');
      table.string('role');
      table.text('content');
      table.timestamps();
    });
  }

  override async down(_connection: DatabaseConnection, schema: SchemaBuilder) {
    await schema.drop('conversation_messages');
  }
}
`;
}

export function documentModel(): string {
  return ragResourceModel('Document');
}

export function documentsMigration(timestamp: string): string {
  return ragResourceMigration('Document', timestamp);
}

export function aiMainEntry(options: NewProjectOptions): string {
  const driverImports: string[] = [];
  const driverProviders: string[] = [];
  const bootstrapLines: string[] = [
    "import { registerEmbedModel, setEmbedChunksHandler } from '@pondoknusa/vector';",
    "import { Document } from './models/Document.js';",
    "import { embed } from './embed.js';",
    '',
    'registerEmbedModel(\'Document\', Document);',
    'setEmbedChunksHandler(embed);',
  ];

  if (options.database === 'mysql') {
    driverImports.push("import { MysqlDatabaseServiceProvider } from '@pondoknusa/database-mysql';");
    driverProviders.push('app.register(MysqlDatabaseServiceProvider);');
  } else if (options.database === 'postgres') {
    driverImports.push("import { PgDatabaseServiceProvider } from '@pondoknusa/database-pg';");
    driverProviders.push('app.register(PgDatabaseServiceProvider);');
    bootstrapLines.splice(1, 0, "import { registerVectorSearchForConnection } from '@pondoknusa/vector-pg';");
    bootstrapLines.push('');
    bootstrapLines.push("// Register pgvector after the database boots in AppServiceProvider if needed.");
  } else {
    bootstrapLines.splice(1, 0, "import { registerLocalVectorSearchDriver } from '@pondoknusa/vector';");
    bootstrapLines.push('');
    bootstrapLines.push("registerLocalVectorSearchDriver('sqlite');");
  }

  if (options.redis) {
    driverImports.push("import { NodeRedisServiceProvider } from '@pondoknusa/redis-node';");
    driverProviders.push('app.register(NodeRedisServiceProvider);');
    driverImports.push("import { WebSocketBroadcastServiceProvider } from '@pondoknusa/broadcasting-websocket';");
    driverProviders.push('new WebSocketBroadcastServiceProvider(app).register();');
  }

  return `${driverImports.length > 0 ? `${driverImports.join('\n')}\n` : ''}import {
  Application,
  BroadcastServiceProvider,
  CacheServiceProvider,
  ConfigRepository,
  ConfigServiceProvider,
  LocaleServiceProvider,
  LogServiceProvider,
  DatabaseServiceProvider,
  ${options.redis ? 'RedisServiceProvider,\n  ' : ''}EventServiceProvider,
  HttpKernel,
  MailServiceProvider,
  NotificationServiceProvider,
  QueueServiceProvider,
  StorageServiceProvider,
  registerHttpMiddleware,
  setBroadcastApplication,
  setCacheApplication,
  setDbApplication,
  setEventApplication,
  setLangApplication,
  setUrlApplication,
  setLogApplication,
  setMailApplication,
  setNotificationApplication,
  setQueueApplication,
  setRouteApplication,
  setStorageApplication,
  setViewApplication,
  ViewServiceProvider,
  serve,
} from '@pondoknusa/core';
import { AppServiceProvider } from './providers/app-service-provider.js';
import './routes/channels.js';
import './routes/web.js';
import './routes/rag.js';
import './routes/graphql.js';

const app = new Application(import.meta.dir);
setRouteApplication(app);
setDbApplication(app);
setLangApplication(app);
setUrlApplication(app);
setViewApplication(app);
setQueueApplication(app);
setEventApplication(app);
setBroadcastApplication(app);
setCacheApplication(app);
setStorageApplication(app);
setLogApplication(app);
setMailApplication(app);
setNotificationApplication(app);

${bootstrapLines.join('\n')}

${[
  'app.register(ConfigServiceProvider);',
  ...driverProviders,
  options.redis ? 'app.register(RedisServiceProvider);' : '',
  'app.register(DatabaseServiceProvider);',
  'app.register(CacheServiceProvider);',
  'app.register(StorageServiceProvider);',
  'app.register(LogServiceProvider);',
  'app.register(MailServiceProvider);',
  'app.register(NotificationServiceProvider);',
  'app.register(QueueServiceProvider);',
  'app.register(EventServiceProvider);',
  'app.register(BroadcastServiceProvider);',
  'app.register(ViewServiceProvider);',
  'app.register(LocaleServiceProvider);',
  'app.register(AppServiceProvider);',
].filter(Boolean).join('\n')}

await app.boot();

registerHttpMiddleware(app, app.make(ConfigRepository));

const kernel = new HttpKernel(app);
await serve(kernel);
`;
}

export function aiAppServiceProvider(): string {
  return `import { ServiceProvider } from '@pondoknusa/core';
import { JobRegistry } from '@pondoknusa/queue';
import { EmbedChunksJob } from '@pondoknusa/vector';

export class AppServiceProvider extends ServiceProvider {
  override register() {
    this.app.make<JobRegistry>('jobs.registry').register(EmbedChunksJob);
  }
}
`;
}

export function groundedPromptTemplate(): string {
  return `Use the context below to answer the question. Cite sources using {{citations}} when relevant.

Context:
{{context}}

Question: {{question}}
`;
}