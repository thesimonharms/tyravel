export class ViewHelpers {
  private readonly sections = new Map<string, string>();
  private readonly componentPropsStack: Record<string, unknown>[] = [];
  private output = '';
  private chunks: string[] | null = null;
  private static readonly CHUNK_THRESHOLD = 8_192;

  constructor(
    private readonly stacks: Map<string, string[]> = new Map(),
    private readonly onceRendered: Set<string> = new Set(),
    componentPropsStack?: Record<string, unknown>[],
    private readonly stackOncePushed: Set<string> = new Set(),
  ) {
    if (componentPropsStack) {
      this.componentPropsStack.push(...componentPropsStack);
    }
  }

  append(value: string): void {
    if (!value) {
      return;
    }

    if (this.chunks) {
      this.chunks.push(value);
      return;
    }

    this.output += value;
    if (this.output.length >= ViewHelpers.CHUNK_THRESHOLD) {
      this.chunks = [this.output];
      this.output = '';
    }
  }

  setSection(name: string, content: string): void {
    this.sections.set(name, content);
  }

  importSections(sections: ReadonlyMap<string, string>): void {
    for (const [name, content] of sections) {
      this.sections.set(name, content);
    }
  }

  yield(name: string, defaultValue = ''): string {
    return this.sections.get(name) ?? defaultValue;
  }

  pushStack(name: string, content: string): void {
    const entries = this.stacks.get(name) ?? [];
    entries.push(content);
    this.stacks.set(name, entries);
  }

  prependStack(name: string, content: string): void {
    const entries = this.stacks.get(name) ?? [];
    entries.unshift(content);
    this.stacks.set(name, entries);
  }

  pushStackOnce(name: string, id: string, content: string): void {
    const key = `${name}:${id}`;
    if (this.stackOncePushed.has(key)) {
      return;
    }
    this.stackOncePushed.add(key);
    this.pushStack(name, content);
  }

  renderStack(name: string, defaultValue = ''): string {
    const entries = this.stacks.get(name);
    if (!entries || entries.length === 0) {
      return defaultValue;
    }
    return entries.join('\n');
  }

  getSections(): ReadonlyMap<string, string> {
    return this.sections;
  }

  getStacks(): Map<string, string[]> {
    return this.stacks;
  }

  getOnceRendered(): Set<string> {
    return this.onceRendered;
  }

  getStackOncePushed(): Set<string> {
    return this.stackOncePushed;
  }

  getComponentPropsStack(): Record<string, unknown>[] {
    return this.componentPropsStack;
  }

  pushComponentProps(props: Record<string, unknown>): void {
    this.componentPropsStack.push(props);
  }

  popComponentProps(): void {
    this.componentPropsStack.pop();
  }

  resolveAwareProps(keys: string[]): Record<string, unknown> {
    if (this.componentPropsStack.length === 0) {
      return {};
    }

    const parent = this.componentPropsStack[this.componentPropsStack.length - 1]!;
    const resolved: Record<string, unknown> = {};
    for (const key of keys) {
      if (key in parent) {
        resolved[key] = parent[key];
      }
    }
    return resolved;
  }

  hasRenderedOnce(id: string): boolean {
    return this.onceRendered.has(id);
  }

  markOnceRendered(id: string): void {
    this.onceRendered.add(id);
  }

  toString(): string {
    if (!this.chunks) {
      return this.output;
    }

    if (this.output) {
      this.chunks.push(this.output);
    }

    return this.chunks.length === 1 ? this.chunks[0]! : this.chunks.join('');
  }
}