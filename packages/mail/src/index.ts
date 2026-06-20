export type { MailAddress, MailConfig, MailConnectionConfig, MailMessage, SmtpMailConfig } from './types.js';
export { SmtpMailTransport } from './smtp-transport.js';
export { buildMimeMessage } from './mime.js';
export { Mailable } from './mailable.js';
export { MailManager, Mailer, shouldQueueMailable } from './mail-manager.js';
export {
  ArrayMailTransport,
  LogMailTransport,
  type MailTransport,
} from './transport.js';
export { SendMailable } from './send-mailable.js';
export type { SendMailableData } from './send-mailable.js';
export { setQueuedMailContext } from './queued-mail-context.js';
export type { MailQueueBridge } from './queue-bridge.js';