import { BUILTIN_VIEW_DIRECTIVES } from './compiler.js';
import { BUILTIN_ESCAPE_CONTEXTS } from './escape.js';
import { lineColumnAt } from './view-compile-error.js';

export type ViewLintRule =
  | 'unclosed-directive'
  | 'unknown-component'
  | 'unknown-custom-directive'
  | 'unknown-escape-context'
  | 'duplicate-island'
  | 'unsafe-raw-echo';

export type ViewLintSeverity = 'error' | 'warning';

export interface ViewLintIssue {
  rule: ViewLintRule;
  message: string;
  line: number;
  column?: number;
  severity: ViewLintSeverity;
}

export interface ViewLintOptions {
  viewPath?: string;
  componentExists?: (name: string) => boolean | Promise<boolean>;
  escapeContexts?: ReadonlySet<string>;
  customDirectives?: ReadonlySet<string>;
  /** When true, every rule fails the lint run. Defaults to CI / TYRAVEL_VIEW_LINT_STRICT. */
  strict?: boolean;
}

const STRICT_ONLY_RULES = new Set<ViewLintRule>([
  'unclosed-directive',
  'unknown-component',
]);

export function resolveViewLintStrict(options: ViewLintOptions = {}): boolean {
  if (options.strict !== undefined) {
    return options.strict;
  }

  return process.env.TYRAVEL_VIEW_LINT_STRICT === '1' || process.env.CI === 'true';
}

function issueSeverity(rule: ViewLintRule, strict: boolean): ViewLintSeverity {
  if (strict || STRICT_ONLY_RULES.has(rule)) {
    return 'error';
  }

  return 'warning';
}

interface DirectivePair {
  open: RegExp;
  close: RegExp;
  label: string;
}

const DIRECTIVE_PAIRS: DirectivePair[] = [
  { open: /^@section\(/, close: /^@endsection\s*$/, label: '@section' },
  { open: /^@push\(/, close: /^@endpush\s*$/, label: '@push' },
  { open: /^@pushOnce\(/, close: /^@endpushOnce\s*$/, label: '@pushOnce' },
  { open: /^@prepend\(/, close: /^@endprepend\s*$/, label: '@prepend' },
  { open: /^@fragment\(/, close: /^@endfragment\s*$/, label: '@fragment' },
  { open: /^@stream\(/, close: /^@endstream\s*$/, label: '@stream' },
  { open: /^@island\(/, close: /^@endisland\s*$/, label: '@island' },
  { open: /^@if\s*\(/, close: /^@endif\s*$/, label: '@if' },
  { open: /^@unless\s*\(/, close: /^@endunless\s*$/, label: '@unless' },
  { open: /^@isset\s*\(/, close: /^@endisset\s*$/, label: '@isset' },
  { open: /^@empty\s*\(/, close: /^@endempty\s*$/, label: '@empty' },
  { open: /^@foreach\s*\(/, close: /^@endforeach\s*$/, label: '@foreach' },
  { open: /^@forelse\s*\(/, close: /^@endforelse\s*$/, label: '@forelse' },
  { open: /^@switch\s*\(/, close: /^@endswitch\s*$/, label: '@switch' },
  { open: /^@component\(/, close: /^@endcomponent\s*$/, label: '@component' },
  { open: /^@slot\(/, close: /^@endslot\s*$/, label: '@slot' },
  { open: /^@auth\s*$/, close: /^@endauth\s*$/, label: '@auth' },
  { open: /^@guest\s*$/, close: /^@endguest\s*$/, label: '@guest' },
  { open: /^@can\s*\(/, close: /^@endcan\s*$/, label: '@can' },
  { open: /^@env\s*\(/, close: /^@endenv\s*$/, label: '@env' },
  { open: /^@production\s*$/, close: /^@endproduction\s*$/, label: '@production' },
  { open: /^@local\s*$/, close: /^@endlocal\s*$/, label: '@local' },
  { open: /^@error\s*\(/, close: /^@enderror\s*$/, label: '@error' },
  { open: /^@once(?:\(|$)/, close: /^@endonce\s*$/, label: '@once' },
];

const COMPONENT_RE = /^@component\(\s*['"]([^'"]+)['"]/;
const CUSTOM_DIRECTIVE_RE = /^@([A-Za-z_][\w]*)\(.*\)\s*$/;
const ISLAND_RE = /^@island\(\s*['"]([^'"]+)['"]/;
const ESCAPE_RE = /^@escape\(\s*['"]([^'"]+)['"]/;
const RAW_ECHO_RE = /\{!!\s*(.+?)\s*!!\}/g;

export async function lintViewSource(
  source: string,
  options: ViewLintOptions = {},
): Promise<ViewLintIssue[]> {
  const strict = resolveViewLintStrict(options);
  const escapeContexts = options.escapeContexts ?? new Set(Object.keys(BUILTIN_ESCAPE_CONTEXTS));
  const issues: ViewLintIssue[] = [];
  issues.push(...withSeverity(lintUnclosedDirectives(source, options.viewPath), strict));
  issues.push(
    ...withSeverity(await lintUnknownComponents(source, options.componentExists), strict),
  );
  issues.push(...withSeverity(lintUnknownCustomDirectives(source, options.customDirectives), strict));
  issues.push(...withSeverity(lintDuplicateIslands(source), strict));
  issues.push(...withSeverity(lintUnknownEscapeContexts(source, escapeContexts), strict));
  issues.push(...withSeverity(lintUnsafeRawEchoes(source), strict));
  return issues;
}

export function lintHasErrors(issues: ViewLintIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}

function withSeverity(
  issues: Array<Omit<ViewLintIssue, 'severity'>>,
  strict: boolean,
): ViewLintIssue[] {
  return issues.map((issue) => ({
    ...issue,
    severity: issueSeverity(issue.rule, strict),
  }));
}

function lintUnclosedDirectives(
  source: string,
  viewPath?: string,
): Array<Omit<ViewLintIssue, 'severity'>> {
  const issues: Array<Omit<ViewLintIssue, 'severity'>> = [];
  const stack: Array<{ label: string; index: number }> = [];
  let cursor = 0;

  while (cursor < source.length) {
    const line = takeLine(source, cursor);
    const trimmed = line.trim();
    const lineStart = cursor + line.indexOf(trimmed);

    for (const pair of DIRECTIVE_PAIRS) {
      if (pair.open.test(trimmed)) {
        if (
          pair.label === '@component' &&
          /^@component\(\s*['"][^'"]+['"]\s*(?:,\s*.+)?\)\s*$/.test(trimmed)
        ) {
          continue;
        }
        stack.push({ label: pair.label, index: lineStart });
      }
      if (pair.close.test(trimmed)) {
        const opened = stack.pop();
        if (!opened) {
          const location = lineColumnAt(source, lineStart);
          issues.push({
            rule: 'unclosed-directive',
            message: `Unexpected closing directive for ${pair.label}${formatPath(viewPath, location.line, location.column)}`,
            line: location.line,
            column: location.column,
          });
        }
      }
    }

    cursor += line.length;
  }

  for (const opened of stack) {
    const location = lineColumnAt(source, opened.index);
    issues.push({
      rule: 'unclosed-directive',
      message: `Unclosed ${opened.label}; expected closing directive${formatPath(viewPath, location.line, location.column)}`,
      line: location.line,
      column: location.column,
    });
  }

  return issues;
}

async function lintUnknownComponents(
  source: string,
  componentExists?: (name: string) => boolean | Promise<boolean>,
): Promise<Array<Omit<ViewLintIssue, 'severity'>>> {
  if (!componentExists) {
    return [];
  }

  const issues: Array<Omit<ViewLintIssue, 'severity'>> = [];
  let cursor = 0;

  while (cursor < source.length) {
    const line = takeLine(source, cursor);
    const trimmed = line.trim();
    const match = trimmed.match(COMPONENT_RE);

    if (match) {
      const name = match[1]!;
      if (!(await componentExists(name))) {
        const lineStart = cursor + line.indexOf(trimmed);
        const location = lineColumnAt(source, lineStart);
        issues.push({
          rule: 'unknown-component',
          message: `Unknown component "${name}"`,
          line: location.line,
          column: location.column,
        });
      }
    }

    cursor += line.length;
  }

  return issues;
}

function lintUnknownCustomDirectives(
  source: string,
  customDirectives?: ReadonlySet<string>,
): Array<Omit<ViewLintIssue, 'severity'>> {
  if (!customDirectives) {
    return [];
  }

  const issues: Array<Omit<ViewLintIssue, 'severity'>> = [];
  let cursor = 0;

  while (cursor < source.length) {
    const line = takeLine(source, cursor);
    const trimmed = line.trim();
    const match = trimmed.match(CUSTOM_DIRECTIVE_RE);

    if (match) {
      const name = match[1]!;
      if (!BUILTIN_VIEW_DIRECTIVES.has(name) && !customDirectives.has(name)) {
        const lineStart = cursor + line.indexOf(trimmed);
        const location = lineColumnAt(source, lineStart);
        issues.push({
          rule: 'unknown-custom-directive',
          message: `Unknown custom directive @${name}(); register with View.directive('${name}', ...)`,
          line: location.line,
          column: location.column,
        });
      }
    }

    cursor += line.length;
  }

  return issues;
}

function lintDuplicateIslands(source: string): Array<Omit<ViewLintIssue, 'severity'>> {
  const issues: Array<Omit<ViewLintIssue, 'severity'>> = [];
  const seen = new Set<string>();
  let cursor = 0;

  while (cursor < source.length) {
    const line = takeLine(source, cursor);
    const trimmed = line.trim();
    const match = trimmed.match(ISLAND_RE);

    if (match) {
      const id = match[1]!;
      if (seen.has(id)) {
        const lineStart = cursor + line.indexOf(trimmed);
        const location = lineColumnAt(source, lineStart);
        issues.push({
          rule: 'duplicate-island',
          message: `Duplicate @island id "${id}"`,
          line: location.line,
          column: location.column,
        });
      }
      seen.add(id);
    }

    cursor += line.length;
  }

  return issues;
}

function lintUnknownEscapeContexts(
  source: string,
  escapeContexts: ReadonlySet<string>,
): Array<Omit<ViewLintIssue, 'severity'>> {
  const issues: Array<Omit<ViewLintIssue, 'severity'>> = [];
  let cursor = 0;

  while (cursor < source.length) {
    const line = takeLine(source, cursor);
    const trimmed = line.trim();
    const match = trimmed.match(ESCAPE_RE);

    if (match) {
      const context = match[1]!;
      if (!escapeContexts.has(context)) {
        const lineStart = cursor + line.indexOf(trimmed);
        const location = lineColumnAt(source, lineStart);
        issues.push({
          rule: 'unknown-escape-context',
          message: `Unknown escape context "${context}"`,
          line: location.line,
          column: location.column,
        });
      }
    }

    cursor += line.length;
  }

  return issues;
}

function lintUnsafeRawEchoes(source: string): Array<Omit<ViewLintIssue, 'severity'>> {
  const issues: Array<Omit<ViewLintIssue, 'severity'>> = [];
  RAW_ECHO_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = RAW_ECHO_RE.exec(source)) !== null) {
    const location = lineColumnAt(source, match.index);
    const expression = match[1]?.trim() ?? '';
    issues.push({
      rule: 'unsafe-raw-echo',
      message: `Unsafe raw echo {!! ${expression} !!}; prefer {{ }} unless output is trusted`,
      line: location.line,
      column: location.column,
    });
  }

  return issues;
}

function formatPath(viewPath: string | undefined, line: number, column: number): string {
  if (!viewPath) {
    return '';
  }
  return ` in ${viewPath} at line ${line}, column ${column}`;
}

function takeLine(source: string, start: number): string {
  const end = source.indexOf('\n', start);
  if (end === -1) {
    return source.slice(start);
  }
  return source.slice(start, end + 1);
}