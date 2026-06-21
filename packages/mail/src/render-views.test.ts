import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { ViewEngine } from '@tyravel/views';
import { renderMailViews } from './render-views.js';

describe('renderMailViews', () => {
  it('renders html and text views into a mail message', async () => {
    const basePath = join(tmpdir(), `tyravel-mail-views-${Date.now()}`);
    const viewsPath = join(basePath, 'resources/views');
    mkdirSync(viewsPath, { recursive: true });

    writeFileSync(
      join(viewsPath, 'welcome-html.tyr'),
      '<p>Hello {{ name }}</p>',
    );
    writeFileSync(
      join(viewsPath, 'welcome-text.tyr'),
      'Hello {{ name }}',
    );

    const engine = new ViewEngine(basePath, { path: 'resources/views' });
    const message = await renderMailViews(engine, {
      subject: 'Welcome',
      to: [{ address: 'user@example.com' }],
      htmlView: 'welcome-html',
      textView: 'welcome-text',
      viewData: { name: 'Ada' },
    });

    expect(message.html).toBe('<p>Hello Ada</p>');
    expect(message.text).toBe('Hello Ada');
  });
});