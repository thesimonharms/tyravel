import { lineColumnAt } from './view-compile-error.js';

export type ViewLintRule =
  | 'unclosed-directive'
  | 'unknown-component'
  | 'unsafe-raw-echo';

export interface ViewLintIssue {
  rule: ViewLintRule;
  message: string;
  line: number;
  column?: number;
}

export interface ViewLintOptions {
  viewPath?: string;
  componentExists?: (name: string) => boolean;
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
const RAW_ECHO_RE = /\{!!\s*(.+?)\s*!!\}/g;

export function lintViewSource(
  source: string,
  options: ViewLintOptions = {},
): ViewLintIssue[] {
  const issues: ViewLintIssue[] = [];
  issues.push(...lintUnclosedDirectives(source, options.viewPath));
  issues.push(...lintUnknownComponents(source, options.componentExists));
  issues.push(...lintUnsafeRawEchoes(source));
  return issues;
}

function lintUnclosedDirectives(source: string, viewPath?: string): ViewLintIssue[] {
  const issues: ViewLintIssue[] = [];
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

function lintUnknownComponents(
  source: string,
  componentExists?: (name: string) => boolean,
): ViewLintIssue[] {
  if (!componentExists) {
    return [];
  }

  const issues: ViewLintIssue[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const line = takeLine(source, cursor);
    const trimmed = line.trim();
    const match = trimmed.match(COMPONENT_RE);

    if (match) {
      const name = match[1]!;
      if (!componentExists(name)) {
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

function lintUnsafeRawEchoes(source: string): ViewLintIssue[] {
  const issues: ViewLintIssue[] = [];
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