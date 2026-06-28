export type DriverName = 'sqlite' | 'postgres' | 'mysql';

export interface SqlGrammar {
  readonly driver: DriverName;
  wrapIdentifier(identifier: string): string;
  parameter(index: number): string;
  readonly supportsReturning: boolean;
}

export class SqliteGrammar implements SqlGrammar {
  readonly driver = 'sqlite' as const;
  readonly supportsReturning = false;
  private readonly identifierCache = new Map<string, string>();

  wrapIdentifier(identifier: string): string {
    const cached = this.identifierCache.get(identifier);
    if (cached) {
      return cached;
    }

    const wrapped = `"${identifier.replaceAll('"', '""')}"`;
    this.identifierCache.set(identifier, wrapped);
    return wrapped;
  }

  parameter(): string {
    return '?';
  }
}

export class PostgresGrammar implements SqlGrammar {
  readonly driver = 'postgres' as const;
  readonly supportsReturning = true;
  private readonly identifierCache = new Map<string, string>();

  wrapIdentifier(identifier: string): string {
    const cached = this.identifierCache.get(identifier);
    if (cached) {
      return cached;
    }

    const wrapped = `"${identifier.replaceAll('"', '""')}"`;
    this.identifierCache.set(identifier, wrapped);
    return wrapped;
  }

  parameter(index: number): string {
    return `$${index}`;
  }
}

export class MysqlGrammar implements SqlGrammar {
  readonly driver = 'mysql' as const;
  readonly supportsReturning = false;
  private readonly identifierCache = new Map<string, string>();

  wrapIdentifier(identifier: string): string {
    const cached = this.identifierCache.get(identifier);
    if (cached) {
      return cached;
    }

    const wrapped = `\`${identifier.replaceAll('`', '``')}\``;
    this.identifierCache.set(identifier, wrapped);
    return wrapped;
  }

  parameter(): string {
    return '?';
  }
}