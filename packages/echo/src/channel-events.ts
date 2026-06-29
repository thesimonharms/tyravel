/**
 * Augment for typed Echo channel events:
 *
 * ```ts
 * declare module '@pondoknusa/echo' {
 *   interface EchoChannelEventMap {
 *     'orders.1': {
 *       OrderShipped: { id: number };
 *     };
 *   }
 * }
 * ```
 */
export interface EchoChannelEventMap {}

export type EchoChannelKey<TChannel extends string> = TChannel extends `private-${infer Base}`
  ? Base
  : TChannel extends `presence-${infer Base}`
    ? Base
    : TChannel;

export type EchoEventPayload<
  TChannel extends string,
  TEvent extends string,
> = EchoChannelKey<TChannel> extends keyof EchoChannelEventMap
  ? TEvent extends keyof EchoChannelEventMap[EchoChannelKey<TChannel>]
    ? EchoChannelEventMap[EchoChannelKey<TChannel>][TEvent]
    : unknown
  : unknown;