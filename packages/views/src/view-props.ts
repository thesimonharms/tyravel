import type { ViewContext } from './types.js';

/**
 * Augment this interface in application code for typed view props, or run
 * `tyravel view:types` to generate `types/view-props.generated.d.ts` from
 * `@props` directives. Use `DefineViewProps` as a hand-authored alias when you
 * prefer explicit schemas:
 *
 * ```ts
 * import type { DefineViewProps } from '@tyravel/views';
 *
 * type WelcomeProps = DefineViewProps<{ name: string }>;
 *
 * declare module '@tyravel/views' {
 *   interface ViewPropsMap {
 *     welcome: WelcomeProps;
 *   }
 * }
 * ```
 */
export interface ViewPropsMap {}

export type ViewPropsFor<TName extends string> = TName extends keyof ViewPropsMap
  ? ViewPropsMap[TName]
  : ViewContext;