import type { ViewEngine } from '@tyravel/views';
import type { MailMessage } from './types.js';

export async function renderMailViews(
  engine: ViewEngine,
  message: MailMessage,
): Promise<MailMessage> {
  const data = message.viewData ?? {};

  if (message.htmlView) {
    message.html = await engine.render(message.htmlView, data);
  }

  if (message.textView) {
    message.text = await engine.render(message.textView, data);
  }

  return message;
}