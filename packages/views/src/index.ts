export { compile, type CompileOptions } from './compiler.js';
export { escapeHtml } from './escape.js';
export { evaluateExpression, mergeEvaluationContext } from './evaluate.js';
export { ViewEngine } from './view-engine.js';
export {
  ViewRegistry,
  type CustomDirectiveHandler,
  type ViewAuthBindings,
  type ViewComposerHandler,
  type ViewExpressionBindings,
} from './view-registry.js';
export type {
  CompiledTemplate,
  ConditionalMode,
  TemplateOp,
  ViewConfig,
  ViewContext,
} from './types.js';