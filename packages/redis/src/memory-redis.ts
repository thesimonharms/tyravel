import type { RedisClient } from './types.js';

type ZSetEntry = { score: number; value: string };

export class MemoryRedis implements RedisClient {
  private readonly strings = new Map<string, string>();
  private readonly lists = new Map<string, string[]>();
  private readonly zsets = new Map<string, ZSetEntry[]>();

  async get(key: string): Promise<string | null> {
    return this.strings.get(key) ?? null;
  }

  async set(key: string, value: string, options?: { EX?: number; NX?: boolean }): Promise<string | null> {
    if (options?.NX && this.strings.has(key)) {
      return null;
    }
    this.strings.set(key, value);
    if (options?.EX) {
      setTimeout(() => this.strings.delete(key), options.EX * 1000).unref?.();
    }
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.strings.delete(key)) removed += 1;
      if (this.lists.delete(key)) removed += 1;
      if (this.zsets.delete(key)) removed += 1;
    }
    return removed;
  }

  async exists(...keys: string[]): Promise<number> {
    return keys.filter(
      (key) => this.strings.has(key) || this.lists.has(key) || this.zsets.has(key),
    ).length;
  }

  async *scanIterator(options: { MATCH: string; COUNT: number }): AsyncIterable<string> {
    const pattern = globToRegExp(options.MATCH);
    for (const key of this.allKeys()) {
      if (pattern.test(key)) {
        yield key;
      }
    }
  }

  async lPush(key: string, ...elements: string[]): Promise<number> {
    const list = this.lists.get(key) ?? [];
    list.unshift(...elements.reverse());
    this.lists.set(key, list);
    return list.length;
  }

  async rPop(key: string): Promise<string | null> {
    const list = this.lists.get(key);
    if (!list || list.length === 0) {
      return null;
    }
    return list.pop() ?? null;
  }

  async brPop(key: string, _timeout: number): Promise<{ key: string; element: string } | null> {
    const value = await this.rPop(key);
    return value ? { key, element: value } : null;
  }

  async zAdd(key: string, entry: { score: number; value: string }): Promise<number> {
    const set = this.zsets.get(key) ?? [];
    const existing = set.findIndex((item) => item.value === entry.value);
    if (existing >= 0) {
      set[existing] = entry;
    } else {
      set.push(entry);
    }
    this.zsets.set(key, set);
    return 1;
  }

  async zRangeByScore(key: string, min: number | string, max: number | string): Promise<string[]> {
    const minScore = Number(min);
    const maxScore = Number(max);
    const set = this.zsets.get(key) ?? [];
    return set
      .filter((entry) => entry.score >= minScore && entry.score <= maxScore)
      .sort((left, right) => left.score - right.score)
      .map((entry) => entry.value);
  }

  async zRem(key: string, ...members: string[]): Promise<number> {
    const set = this.zsets.get(key);
    if (!set) {
      return 0;
    }
    const remaining = set.filter((entry) => !members.includes(entry.value));
    const removed = set.length - remaining.length;
    if (remaining.length === 0) {
      this.zsets.delete(key);
    } else {
      this.zsets.set(key, remaining);
    }
    return removed;
  }

  async incr(key: string): Promise<number> {
    const current = Number(this.strings.get(key) ?? 0);
    const next = current + 1;
    this.strings.set(key, String(next));
    return next;
  }

  async quit(): Promise<string> {
    return 'OK';
  }

  private allKeys(): string[] {
    return [
      ...this.strings.keys(),
      ...this.lists.keys(),
      ...this.zsets.keys(),
    ];
  }
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}