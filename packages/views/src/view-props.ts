import type { ViewContext } from './types.js';

/**
 * Augment this interface in application code for typed view props:
 *
 * ```ts
 * declare module '@tyravel/views' {
 *   interface ViewPropsMap {
 *     welcome: { name: string };
 *   }
 * }
 * ```
 */
export interface ViewPropsMap {}

export type ViewPropsFor<TName extends string> = TName extends keyof ViewPropsMap
  ? ViewPropsMap[TName]
  : ViewContext;