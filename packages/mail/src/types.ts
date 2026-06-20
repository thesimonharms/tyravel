export interface MailAddress {
  address: string;
  name?: string;
}

export interface MailMessage {
  subject: string;
  from?: MailAddress;
  to: MailAddress[];
  cc?: MailAddress[];
  bcc?: MailAddress[];
  replyTo?: MailAddress;
  text?: string;
  html?: string;
  tags?: string[];
}

export interface ArrayMailConfig {
  driver: 'array';
}

export interface LogMailConfig {
  driver: 'log';
  channel?: 'stdout' | 'stderr';
}

export interface SmtpMailConfig {
  driver: 'smtp';
  host: string;
  port?: number;
  username?: string;
  password?: string;
  encryption?: 'tls' | 'ssl' | null;
  timeout?: number;
}

export type MailConnectionConfig = ArrayMailConfig | LogMailConfig | SmtpMailConfig;

export interface MailConfig {
  default: string;
  from: MailAddress;
  connections: Record<string, MailConnectionConfig>;
  queue?: string;
  queueConnection?: string;
}