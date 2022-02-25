import { Injectable } from '@nestjs/common';
import { Saga, ofType, IEvent } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { PlayerMoveEvent } from '../events/player-move.event';
import { map } from 'rxjs/operators';
import { CheckGameEndCommand } from '../commands/check-game-end.command';

@Injectable()
export class GameSagas {
    @Saga()
    playerMove = (events$: Observable<IEvent> /* EventBus */) => {
        return events$.pipe(
            ofType(PlayerMoveEvent),
            map(event => {
                return new CheckGameEndCommand(event.data.gameId);
            }),
        );
    };
}
