import { connect as tlsConnect, type TLSSocket } from 'node:tls';
import { connect as netConnect, type Socket } from 'node:net';
import type { MailMessage, SmtpMailConfig } from './types.js';
import type { MailTransport } from './transport.js';
import { buildMimeMessage, dotStuff } from './mime.js';

export class SmtpMailTransport implements MailTransport {
  constructor(private readonly config: SmtpMailConfig) {}

  async send(message: MailMessage): Promise<void> {
    const encryption = this.config.encryption ?? 'tls';
    const port = this.config.port ?? (encryption === 'ssl' ? 465 : 587);
    const timeout = this.config.timeout ?? 30_000;

    const socket =
      encryption === 'ssl'
        ? await openSslSocket(this.config.host, port, timeout)
        : await openPlainSocket(this.config.host, port, timeout);

    try {
      await readGreeting(socket, timeout);
      await sendCommand(socket, `EHLO pondoknusa.local`, timeout);

      if (encryption === 'tls') {
        const reply = await sendCommand(socket, 'STARTTLS', timeout);
        if (!reply.startsWith('220')) {
          throw new Error(`SMTP STARTTLS failed: ${reply}`);
        }
        const upgraded = await upgradeTls(socket, this.config.host, timeout);
        await sendCommand(upgraded, `EHLO pondoknusa.local`, timeout);
        await authenticate(upgraded, this.config, timeout);
        await transmit(upgraded, message, timeout);
        await sendCommand(upgraded, 'QUIT', timeout);
        upgraded.end();
        return;
      }

      await authenticate(socket, this.config, timeout);
      await transmit(socket, message, timeout);
      await sendCommand(socket, 'QUIT', timeout);
    } finally {
      socket.end();
    }
  }
}

async function transmit(
  socket: Socket | TLSSocket,
  message: MailMessage,
  timeout: number,
): Promise<void> {
  const from = message.from!.address;
  await sendCommand(socket, `MAIL FROM:<${from}>`, timeout);
  for (const recipient of allRecipients(message)) {
    await sendCommand(socket, `RCPT TO:<${recipient}>`, timeout);
  }
  const body = dotStuff(buildMimeMessage(message));
  const dataReply = await sendCommand(socket, 'DATA', timeout);
  if (!dataReply.startsWith('354')) {
    throw new Error(`SMTP DATA rejected: ${dataReply}`);
  }
  socket.write(`${body}\r\n.\r\n`);
  const final = await readReply(socket, timeout);
  if (!final.startsWith('250')) {
    throw new Error(`SMTP message not accepted: ${final}`);
  }
}

function allRecipients(message: MailMessage): string[] {
  const set = new Set<string>();
  for (const entry of [...message.to, ...(message.cc ?? []), ...(message.bcc ?? [])]) {
    set.add(entry.address);
  }
  return [...set];
}

async function authenticate(
  socket: Socket | TLSSocket,
  config: SmtpMailConfig,
  timeout: number,
): Promise<void> {
  if (!config.username || !config.password) {
    return;
  }
  const modes = await sendCommand(socket, 'AUTH LOGIN', timeout);
  if (!modes.startsWith('334')) {
    throw new Error(`SMTP AUTH not supported: ${modes}`);
  }
  await sendCommand(socket, Buffer.from(config.username).toString('base64'), timeout);
  const passReply = await sendCommand(socket, Buffer.from(config.password).toString('base64'), timeout);
  if (!passReply.startsWith('235')) {
    throw new Error(`SMTP authentication failed: ${passReply}`);
  }
}

function openPlainSocket(host: string, port: number, timeout: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = netConnect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`SMTP connection timed out after ${timeout}ms`));
    }, timeout);
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
  });
}

function openSslSocket(host: string, port: number, timeout: number): Promise<TLSSocket> {
  return new Promise((resolve, reject) => {
    const socket = tlsConnect({ host, port, servername: host });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`SMTP SSL connection timed out after ${timeout}ms`));
    }, timeout);
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.once('secureConnect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
  });
}

function upgradeTls(socket: Socket, host: string, timeout: number): Promise<TLSSocket> {
  return new Promise((resolve, reject) => {
    const upgraded = tlsConnect({
      socket,
      servername: host,
    });
    const timer = setTimeout(() => {
      upgraded.destroy();
      reject(new Error(`SMTP TLS upgrade timed out after ${timeout}ms`));
    }, timeout);
    upgraded.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    upgraded.once('secureConnect', () => {
      clearTimeout(timer);
      resolve(upgraded);
    });
  });
}

async function readGreeting(socket: Socket | TLSSocket, timeout: number): Promise<void> {
  const reply = await readReply(socket, timeout);
  if (!reply.startsWith('220')) {
    throw new Error(`SMTP greeting failed: ${reply}`);
  }
}

async function sendCommand(
  socket: Socket | TLSSocket,
  command: string,
  timeout: number,
): Promise<string> {
  socket.write(`${command}\r\n`);
  return readReply(socket, timeout);
}

function readReply(socket: Socket | TLSSocket, timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => {
      socket.off('data', onData);
      reject(new Error(`SMTP read timed out after ${timeout}ms`));
    }, timeout);

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\r\n').filter((line) => line.length > 0);
      const last = lines.at(-1);
      if (!last || last.length < 4) {
        return;
      }
      const code = last.slice(0, 3);
      const cont = last[3];
      if (cont === '-') {
        return;
      }
      clearTimeout(timer);
      socket.off('data', onData);
      resolve(lines.join('\r\n'));
    };

    socket.on('data', onData);
  });
}