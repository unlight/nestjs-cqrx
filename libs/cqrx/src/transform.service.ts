import isClass from 'node-is-class';
import type { IStoredEvent, Type } from './interfaces.ts';
import { createFromStoredEvent } from './utils.ts';

export type Transform = (event: IStoredEvent) => any;
export type Transformer = Type<any> | [string, Transform];
export type Transformers = Array<Transformer>;

type Key = string | symbol;

/**
 * Transform stream event to domain event.
 */
export class TransformService {
  constructor(private readonly transforms: Map<Key, Transform> = new Map()) {}

  public static createTransform(transformer: Transformer): [Key, Transform] {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    if (isClass(transformer)) {
      return [
        (transformer as Type).name,
        event => createFromStoredEvent(transformer as Type, event),
      ];
    }
    if (
      transformer.length === 2 &&
      ['string', 'symbol'].includes(typeof transformer[0]) &&
      typeof transformer[1] === 'function'
    ) {
      return transformer as [Key, Transform];
    }
    throw new TypeError('Cannot create transform');
  }

  get(eventType: string): Transform | undefined {
    return this.transforms.get(eventType);
  }
}
