import type { ViewEngine } from '@pondoknusa/views';
import type { MailMessage } from './types.js';

export interface RenderMailViewsOptions {
  locale?: string;
}

export async function renderMailViews(
  engine: ViewEngine,
  message: MailMessage,
  options: RenderMailViewsOptions = {},
): Promise<MailMessage> {
  const data = message.viewData ?? {};
  const previousLocale = options.locale ? engine.getLocale() : undefined;

  if (options.locale) {
    engine.setLocale(options.locale);
  }

  try {
    if (message.htmlView) {
      message.html = await engine.render(message.htmlView, data);
    }

    if (message.textView) {
      message.text = await engine.render(message.textView, data);
    }
  } finally {
    if (options.locale && previousLocale !== undefined) {
      engine.setLocale(previousLocale);
    }
  }

  return message;
}