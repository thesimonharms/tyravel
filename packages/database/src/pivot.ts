import {
  applyCastsToAttributes,
  type ModelCastMap,
} from './model-casts.js';

type PivotAttributes = Record<string, unknown>;

export class Pivot {
  private readonly attributes: PivotAttributes;

  constructor(
    attributes: PivotAttributes = {},
    private readonly pivotCasts: ModelCastMap = {},
  ) {
    this.attributes = applyCastsToAttributes(
      attributes,
      pivotCasts,
    ) as PivotAttributes;
  }

  static fromAttributes(
    attributes: PivotAttributes,
    casts: ModelCastMap = {},
  ): Pivot {
    return new Pivot(attributes, casts);
  }

  getAttribute(key: string): unknown {
    return this.attributes[key];
  }
}