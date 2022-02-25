import { FactoryProvider, ModuleMetadata } from '@nestjs/common';

import { AggregateRoot } from '../aggregate-root';

export interface AsyncAggregateRootFactory extends Pick<ModuleMetadata, 'imports'> {
    name: string;
    useFactory: (...args: unknown[]) => AggregateRoot | Promise<AggregateRoot>;
    inject?: FactoryProvider['inject'];
}
