import { Observable } from 'rxjs';

import { Event } from '../event';

export type EventHandlerFunction<E extends Event = Event> = (
    event: E,
) => Observable<void> | Promise<void> | void;
