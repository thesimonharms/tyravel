import type { MailAddress, MailMessage } from './types.js';

export function formatMailbox(address: MailAddress): string {
  if (address.name) {
    const encoded = encodeHeaderValue(address.name);
    return `"${encoded}" <${address.address}>`;
  }
  return address.address;
}

function encodeHeaderValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function buildMimeMessage(message: MailMessage): string {
  const lines: string[] = [];
  lines.push(`From: ${formatMailbox(message.from!)}`);
  lines.push(`To: ${message.to.map(formatMailbox).join(', ')}`);
  if (message.cc?.length) {
    lines.push(`Cc: ${message.cc.map(formatMailbox).join(', ')}`);
  }
  if (message.replyTo) {
    lines.push(`Reply-To: ${formatMailbox(message.replyTo)}`);
  }
  lines.push(`Subject: ${encodeSubject(message.subject)}`);
  lines.push('MIME-Version: 1.0');

  if (message.html && message.text) {
    const boundary = `----=_Pondoknusa_${Date.now()}`;
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/plain; charset=utf-8');
    lines.push('');
    lines.push(message.text);
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/html; charset=utf-8');
    lines.push('');
    lines.push(message.html);
    lines.push(`--${boundary}--`);
  } else if (message.html) {
    lines.push('Content-Type: text/html; charset=utf-8');
    lines.push('');
    lines.push(message.html);
  } else {
    lines.push('Content-Type: text/plain; charset=utf-8');
    lines.push('');
    lines.push(message.text ?? '');
  }

  return lines.join('\r\n');
}

export function encodeSubject(subject: string): string {
  if (/^[\x20-\x7E]*$/.test(subject)) {
    return subject;
  }
  const encoded = Buffer.from(subject, 'utf8').toString('base64');
  return `=?UTF-8?B?${encoded}?=`;
}

export function dotStuff(body: string): string {
  return body
    .split('\r\n')
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n');
}