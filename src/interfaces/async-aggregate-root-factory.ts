import { ModuleMetadata } from '@nestjs/common';

import { AggregateRoot } from '../aggregate-root';

export interface AsyncAggregateRootFactory extends Pick<ModuleMetadata, 'imports'> {
    name: string;
    useFactory: (...args: any[]) => AggregateRoot | Promise<AggregateRoot>;
    inject?: any[];
}
