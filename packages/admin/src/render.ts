import type { ViewEngine } from '@pondoknusa/views';

export async function renderAdminView(
  view: ViewEngine,
  template: string,
  context: Record<string, unknown>,
): Promise<string> {
  return view.render(`admin::${template}`, context);
}