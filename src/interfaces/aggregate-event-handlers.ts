import { Type } from '@nestjs/common';

import { Event } from '../event';

export type AggregateEventHandlers = Map<Type<Event>, Array<string | symbol>>;
