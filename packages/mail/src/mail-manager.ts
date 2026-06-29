import type { ViewEngine } from '@pondoknusa/views';
import { ArrayMailTransport, LogMailTransport, type MailTransport } from './transport.js';
import { SmtpMailTransport } from './smtp-transport.js';
import type { MailAddress, MailConfig, MailConnectionConfig, MailMessage } from './types.js';
import { Mailable } from './mailable.js';
import type { MailQueueBridge } from './queue-bridge.js';
import { renderMailViews } from './render-views.js';
import { SendMailable } from './send-mailable.js';

export class MailManager {
  private readonly transports = new Map<string, MailTransport>();
  private queueDefaults: { connection?: string; queue?: string } = {};
  private viewEngine?: ViewEngine;

  constructor(
    private readonly config: MailConfig,
    private readonly queue?: MailQueueBridge,
  ) {}

  setViewEngine(engine: ViewEngine | undefined): this {
    this.viewEngine = engine;
    return this;
  }

  setQueueDefaults(options: { connection?: string; queue?: string }): void {
    this.queueDefaults = options;
  }

  mailer(name?: string): Mailer {
    const connection = name ?? this.config.default;
    return new Mailer(
      this.resolveTransport(connection),
      this.config.from,
      connection,
      this.queue,
      this.queueDefaults,
      this.viewEngine,
    );
  }

  transport(name?: string): MailTransport {
    return this.resolveTransport(name ?? this.config.default);
  }

  private resolveTransport(connection: string): MailTransport {
    const existing = this.transports.get(connection);
    if (existing) {
      return existing;
    }

    const config = this.config.connections[connection];
    if (!config) {
      throw new Error(`Mail connection [${connection}] is not configured.`);
    }

    const transport = this.buildTransport(config);
    this.transports.set(connection, transport);
    return transport;
  }

  private buildTransport(config: MailConnectionConfig): MailTransport {
    switch (config.driver) {
      case 'array':
        return new ArrayMailTransport();
      case 'log':
        return new LogMailTransport(config.channel ?? 'stdout');
      case 'smtp':
        return new SmtpMailTransport(config);
      default:
        throw new Error(`Unsupported mail driver: ${(config as MailConnectionConfig).driver}`);
    }
  }
}

export class Mailer {
  private recipients: MailAddress[] = [];

  constructor(
    private readonly transport: MailTransport,
    private readonly defaultFrom: MailAddress,
    private readonly mailConnection: string,
    private readonly queue?: MailQueueBridge,
    private readonly queueDefaults: { connection?: string; queue?: string } = {},
    private readonly viewEngine?: ViewEngine,
  ) {}

  to(address: string | MailAddress | Array<string | MailAddress>): this {
    const list = Array.isArray(address) ? address : [address];
    for (const entry of list) {
      this.recipients.push(normalizeAddress(entry));
    }
    return this;
  }

  async send(mailable: Mailable | MailMessage): Promise<void> {
    const merged = await this.mergeMessage(mailable);

    if (mailable instanceof Mailable && mailable.shouldQueue?.() === true && this.queue) {
      const job = new SendMailable({
        mailConnection: this.mailConnection,
        message: merged,
      });
      const options = this.resolveQueueOptions(mailable);
      await this.queue.dispatch(job, options);
      return;
    }

    await this.transport.send(merged);
  }

  private async mergeMessage(mailable: Mailable | MailMessage): Promise<MailMessage> {
    const resolved: MailMessage =
      mailable instanceof Mailable ? await mailable.toMessage() : mailable;
    let merged: MailMessage = {
      subject: resolved.subject,
      from: resolved.from ?? this.defaultFrom,
      to: resolved.to.length > 0 ? resolved.to : this.recipients,
      cc: resolved.cc,
      bcc: resolved.bcc,
      replyTo: resolved.replyTo,
      text: resolved.text,
      html: resolved.html,
      htmlView: resolved.htmlView,
      textView: resolved.textView,
      viewData: resolved.viewData,
      tags: resolved.tags,
    };

    if (this.viewEngine && (merged.htmlView || merged.textView)) {
      const locale = mailable instanceof Mailable
        ? mailable.locale
        : merged.locale;
      merged = await renderMailViews(this.viewEngine, merged, { locale });
    }

    if (merged.to.length === 0) {
      throw new Error('Mail message requires at least one recipient.');
    }
    return merged;
  }

  private resolveQueueOptions(mailable: Mailable): {
    connection?: string;
    queue?: string;
    delaySeconds?: number;
  } {
    return {
      connection: mailable.connection ?? this.queueDefaults.connection,
      queue: mailable.queue ?? this.queueDefaults.queue,
      delaySeconds: mailable.delaySeconds,
    };
  }
}

function normalizeAddress(entry: string | MailAddress): MailAddress {
  if (typeof entry === 'string') {
    return { address: entry };
  }
  return entry;
}

export function shouldQueueMailable(mailable: Mailable): boolean {
  return mailable.shouldQueue?.() === true;
}