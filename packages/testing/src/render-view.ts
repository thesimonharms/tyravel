import type { Application } from '@pondoknusa/core';
import { ViewEngine, type ViewContext } from '@pondoknusa/views';
import { RenderedView } from './view-assertions.js';

export async function renderView(
  app: Application,
  name: string,
  context: ViewContext = {},
): Promise<RenderedView> {
  const engine = app.make<ViewEngine>('view');
  const html = await engine.render(name, context);
  return new RenderedView(html, engine.getHydrationManifest());
}