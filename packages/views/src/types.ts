export type ViewContext = Record<string, unknown>;

export interface ViewConfig {
  path: string;
  extension?: string;
  compiled?: boolean;
  compiledPath?: string;
  namespaces?: Record<string, string>;
  locale?: string;
  localesPath?: string;
  manifestPath?: string;
  viteBase?: string;
  env?: string;
  /** When true, warm disk cache is trusted without reading source templates. */
  trustCompiledCache?: boolean;
  /** Extension for programmatic TypeScript views (e.g. `.tyr.ts`). */
  programmaticExtension?: string;
}

export type RenderMode = 'full' | 'stream-shell';

export interface RenderOptions {
  mode?: RenderMode;
}

export interface CompiledTemplate {
  layout?: string;
  ops: TemplateOp[];
  props?: Record<string, unknown>;
  aware?: string[];
  defaultSlots?: Record<string, TemplateOp[]>;
}

export type ConditionalMode =
  | 'if'
  | 'unless'
  | 'isset'
  | 'empty'
  | 'auth'
  | 'guest'
  | 'can'
  | 'error'
  | 'env'
  | 'production'
  | 'local';

export type FormAttribute = 'checked' | 'selected' | 'disabled' | 'readonly';

export type TemplateOp =
  | { type: 'text'; value: string }
  | { type: 'echo'; expression: string; raw: boolean }
  | {
      type: 'if';
      expression: string;
      body: TemplateOp[];
      elseBody?: TemplateOp[];
      mode?: ConditionalMode;
    }
  | { type: 'foreach'; expression: string; body: TemplateOp[] }
  | { type: 'forelse'; expression: string; body: TemplateOp[]; emptyBody: TemplateOp[] }
  | { type: 'section'; name: string; body: TemplateOp[] }
  | { type: 'yield'; name: string; defaultValue?: string }
  | { type: 'once'; id: string; body: TemplateOp[] }
  | { type: 'push'; name: string; body: TemplateOp[] }
  | { type: 'pushOnce'; name: string; id: string; body: TemplateOp[] }
  | { type: 'prepend'; name: string; body: TemplateOp[] }
  | { type: 'stack'; name: string; defaultValue?: string }
  | { type: 'inject'; varName: string; binding: string }
  | { type: 'fragment'; name: string; ttlSeconds?: number; body: TemplateOp[] }
  | { type: 'escape'; context: string; expression: string }
  | { type: 'stream'; name: string; body: TemplateOp[] }
  | { type: 'island'; id: string; propsExpression?: string; body: TemplateOp[] }
  | { type: 'include'; name: string; dataExpression?: string }
  | { type: 'includeIf'; name: string; dataExpression?: string }
  | { type: 'includeWhen'; name: string; conditionExpression: string; dataExpression?: string }
  | { type: 'includeFirst'; names: string[]; dataExpression?: string }
  | { type: 'lang'; key: string; replaceExpression?: string }
  | { type: 'vite'; entry: string }
  | { type: 'custom'; name: string; expression: string }
  | { type: 'csrf' }
  | { type: 'method'; verb: string }
  | { type: 'json'; expression: string }
  | { type: 'formAttr'; attribute: FormAttribute; expression: string }
  | { type: 'class'; expression: string }
  | { type: 'style'; expression: string }
  | { type: 'switch'; expression: string; cases: SwitchCase[]; defaultBody?: TemplateOp[] }
  | {
      type: 'component';
      name: string;
      dataExpression?: string;
      defaultSlot?: TemplateOp[];
      namedSlots?: Record<string, TemplateOp[]>;
    };

export interface SwitchCase {
  labelExpression?: string;
  body: TemplateOp[];
}