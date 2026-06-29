import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Model, SqliteConnection } from '@pondoknusa/database';
import { extractPdfText, ingestFile, loadPromptTemplate, renderGroundedPrompt } from './index.js';

class Document extends Model {
  static override table = 'documents';
}

describe('document ingestion', () => {
  it('loads markdown files and ingests chunks', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pondoknusa-rag-'));
    const path = join(dir, 'guide.md');
    await writeFile(path, '# Guide\n\nPondoknusa ships native WebSockets.');

    const connection = new SqliteConnection(':memory:');
    Document.useConnection(connection);
    await connection.exec(`
      CREATE TABLE documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        metadata TEXT
      )
    `);

    const ids = await ingestFile(Document, path);
    expect(ids).toHaveLength(1);

    const rows = await Document.query().get();
    expect(rows[0]?.content).toContain('native WebSockets');
    expect(rows[0]?.source).toBe(path);
  });

  it('extracts text from simple PDF streams', () => {
    const pdf = Buffer.from(
      '1 0 obj<<>>stream\n'
      + '(Hello PDF) Tj (from Pondoknusa) Tj\n'
      + 'endstream',
      'latin1',
    );

    expect(extractPdfText(pdf)).toContain('Hello PDF');
    expect(extractPdfText(pdf)).toContain('from Pondoknusa');
  });

  it('renders grounded prompts from templates', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pondoknusa-rag-'));
    const templatePath = join(dir, 'prompt.txt');
    await writeFile(templatePath, 'Q: {{question}}\nCitations: {{citations}}\n{{context}}');

    const template = await loadPromptTemplate(templatePath);
    const prompt = renderGroundedPrompt(
      'What is Pondoknusa?',
      [{ content: 'A TypeScript web framework.', score: 0.9, source: 'docs' }],
      template,
    );

    expect(prompt).toContain('What is Pondoknusa?');
    expect(prompt).toContain('[1]');
    expect(prompt).toContain('TypeScript web framework');
  });
});