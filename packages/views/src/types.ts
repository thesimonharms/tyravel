export type ViewContext = Record<string, unknown>;

export interface ViewConfig {
  path: string;
  extension?: string;
}

export interface CompiledTemplate {
  layout?: string;
  ops: TemplateOp[];
}

export type ConditionalMode = 'if' | 'unless' | 'isset' | 'empty' | 'auth' | 'guest' | 'can';

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
  | { type: 'push'; name: string; body: TemplateOp[] }
  | { type: 'stack'; name: string; defaultValue?: string }
  | { type: 'include'; name: string; dataExpression?: string }
  | { type: 'includeIf'; name: string; dataExpression?: string }
  | { type: 'includeWhen'; name: string; conditionExpression: string; dataExpression?: string }
  | { type: 'custom'; name: string; expression: string }
  | {
      type: 'component';
      name: string;
      dataExpression?: string;
      defaultSlot?: TemplateOp[];
      namedSlots?: Record<string, TemplateOp[]>;
    };