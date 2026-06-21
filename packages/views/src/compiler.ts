import { createHash } from 'node:crypto';
import {
  parseAwareExpression,
  parsePropsExpression,
} from './component-helpers.js';
import { parseQuotedViewList } from './directive-parsers.js';
import type {
  CompiledTemplate,
  ConditionalMode,
  FormAttribute,
  SwitchCase,
  TemplateOp,
} from './types.js';
import { lineColumnAt, ViewCompileError } from './view-compile-error.js';

export interface CompileOptions {
  customDirectives?: ReadonlySet<string>;
  viewPath?: string;
}

export const BUILTIN_VIEW_DIRECTIVES = new Set([
  'layout',
  'section',
  'endsection',
  'yield',
  'include',
  'includeIf',
  'includeWhen',
  'includeFirst',
  'env',
  'endenv',
  'production',
  'endproduction',
  'local',
  'endlocal',
  'lang',
  'vite',
  'component',
  'endcomponent',
  'slot',
  'endslot',
  'if',
  'elseif',
  'else',
  'endif',
  'unless',
  'endunless',
  'isset',
  'endisset',
  'empty',
  'endempty',
  'foreach',
  'endforeach',
  'forelse',
  'endforelse',
  'push',
  'endpush',
  'pushOnce',
  'endpushOnce',
  'prepend',
  'endprepend',
  'stack',
  'inject',
  'fragment',
  'endfragment',
  'escape',
  'stream',
  'endstream',
  'island',
  'endisland',
  'auth',
  'endauth',
  'guest',
  'endguest',
  'can',
  'endcan',
  'once',
  'endonce',
  'csrf',
  'method',
  'json',
  'checked',
  'selected',
  'disabled',
  'readonly',
  'error',
  'enderror',
  'switch',
  'case',
  'break',
  'default',
  'endswitch',
  'props',
  'aware',
  'class',
  'style',
]);

const LAYOUT_RE = /^@layout\(\s*['"]([^'"]+)['"]\s*\)\s*$/m;
const SECTION_START_RE = /^@section\(\s*['"]([^'"]+)['"]\s*\)\s*$/;
const SECTION_END_RE = /^@endsection\s*$/;
const YIELD_RE = /^@yield\(\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]*)['"]\s*)?\)\s*$/;
const INCLUDE_RE = /^@include\(\s*['"]([^'"]+)['"]\s*(?:,\s*(.+))?\)\s*$/;
const INCLUDE_IF_RE = /^@includeIf\(\s*['"]([^'"]+)['"]\s*(?:,\s*(.+))?\)\s*$/;
const INCLUDE_WHEN_RE =
  /^@includeWhen\(\s*(.+?)\s*,\s*['"]([^'"]+)['"]\s*(?:,\s*(.+))?\)\s*$/;
const INCLUDE_FIRST_RE =
  /^@includeFirst\(\s*\[([^\]]+)\]\s*(?:,\s*(.+))?\)\s*$/;
const VIEW_NAME_RE = "['\"]([^'\"]+)['\"]";
const AUTH_RE = /^@auth\s*$/;
const ENDAUTH_RE = /^@endauth\s*$/;
const GUEST_RE = /^@guest\s*$/;
const ENDGUEST_RE = /^@endguest\s*$/;
const CAN_RE = /^@can\s*\((.+)\)\s*$/;
const ENDCAN_RE = /^@endcan\s*$/;
const ENV_RE = /^@env\s*\((.+)\)\s*$/;
const ENDENV_RE = /^@endenv\s*$/;
const PRODUCTION_RE = /^@production\s*$/;
const ENDPRODUCTION_RE = /^@endproduction\s*$/;
const LOCAL_RE = /^@local\s*$/;
const ENDLOCAL_RE = /^@endlocal\s*$/;
const LANG_RE = new RegExp(`^@lang\\(\\s*${VIEW_NAME_RE}\\s*(?:,\\s*(.+))?\\s*\\)`);
const VITE_RE = new RegExp(`^@vite\\(\\s*${VIEW_NAME_RE}\\s*\\)`);
const CUSTOM_DIRECTIVE_RE = /^@([A-Za-z_][\w]*)\((.*)\)\s*$/;
const COMPONENT_RE = /^@component\(\s*['"]([^'"]+)['"]\s*(?:,\s*(.+))?\)\s*$/;
const ENDCOMPONENT_RE = /^@endcomponent\s*$/;
const SLOT_START_RE = /^@slot\(\s*['"]([^'"]+)['"]\s*\)\s*$/;
const SLOT_END_RE = /^@endslot\s*$/;
const IF_RE = /^@if\s*\((.+)\)\s*$/;
const ELSEIF_RE = /^@elseif\s*\((.+)\)\s*$/;
const ELSE_RE = /^@else\s*$/;
const ENDIF_RE = /^@endif\s*$/;
const UNLESS_RE = /^@unless\s*\((.+)\)\s*$/;
const ENDUNLESS_RE = /^@endunless\s*$/;
const ISSET_RE = /^@isset\s*\((.+)\)\s*$/;
const ENDISSET_RE = /^@endisset\s*$/;
const EMPTY_RE = /^@empty\s*\((.+)\)\s*$/;
const ENDEMPTY_RE = /^@endempty\s*$/;
const FOREACH_RE = /^@foreach\s*\((.+)\)\s*$/;
const ENDFOREACH_RE = /^@endforeach\s*$/;
const FORELSE_RE = /^@forelse\s*\((.+)\)\s*$/;
const FORELSE_EMPTY_RE = /^@empty\s*$/;
const ENDFORELSE_RE = /^@endforelse\s*$/;
const ONCE_RE = /^@once(?:\(\s*['"]([^'"]+)['"]\s*\))?\s*$/;
const ENDONCE_RE = /^@endonce\s*$/;
const PUSH_START_RE = /^@push\(\s*['"]([^'"]+)['"]\s*\)\s*$/;
const PUSH_END_RE = /^@endpush\s*$/;
const PUSH_ONCE_START_RE =
  /^@pushOnce\(\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]+)['"]\s*)?\)\s*$/;
const PUSH_ONCE_END_RE = /^@endpushOnce\s*$/;
const PREPEND_START_RE = /^@prepend\(\s*['"]([^'"]+)['"]\s*\)\s*$/;
const PREPEND_END_RE = /^@endprepend\s*$/;
const STACK_RE = /^@stack\(\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]*)['"]\s*)?\)\s*$/;
const INJECT_RE = /^@inject\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)\s*$/;
const FRAGMENT_START_RE =
  /^@fragment\(\s*['"]([^'"]+)['"]\s*(?:,\s*(\d+))?\s*\)\s*$/;
const FRAGMENT_END_RE = /^@endfragment\s*$/;
const ESCAPE_RE = /^@escape\(\s*['"]([^'"]+)['"]\s*,\s*(.+)\s*\)\s*$/;
const STREAM_START_RE = /^@stream\(\s*['"]([^'"]+)['"]\s*\)\s*$/;
const STREAM_END_RE = /^@endstream\s*$/;
const ISLAND_START_RE =
  /^@island\(\s*['"]([^'"]+)['"]\s*(?:,\s*(.+))?\s*\)\s*$/;
const ISLAND_END_RE = /^@endisland\s*$/;
const UNKNOWN_DIRECTIVE_RE = /^@([A-Za-z_][\w]*)\b/;
const CSRF_RE = /^@csrf\s*$/;
const METHOD_RE = /^@method\(\s*['"]([^'"]+)['"]\s*\)\s*$/;
const JSON_RE = /^@json\s*\((.+)\)\s*$/;
const CHECKED_RE = /^@checked\s*\((.+)\)\s*$/;
const SELECTED_RE = /^@selected\s*\((.+)\)\s*$/;
const DISABLED_RE = /^@disabled\s*\((.+)\)\s*$/;
const READONLY_RE = /^@readonly\s*\((.+)\)\s*$/;
const ERROR_RE = /^@error\s*\(\s*['"]([^'"]+)['"]\s*\)\s*$/;
const ENDERROR_RE = /^@enderror\s*$/;
const SWITCH_RE = /^@switch\s*\((.+)\)\s*$/;
const CASE_RE = /^@case\s*\((.+)\)\s*$/;
const DEFAULT_CASE_RE = /^@default\s*$/;
const BREAK_RE = /^@break\s*$/;
const ENDSWITCH_RE = /^@endswitch\s*$/;
const ECHO_RE = /\{\{\s*(.+?)\s*\}\}/g;
const RAW_ECHO_RE = /\{!!\s*(.+?)\s*!!\}/g;

const PROPS_LINE_RE = /^@props\s*\(/;
const AWARE_LINE_RE = /^@aware\s*\(/;

export function compile(source: string, options: CompileOptions = {}): CompiledTemplate {
  const layoutMatch = source.match(LAYOUT_RE);
  const layout = layoutMatch?.[1];
  let body = layout ? source.replace(LAYOUT_RE, '').trimStart() : source;

  const props = extractLeadingDirective(body, 'props', parsePropsExpression);
  if (props.value !== undefined) {
    body = props.remaining;
  }

  const aware = extractLeadingDirective(body, 'aware', parseAwareExpression);
  if (aware.value !== undefined) {
    body = aware.remaining;
  }

  const useSlotAwareCompile =
    props.value !== undefined ||
    aware.value !== undefined ||
    hasComponentSlotDefinitions(body);

  if (useSlotAwareCompile) {
    const { defaultSlot, namedSlots } = parseSlotAwareBody(body, options);
    return {
      layout,
      ops: defaultSlot,
      props: props.value,
      aware: aware.value,
      defaultSlots: Object.keys(namedSlots).length > 0 ? namedSlots : undefined,
    };
  }

  return {
    layout,
    ops: parseOps(body, options),
    props: props.value,
    aware: aware.value,
  };
}

function extractLeadingDirective<T>(
  source: string,
  name: string,
  parse: (expression: string) => T,
): { value?: T; remaining: string } {
  const trimmedStart = source.trimStart();
  const leadingWhitespace = source.slice(0, source.length - trimmedStart.length);
  const firstLine = takeLine(trimmedStart, 0);
  const directive = firstLine.trim();

  if (name === 'props' && !PROPS_LINE_RE.test(directive)) {
    return { remaining: source };
  }
  if (name === 'aware' && !AWARE_LINE_RE.test(directive)) {
    return { remaining: source };
  }

  const parsed = parseExpressionDirective(directive, name);
  if (!parsed) {
    return { remaining: source };
  }

  const remaining = leadingWhitespace + trimmedStart.slice(firstLine.length).trimStart();
  return {
    value: parse(parsed.expression),
    remaining,
  };
}

function hasComponentSlotDefinitions(body: string): boolean {
  return /^@slot\(/m.test(body);
}

function parseOps(source: string, options: CompileOptions = {}): TemplateOp[] {
  const ops: TemplateOp[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const nextSpecial = findNextSpecial(source, cursor);

    if (nextSpecial === -1) {
      appendText(ops, source.slice(cursor));
      break;
    }

    if (nextSpecial > cursor) {
      appendText(ops, source.slice(cursor, nextSpecial));
      cursor = nextSpecial;
      continue;
    }

    const remaining = source.slice(cursor);

    if (remaining.startsWith('{{')) {
      const match = remaining.match(/^\{\{\s*(.+?)\s*\}\}/);
      if (match) {
        ops.push({ type: 'echo', expression: match[1]!, raw: false });
        cursor += match[0].length;
        continue;
      }
    }

    if (remaining.startsWith('{!!')) {
      const match = remaining.match(/^\{!!\s*(.+?)\s*!!\}/);
      if (match) {
        ops.push({ type: 'echo', expression: match[1]!, raw: true });
        cursor += match[0].length;
        continue;
      }
    }

    const line = takeLine(source, cursor);
    const trimmed = line.trim();
    const remainingAtCursor = source.slice(cursor);
    const lineStart = source.lastIndexOf('\n', cursor - 1) + 1;
    const beforeAtOnLine = source.slice(lineStart, cursor);

    if (remainingAtCursor.startsWith('@') && beforeAtOnLine.trim().length > 0) {
      const inline = parseInlineDirective(remainingAtCursor);
      if (inline) {
        ops.push(inline.op);
        cursor += inline.length;
        continue;
      }
    }

    const authMatch = trimmed.match(AUTH_RE);
    if (authMatch) {
      const block = parseModeConditionalBlock(source, cursor, AUTH_RE, ENDAUTH_RE, 'auth');
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const guestMatch = trimmed.match(GUEST_RE);
    if (guestMatch) {
      const block = parseModeConditionalBlock(source, cursor, GUEST_RE, ENDGUEST_RE, 'guest');
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const canMatch = trimmed.match(CAN_RE);
    if (canMatch) {
      const block = parseSimpleConditionalBlock(
        source,
        cursor,
        CAN_RE,
        ENDCAN_RE,
        'can',
      );
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const envMatch = trimmed.match(ENV_RE);
    if (envMatch) {
      const block = parseSimpleConditionalBlock(
        source,
        cursor,
        ENV_RE,
        ENDENV_RE,
        'env',
        options,
      );
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const productionMatch = trimmed.match(PRODUCTION_RE);
    if (productionMatch) {
      const block = parseModeConditionalBlock(
        source,
        cursor,
        PRODUCTION_RE,
        ENDPRODUCTION_RE,
        'production',
      );
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const localMatch = trimmed.match(LOCAL_RE);
    if (localMatch) {
      const block = parseModeConditionalBlock(
        source,
        cursor,
        LOCAL_RE,
        ENDLOCAL_RE,
        'local',
      );
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const switchMatch = trimmed.match(SWITCH_RE);
    if (switchMatch) {
      const block = parseSwitchBlock(source, cursor, options);
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const errorMatch = trimmed.match(ERROR_RE);
    if (errorMatch) {
      const block = parseSimpleConditionalBlock(
        source,
        cursor,
        ERROR_RE,
        ENDERROR_RE,
        'error',
        options,
      );
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const ifMatch = trimmed.match(IF_RE);
    if (ifMatch) {
      const block = parseConditionalBlock(source, cursor, options);
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const unlessMatch = trimmed.match(UNLESS_RE);
    if (unlessMatch) {
      const block = parseSimpleConditionalBlock(
        source,
        cursor,
        UNLESS_RE,
        ENDUNLESS_RE,
        'unless',
        options,
      );
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const issetMatch = trimmed.match(ISSET_RE);
    if (issetMatch) {
      const block = parseSimpleConditionalBlock(
        source,
        cursor,
        ISSET_RE,
        ENDISSET_RE,
        'isset',
        options,
      );
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const emptyMatch = trimmed.match(EMPTY_RE);
    if (emptyMatch) {
      const block = parseSimpleConditionalBlock(
        source,
        cursor,
        EMPTY_RE,
        ENDEMPTY_RE,
        'empty',
        options,
      );
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const forelseMatch = trimmed.match(FORELSE_RE);
    if (forelseMatch) {
      const block = parseForelseBlock(source, cursor, options);
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const foreachMatch = trimmed.match(FOREACH_RE);
    if (foreachMatch) {
      const block = parseForeachBlock(source, cursor, options);
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const onceMatch = trimmed.match(ONCE_RE);
    if (onceMatch) {
      const block = parseOnceBlock(source, cursor, onceMatch[1], options);
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const pushMatch = trimmed.match(PUSH_START_RE);
    if (pushMatch) {
      const block = parsePushBlock(source, cursor, pushMatch[1]!, options);
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const pushOnceMatch = trimmed.match(PUSH_ONCE_START_RE);
    if (pushOnceMatch) {
      const block = parsePushOnceBlock(
        source,
        cursor,
        pushOnceMatch[1]!,
        pushOnceMatch[2],
        options,
      );
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const prependMatch = trimmed.match(PREPEND_START_RE);
    if (prependMatch) {
      const block = parsePrependBlock(source, cursor, prependMatch[1]!, options);
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const injectMatch = trimmed.match(INJECT_RE);
    if (injectMatch) {
      ops.push({
        type: 'inject',
        varName: injectMatch[1]!,
        binding: injectMatch[2]!,
      });
      cursor += line.length;
      continue;
    }

    const fragmentMatch = trimmed.match(FRAGMENT_START_RE);
    if (fragmentMatch) {
      const block = parseFragmentBlock(
        source,
        cursor,
        fragmentMatch[1]!,
        fragmentMatch[2] ? Number(fragmentMatch[2]) : undefined,
        options,
      );
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const streamMatch = trimmed.match(STREAM_START_RE);
    if (streamMatch) {
      const block = parseStreamBlock(source, cursor, streamMatch[1]!, options);
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const islandMatch = trimmed.match(ISLAND_START_RE);
    if (islandMatch) {
      const block = parseIslandBlock(
        source,
        cursor,
        islandMatch[1]!,
        islandMatch[2]?.trim(),
        options,
      );
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const escapeMatch = trimmed.match(ESCAPE_RE);
    if (escapeMatch) {
      ops.push({
        type: 'escape',
        context: escapeMatch[1]!,
        expression: escapeMatch[2]!.trim(),
      });
      cursor += line.length;
      continue;
    }

    const stackMatch = trimmed.match(STACK_RE);
    if (stackMatch) {
      ops.push({
        type: 'stack',
        name: stackMatch[1]!,
        defaultValue: stackMatch[2],
      });
      cursor += line.length;
      continue;
    }

    const langMatch = trimmed.match(LANG_RE);
    if (langMatch) {
      ops.push({
        type: 'lang',
        key: langMatch[1]!,
        replaceExpression: langMatch[2]?.trim(),
      });
      cursor += line.length;
      continue;
    }

    const viteMatch = trimmed.match(VITE_RE);
    if (viteMatch) {
      ops.push({ type: 'vite', entry: viteMatch[1]! });
      cursor += line.length;
      continue;
    }

    if (CSRF_RE.test(trimmed)) {
      ops.push({ type: 'csrf' });
      cursor += line.length;
      continue;
    }

    const methodMatch = trimmed.match(METHOD_RE);
    if (methodMatch) {
      ops.push({ type: 'method', verb: methodMatch[1]! });
      cursor += line.length;
      continue;
    }

    const jsonMatch = trimmed.match(JSON_RE);
    if (jsonMatch) {
      ops.push({ type: 'json', expression: jsonMatch[1]!.trim() });
      cursor += line.length;
      continue;
    }

    const checkedMatch = trimmed.match(CHECKED_RE);
    if (checkedMatch) {
      ops.push({
        type: 'formAttr',
        attribute: 'checked',
        expression: checkedMatch[1]!.trim(),
      });
      cursor += line.length;
      continue;
    }

    const selectedMatch = trimmed.match(SELECTED_RE);
    if (selectedMatch) {
      ops.push({
        type: 'formAttr',
        attribute: 'selected',
        expression: selectedMatch[1]!.trim(),
      });
      cursor += line.length;
      continue;
    }

    const disabledMatch = trimmed.match(DISABLED_RE);
    if (disabledMatch) {
      ops.push({
        type: 'formAttr',
        attribute: 'disabled',
        expression: disabledMatch[1]!.trim(),
      });
      cursor += line.length;
      continue;
    }

    const readonlyMatch = trimmed.match(READONLY_RE);
    if (readonlyMatch) {
      ops.push({
        type: 'formAttr',
        attribute: 'readonly',
        expression: readonlyMatch[1]!.trim(),
      });
      cursor += line.length;
      continue;
    }

    const sectionMatch = trimmed.match(SECTION_START_RE);
    if (sectionMatch) {
      const block = parseSectionBlock(source, cursor, sectionMatch[1]!, options);
      ops.push(block.op);
      cursor = block.end;
      continue;
    }

    const yieldMatch = trimmed.match(YIELD_RE);
    if (yieldMatch) {
      ops.push({
        type: 'yield',
        name: yieldMatch[1]!,
        defaultValue: yieldMatch[2],
      });
      cursor += line.length;
      continue;
    }

    const includeMatch = trimmed.match(INCLUDE_RE);
    if (includeMatch) {
      ops.push({
        type: 'include',
        name: includeMatch[1]!,
        dataExpression: includeMatch[2]?.trim(),
      });
      cursor += line.length;
      continue;
    }

    const includeIfMatch = trimmed.match(INCLUDE_IF_RE);
    if (includeIfMatch) {
      ops.push({
        type: 'includeIf',
        name: includeIfMatch[1]!,
        dataExpression: includeIfMatch[2]?.trim(),
      });
      cursor += line.length;
      continue;
    }

    const includeWhenMatch = trimmed.match(INCLUDE_WHEN_RE);
    if (includeWhenMatch) {
      ops.push({
        type: 'includeWhen',
        conditionExpression: includeWhenMatch[1]!.trim(),
        name: includeWhenMatch[2]!,
        dataExpression: includeWhenMatch[3]?.trim(),
      });
      cursor += line.length;
      continue;
    }

    const includeFirstMatch = trimmed.match(INCLUDE_FIRST_RE);
    if (includeFirstMatch) {
      ops.push({
        type: 'includeFirst',
        names: parseQuotedViewList(includeFirstMatch[1]!),
        dataExpression: includeFirstMatch[2]?.trim(),
      });
      cursor += line.length;
      continue;
    }

    const customMatch = trimmed.match(CUSTOM_DIRECTIVE_RE);
    if (customMatch) {
      const directiveName = customMatch[1]!;
      if (
        options.customDirectives?.has(directiveName) &&
        !BUILTIN_VIEW_DIRECTIVES.has(directiveName)
      ) {
        ops.push({
          type: 'custom',
          name: directiveName,
          expression: customMatch[2]!.trim(),
        });
        cursor += line.length;
        continue;
      }
    }

    const componentMatch = trimmed.match(COMPONENT_RE);
    if (componentMatch) {
      const closeAt = findPartnerEndComponent(source, cursor + line.length);
      if (closeAt !== -1) {
        const block = parseComponentBlock(
          source,
          cursor,
          componentMatch[1]!,
          componentMatch[2]?.trim(),
          closeAt,
          options,
        );
        ops.push(block.op);
        cursor = block.end;
        continue;
      }

      ops.push({
        type: 'component',
        name: componentMatch[1]!,
        dataExpression: componentMatch[2]?.trim(),
      });
      cursor += line.length;
      continue;
    }

    if (
      trimmed.startsWith('@') &&
      !trimmed.startsWith('@end') &&
      UNKNOWN_DIRECTIVE_RE.test(trimmed) &&
      /^@[A-Za-z_][\w]*(?:\([^)]*\))?\s*$/.test(trimmed)
    ) {
      throw compileError(
        `Unrecognized view directive ${trimmed.match(UNKNOWN_DIRECTIVE_RE)?.[0] ?? trimmed}`,
        source,
        cursor,
        options,
      );
    }

    appendText(ops, line);
    cursor += line.length;
  }

  return ops;
}

function parseModeConditionalBlock(
  source: string,
  start: number,
  startRe: RegExp,
  endRe: RegExp,
  mode: ConditionalMode,
  options: CompileOptions = {},
): { op: TemplateOp; end: number } {
  const firstLine = takeLine(source, start);
  const contentStart = start + firstLine.length;
  const contentEnd = findNestedEnd(source, contentStart, startRe, endRe);
  const endLine = takeLine(source, contentEnd);

  return {
    op: {
      type: 'if',
      mode,
      expression: '',
      body: parseOps(source.slice(contentStart, contentEnd), options),
    },
    end: contentEnd + endLine.length,
  };
}

function parseConditionalBlock(
  source: string,
  start: number,
  options: CompileOptions = {},
): { op: TemplateOp; end: number } {
  const firstLine = takeLine(source, start);
  const expression = firstLine.trim().match(IF_RE)?.[1] ?? 'false';
  const contentStart = start + firstLine.length;
  const contentEnd = findNestedEnd(source, contentStart, IF_RE, ENDIF_RE);
  const endifLine = takeLine(source, contentEnd);
  const branches = splitConditionalBranches(source.slice(contentStart, contentEnd), options);
  const [first, ...rest] = branches;
  const elseBody = rest.length > 0 ? flattenBranches(rest) : undefined;

  return {
    op: {
      type: 'if',
      expression,
      body: first?.body ?? [],
      elseBody,
    },
    end: contentEnd + endifLine.length,
  };
}

function splitConditionalBranches(
  content: string,
  options: CompileOptions = {},
): Array<{ expression?: string; body: TemplateOp[] }> {
  const branches: Array<{ expression?: string; body: TemplateOp[] }> = [{ body: [] }];
  let cursor = 0;

  while (cursor < content.length) {
    const line = takeLine(content, cursor);
    const trimmed = line.trim();

    if (ELSEIF_RE.test(trimmed)) {
      branches.push({
        expression: trimmed.match(ELSEIF_RE)?.[1],
        body: [],
      });
      cursor += line.length;
      continue;
    }

    if (ELSE_RE.test(trimmed)) {
      branches.push({ body: [] });
      cursor += line.length;
      continue;
    }

    const end = findBlockBoundary(content, cursor, [ELSEIF_RE, ELSE_RE]);
    const chunk = content.slice(cursor, end);
    const current = branches[branches.length - 1];

    if (current && chunk.length > 0) {
      current.body.push(...parseOps(chunk, options));
    }

    if (end <= cursor) {
      cursor += Math.max(line.length, 1);
      continue;
    }

    cursor = end;
  }

  return branches;
}

function flattenBranches(
  branches: Array<{ expression?: string; body: TemplateOp[] }>,
): TemplateOp[] {
  if (branches.length === 0) {
    return [];
  }

  const [current, ...remaining] = branches;

  if (!current) {
    return [];
  }

  if (current.expression === undefined) {
    return current.body;
  }

  return [
    {
      type: 'if',
      expression: current.expression,
      body: current.body,
      elseBody: flattenBranches(remaining),
    },
  ];
}

function parseSimpleConditionalBlock(
  source: string,
  start: number,
  startRe: RegExp,
  endRe: RegExp,
  mode: ConditionalMode,
  options: CompileOptions = {},
): { op: TemplateOp; end: number } {
  const firstLine = takeLine(source, start);
  const expression = firstLine.trim().match(startRe)?.[1] ?? '';
  const contentStart = start + firstLine.length;
  const contentEnd = findNestedEnd(source, contentStart, startRe, endRe);
  const endLine = takeLine(source, contentEnd);

  return {
    op: {
      type: 'if',
      mode,
      expression,
      body: parseOps(source.slice(contentStart, contentEnd), options),
    },
    end: contentEnd + endLine.length,
  };
}

function parseForelseBlock(
  source: string,
  start: number,
  options: CompileOptions = {},
): { op: TemplateOp; end: number } {
  const firstLine = takeLine(source, start);
  const expression = firstLine.trim().match(FORELSE_RE)?.[1] ?? '[]';
  const contentStart = start + firstLine.length;
  const contentEnd = findNestedEnd(source, contentStart, FORELSE_RE, ENDFORELSE_RE);
  const endLine = takeLine(source, contentEnd);
  const content = source.slice(contentStart, contentEnd);
  const emptyBoundary = findForelseEmptyBoundary(content);

  return {
    op: {
      type: 'forelse',
      expression,
      body: parseOps(content.slice(0, emptyBoundary.start), options),
      emptyBody: parseOps(content.slice(emptyBoundary.end), options),
    },
    end: contentEnd + endLine.length,
  };
}

function findForelseEmptyBoundary(content: string): { start: number; end: number } {
  let cursor = 0;
  let depth = 0;

  while (cursor < content.length) {
    const line = takeLine(content, cursor);
    const trimmed = line.trim();

    if (FORELSE_RE.test(trimmed)) {
      depth += 1;
    }

    if (ENDFORELSE_RE.test(trimmed)) {
      depth -= 1;
    }

    if (FORELSE_EMPTY_RE.test(trimmed) && depth === 0) {
      const end = cursor + line.length;
      return { start: cursor, end };
    }

    cursor += line.length;
  }

  return { start: content.length, end: content.length };
}

function parseSwitchBlock(
  source: string,
  start: number,
  options: CompileOptions = {},
): { op: TemplateOp; end: number } {
  const firstLine = takeLine(source, start);
  const expression = firstLine.trim().match(SWITCH_RE)?.[1] ?? 'null';
  const contentStart = start + firstLine.length;
  const contentEnd = findNestedEnd(source, contentStart, SWITCH_RE, ENDSWITCH_RE);
  const endLine = takeLine(source, contentEnd);
  const { cases, defaultBody } = splitSwitchCases(
    source.slice(contentStart, contentEnd),
    options,
  );

  return {
    op: {
      type: 'switch',
      expression,
      cases,
      defaultBody,
    },
    end: contentEnd + endLine.length,
  };
}

function splitSwitchCases(
  content: string,
  options: CompileOptions = {},
): { cases: SwitchCase[]; defaultBody?: TemplateOp[] } {
  const cases: SwitchCase[] = [];
  let defaultBody: TemplateOp[] | undefined;
  let cursor = 0;
  let current: SwitchCase | undefined;

  const flush = (): void => {
    if (!current) {
      return;
    }
    cases.push(current);
    current = undefined;
  };

  while (cursor < content.length) {
    const line = takeLine(content, cursor);
    const trimmed = line.trim();

    if (CASE_RE.test(trimmed)) {
      flush();
      current = {
        labelExpression: trimmed.match(CASE_RE)?.[1]?.trim(),
        body: [],
      };
      cursor += line.length;
      continue;
    }

    if (DEFAULT_CASE_RE.test(trimmed)) {
      flush();
      const chunkStart = cursor + line.length;
      const chunkEnd = findSwitchChunkEnd(content, chunkStart);
      defaultBody = parseOps(stripBreakLines(content.slice(chunkStart, chunkEnd)), options);
      cursor = chunkEnd;
      continue;
    }

    if (BREAK_RE.test(trimmed)) {
      cursor += line.length;
      continue;
    }

    if (!current) {
      cursor += line.length;
      continue;
    }

    const chunkEnd = findSwitchChunkEnd(content, cursor);
    const chunk = stripBreakLines(content.slice(cursor, chunkEnd));
    if (chunk.trim().length > 0) {
      current.body.push(...parseOps(chunk, options));
    }
    cursor = chunkEnd;
  }

  flush();
  return { cases, defaultBody };
}

function findSwitchChunkEnd(content: string, start: number): number {
  let cursor = start;

  while (cursor < content.length) {
    const line = takeLine(content, cursor);
    const trimmed = line.trim();

    if (
      CASE_RE.test(trimmed) ||
      DEFAULT_CASE_RE.test(trimmed) ||
      SWITCH_RE.test(trimmed) ||
      ENDSWITCH_RE.test(trimmed)
    ) {
      return cursor;
    }

    cursor += line.length;
  }

  return content.length;
}

function stripBreakLines(content: string): string {
  let cursor = 0;
  let output = '';

  while (cursor < content.length) {
    const line = takeLine(content, cursor);
    if (!BREAK_RE.test(line.trim())) {
      output += line;
    }
    cursor += line.length;
  }

  return output;
}

function parseOnceBlock(
  source: string,
  start: number,
  explicitId: string | undefined,
  options: CompileOptions = {},
): { op: TemplateOp; end: number } {
  const headerLine = takeLine(source, start);
  const contentStart = start + headerLine.length;
  const contentEnd = findNestedEnd(source, contentStart, ONCE_RE, ENDONCE_RE);
  const endLine = takeLine(source, contentEnd);
  const id =
    explicitId ??
    createHash('sha256').update(`${start}:${contentStart}:${contentEnd}`).digest('hex');

  return {
    op: {
      type: 'once',
      id,
      body: parseOps(source.slice(contentStart, contentEnd), options),
    },
    end: contentEnd + endLine.length,
  };
}

function parsePushBlock(
  source: string,
  start: number,
  name: string,
  options: CompileOptions = {},
): { op: TemplateOp; end: number } {
  const headerLine = takeLine(source, start);
  const contentStart = start + headerLine.length;
  const contentEnd = findNestedEnd(
    source,
    contentStart,
    PUSH_START_RE,
    PUSH_END_RE,
    start,
    '@endpush',
    options,
  );
  const endLine = takeLine(source, contentEnd);

  return {
    op: {
      type: 'push',
      name,
      body: parseOps(source.slice(contentStart, contentEnd), options),
    },
    end: contentEnd + endLine.length,
  };
}

function parsePushOnceBlock(
  source: string,
  start: number,
  name: string,
  explicitId: string | undefined,
  options: CompileOptions = {},
): { op: TemplateOp; end: number } {
  const headerLine = takeLine(source, start);
  const contentStart = start + headerLine.length;
  const contentEnd = findNestedEnd(
    source,
    contentStart,
    PUSH_ONCE_START_RE,
    PUSH_ONCE_END_RE,
    start,
    '@endpushOnce',
    options,
  );
  const endLine = takeLine(source, contentEnd);
  const bodySource = source.slice(contentStart, contentEnd);
  const id =
    explicitId ??
    createHash('sha256').update(`${name}:${bodySource}`).digest('hex');

  return {
    op: {
      type: 'pushOnce',
      name,
      id,
      body: parseOps(bodySource, options),
    },
    end: contentEnd + endLine.length,
  };
}

function parsePrependBlock(
  source: string,
  start: number,
  name: string,
  options: CompileOptions = {},
): { op: TemplateOp; end: number } {
  const headerLine = takeLine(source, start);
  const contentStart = start + headerLine.length;
  const contentEnd = findNestedEnd(
    source,
    contentStart,
    PREPEND_START_RE,
    PREPEND_END_RE,
    start,
    '@endprepend',
    options,
  );
  const endLine = takeLine(source, contentEnd);

  return {
    op: {
      type: 'prepend',
      name,
      body: parseOps(source.slice(contentStart, contentEnd), options),
    },
    end: contentEnd + endLine.length,
  };
}

function parseStreamBlock(
  source: string,
  start: number,
  name: string,
  options: CompileOptions = {},
): { op: TemplateOp; end: number } {
  const headerLine = takeLine(source, start);
  const contentStart = start + headerLine.length;
  const contentEnd = findNestedEnd(
    source,
    contentStart,
    STREAM_START_RE,
    STREAM_END_RE,
    start,
    '@endstream',
    options,
  );
  const endLine = takeLine(source, contentEnd);

  return {
    op: {
      type: 'stream',
      name,
      body: parseOps(source.slice(contentStart, contentEnd), options),
    },
    end: contentEnd + endLine.length,
  };
}

function parseIslandBlock(
  source: string,
  start: number,
  id: string,
  propsExpression: string | undefined,
  options: CompileOptions = {},
): { op: TemplateOp; end: number } {
  const headerLine = takeLine(source, start);
  const contentStart = start + headerLine.length;
  const contentEnd = findNestedEnd(
    source,
    contentStart,
    ISLAND_START_RE,
    ISLAND_END_RE,
    start,
    '@endisland',
    options,
  );
  const endLine = takeLine(source, contentEnd);

  return {
    op: {
      type: 'island',
      id,
      propsExpression,
      body: parseOps(source.slice(contentStart, contentEnd), options),
    },
    end: contentEnd + endLine.length,
  };
}

function parseFragmentBlock(
  source: string,
  start: number,
  name: string,
  ttlSeconds: number | undefined,
  options: CompileOptions = {},
): { op: TemplateOp; end: number } {
  const headerLine = takeLine(source, start);
  const contentStart = start + headerLine.length;
  const contentEnd = findNestedEnd(
    source,
    contentStart,
    FRAGMENT_START_RE,
    FRAGMENT_END_RE,
    start,
    '@endfragment',
    options,
  );
  const endLine = takeLine(source, contentEnd);

  return {
    op: {
      type: 'fragment',
      name,
      ttlSeconds,
      body: parseOps(source.slice(contentStart, contentEnd), options),
    },
    end: contentEnd + endLine.length,
  };
}

function parseForeachBlock(
  source: string,
  start: number,
  options: CompileOptions = {},
): { op: TemplateOp; end: number } {
  const firstLine = takeLine(source, start);
  const expression = firstLine.trim().match(FOREACH_RE)?.[1] ?? '[]';
  const contentStart = start + firstLine.length;
  const contentEnd = findNestedEnd(source, contentStart, FOREACH_RE, ENDFOREACH_RE);
  const endLine = takeLine(source, contentEnd);

  return {
    op: {
      type: 'foreach',
      expression,
      body: parseOps(source.slice(contentStart, contentEnd), options),
    },
    end: contentEnd + endLine.length,
  };
}

function parseComponentBlock(
  source: string,
  start: number,
  name: string,
  dataExpression: string | undefined,
  closeAt: number,
  options: CompileOptions = {},
): { op: TemplateOp; end: number } {
  const headerLine = takeLine(source, start);
  const bodyStart = start + headerLine.length;
  const body = source.slice(bodyStart, closeAt);
  const closeLine = takeLine(source, closeAt);
  const { defaultSlot, namedSlots } = parseSlotAwareBody(body, options);

  return {
    op: {
      type: 'component',
      name,
      dataExpression,
      defaultSlot: defaultSlot.length > 0 ? defaultSlot : undefined,
      namedSlots: Object.keys(namedSlots).length > 0 ? namedSlots : undefined,
    },
    end: closeAt + closeLine.length,
  };
}

function findPartnerEndComponent(source: string, searchStart: number): number {
  let depth = 1;
  let cursor = searchStart;

  while (cursor < source.length) {
    const line = takeLine(source, cursor);
    const trimmed = line.trim();

    if (COMPONENT_RE.test(trimmed)) {
      depth += 1;
    }

    if (ENDCOMPONENT_RE.test(trimmed)) {
      depth -= 1;
      if (depth === 0) {
        return cursor;
      }
    }

    cursor += line.length;
  }

  return -1;
}

function parseSlotAwareBody(
  content: string,
  options: CompileOptions = {},
): {
  defaultSlot: TemplateOp[];
  namedSlots: Record<string, TemplateOp[]>;
} {
  const defaultSlot: TemplateOp[] = [];
  const namedSlots: Record<string, TemplateOp[]> = {};
  let cursor = 0;

  while (cursor < content.length) {
    const line = takeLine(content, cursor);
    const trimmed = line.trim();
    const slotMatch = trimmed.match(SLOT_START_RE);

    if (slotMatch) {
      const slotContentStart = cursor + line.length;
      const slotContentEnd = findNestedEnd(
        content,
        slotContentStart,
        SLOT_START_RE,
        SLOT_END_RE,
      );
      const endLine = takeLine(content, slotContentEnd);
      namedSlots[slotMatch[1]!] = parseOps(
        content.slice(slotContentStart, slotContentEnd),
        options,
      );
      cursor = slotContentEnd + endLine.length;
      continue;
    }

    const nextSlot = findNextSlotStart(content, cursor);
    const chunkEnd = nextSlot === -1 ? content.length : nextSlot;
    const chunk = content.slice(cursor, chunkEnd);

    if (chunk.trim().length > 0) {
      defaultSlot.push(...parseOps(chunk, options));
    }

    cursor = nextSlot === -1 ? content.length : nextSlot;
  }

  return { defaultSlot, namedSlots };
}

function findNextSlotStart(source: string, start: number): number {
  let cursor = start;

  while (cursor < source.length) {
    const line = takeLine(source, cursor);
    if (SLOT_START_RE.test(line.trim())) {
      return cursor;
    }
    cursor += line.length;
  }

  return -1;
}

function parseSectionBlock(
  source: string,
  start: number,
  name: string,
  options: CompileOptions = {},
): { op: TemplateOp; end: number } {
  const headerLine = takeLine(source, start);
  const contentStart = start + headerLine.length;
  const contentEnd = findNestedEnd(source, contentStart, SECTION_START_RE, SECTION_END_RE);
  const endLine = takeLine(source, contentEnd);

  return {
    op: {
      type: 'section',
      name,
      body: parseOps(source.slice(contentStart, contentEnd), options),
    },
    end: contentEnd + endLine.length,
  };
}

function findNestedEnd(
  source: string,
  start: number,
  openRe: RegExp,
  closeRe: RegExp,
  blockStart = start,
  closeDirective = '@end',
  options: CompileOptions = {},
): number {
  let cursor = start;
  let depth = 0;

  while (cursor < source.length) {
    const line = takeLine(source, cursor);
    const trimmed = line.trim();

    if (openRe.test(trimmed)) {
      depth += 1;
    }

    if (closeRe.test(trimmed)) {
      if (depth === 0) {
        return cursor;
      }
      depth -= 1;
    }

    cursor += line.length;
  }

  throw compileError(
    `Unclosed directive; expected ${closeDirective}`,
    source,
    blockStart,
    options,
  );
}

function compileError(
  message: string,
  source: string,
  index: number,
  options: CompileOptions,
): ViewCompileError {
  const { line, column } = lineColumnAt(source, index);
  return new ViewCompileError(message, {
    viewPath: options.viewPath,
    line,
    column,
  });
}

function findBlockBoundary(
  source: string,
  start: number,
  patterns: RegExp[],
): number {
  let cursor = start;

  while (cursor < source.length) {
    const line = takeLine(source, cursor);
    const trimmed = line.trim();

    if (patterns.some((pattern) => pattern.test(trimmed))) {
      return cursor;
    }

    if (source.slice(cursor).startsWith('{{') || source.slice(cursor).startsWith('{!!')) {
      return cursor;
    }

    cursor += line.length;
  }

  return source.length;
}

function findNextSpecial(source: string, start: number): number {
  const indexes = [
    source.indexOf('{{', start),
    source.indexOf('{!!', start),
    source.indexOf('@', start),
  ].filter((index) => index !== -1);

  return indexes.length > 0 ? Math.min(...indexes) : -1;
}

function takeLine(source: string, start: number): string {
  const end = source.indexOf('\n', start);
  if (end === -1) {
    return source.slice(start);
  }
  return source.slice(start, end + 1);
}

function appendText(ops: TemplateOp[], value: string): void {
  if (!value) {
    return;
  }

  for (const op of parseTextWithDirectives(value)) {
    const last = ops[ops.length - 1];
    if (op.type === 'text' && last?.type === 'text') {
      last.value += op.value;
      continue;
    }
    ops.push(op);
  }
}

function parseTextWithDirectives(text: string): TemplateOp[] {
  const ops: TemplateOp[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const nextAt = text.indexOf('@', cursor);
    if (nextAt === -1) {
      pushTextOp(ops, text.slice(cursor));
      break;
    }

    if (nextAt > cursor) {
      pushTextOp(ops, text.slice(cursor, nextAt));
    }

    const remaining = text.slice(nextAt);
    const inline = parseInlineDirective(remaining);
    if (inline) {
      ops.push(inline.op);
      cursor = nextAt + inline.length;
      continue;
    }

    cursor = nextAt + 1;
  }

  return ops;
}

function pushTextOp(ops: TemplateOp[], value: string): void {
  if (!value) {
    return;
  }
  const last = ops[ops.length - 1];
  if (last?.type === 'text') {
    last.value += value;
    return;
  }
  ops.push({ type: 'text', value });
}

function parseInlineDirective(
  source: string,
): { op: TemplateOp; length: number } | null {
  const csrfMatch = source.match(/^@csrf\b\s*/);
  if (csrfMatch) {
    return { op: { type: 'csrf' }, length: csrfMatch[0].length };
  }

  const methodMatch = source.match(/^@method\(\s*['"]([^'"]+)['"]\s*\)/);
  if (methodMatch) {
    return {
      op: { type: 'method', verb: methodMatch[1]! },
      length: methodMatch[0].length,
    };
  }

  const json = parseExpressionDirective(source, 'json');
  if (json) {
    return { op: { type: 'json', expression: json.expression }, length: json.length };
  }

  for (const attribute of ['checked', 'selected', 'disabled', 'readonly'] as const) {
    const parsed = parseExpressionDirective(source, attribute);
    if (parsed) {
      return {
        op: { type: 'formAttr', attribute, expression: parsed.expression },
        length: parsed.length,
      };
    }
  }

  const classDirective = parseExpressionDirective(source, 'class');
  if (classDirective) {
    return {
      op: { type: 'class', expression: classDirective.expression },
      length: classDirective.length,
    };
  }

  const styleDirective = parseExpressionDirective(source, 'style');
  if (styleDirective) {
    return {
      op: { type: 'style', expression: styleDirective.expression },
      length: styleDirective.length,
    };
  }

  const escapeMatch = source.match(/^@escape\(\s*['"]([^'"]+)['"]\s*,\s*(.+)\s*\)/);
  if (escapeMatch) {
    return {
      op: {
        type: 'escape',
        context: escapeMatch[1]!,
        expression: escapeMatch[2]!.trim(),
      },
      length: escapeMatch[0].length,
    };
  }

  const langMatch = source.match(LANG_RE);
  if (langMatch) {
    return {
      op: {
        type: 'lang',
        key: langMatch[1]!,
        replaceExpression: langMatch[2]?.trim(),
      },
      length: langMatch[0].length,
    };
  }

  const viteMatch = source.match(VITE_RE);
  if (viteMatch) {
    return {
      op: { type: 'vite', entry: viteMatch[1]! },
      length: viteMatch[0].length,
    };
  }

  const yieldMatch = source.match(
    /^@yield\(\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]*)['"]\s*)?\)/,
  );
  if (yieldMatch) {
    return {
      op: { type: 'yield', name: yieldMatch[1]!, defaultValue: yieldMatch[2] },
      length: yieldMatch[0].length,
    };
  }

  const stackMatch = source.match(
    /^@stack\(\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]*)['"]\s*)?\)/,
  );
  if (stackMatch) {
    return {
      op: { type: 'stack', name: stackMatch[1]!, defaultValue: stackMatch[2] },
      length: stackMatch[0].length,
    };
  }

  const includeMatch = source.match(/^@include\(\s*['"]([^'"]+)['"]\s*(?:,\s*(.+?))?\s*\)/);
  if (includeMatch) {
    return {
      op: {
        type: 'include',
        name: includeMatch[1]!,
        dataExpression: includeMatch[2]?.trim(),
      },
      length: includeMatch[0].length,
    };
  }

  const componentMatch = source.match(/^@component\(\s*['"]([^'"]+)['"]\s*(?:,\s*(.+?))?\s*\)/);
  if (componentMatch) {
    return {
      op: {
        type: 'component',
        name: componentMatch[1]!,
        dataExpression: componentMatch[2]?.trim(),
      },
      length: componentMatch[0].length,
    };
  }

  return null;
}

function parseExpressionDirective(
  source: string,
  name: string,
): { expression: string; length: number } | null {
  const prefix = `@${name}(`;
  if (!source.startsWith(prefix)) {
    return null;
  }

  let depth = 0;
  const expressionStart = prefix.length;

  for (let index = expressionStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') {
      depth += 1;
    }
    if (char === ')') {
      if (depth === 0) {
        return {
          expression: source.slice(expressionStart, index).trim(),
          length: index + 1,
        };
      }
      depth -= 1;
    }
  }

  return null;
}

export function compileInlineEchoes(source: string): TemplateOp[] {
  const ops: TemplateOp[] = [];
  let lastIndex = 0;
  const pattern = new RegExp(`${ECHO_RE.source}|${RAW_ECHO_RE.source}`, 'g');
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > lastIndex) {
      appendText(ops, source.slice(lastIndex, match.index));
    }

    const raw = match[0].startsWith('{!!');
    const expression = match[1] ?? '';
    ops.push({ type: 'echo', expression, raw });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    appendText(ops, source.slice(lastIndex));
  }

  return ops;
}