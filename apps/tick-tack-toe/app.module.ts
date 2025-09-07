import { Module } from '@nestjs/common';
import { CqrxModule } from 'nestjs-cqrx';
import { CreateGameHandler } from './commands/create-game.handler';
import { PlayerJoinHandler } from './commands/player-join.handler';
import { GameRepository } from './repositories/game.repository';
import { StartGameHandler } from './commands/start-game.handler';
import { PlayerMoveHandler } from './commands/player-move.handler';
import { GameSagas } from './sagas/game.sagas';
import { CheckGameEndHandler } from './commands/check-game-end.handler';
import { Game } from './models/game.model';
import { PlayerMoveEvent } from './events/player-move.event';
import { GameEndedEvent } from './events/game-ended.event';
import { PlayerJoinedEvent } from './events/player-joined.event';
import { PlayerMoveHandler as EventPlayerMoveHandler } from './events/player-move.handler';
import { GameViewRepository } from './repositories/game-view.repository';

@Module({
  imports: [
    CqrxModule.forRoot({
      eventstoreConnectionString: 'kurrentdb://localhost:34605?tls=false',
    }),
    CqrxModule.forFeature(
      [Game],
      [PlayerMoveEvent, GameEndedEvent, PlayerJoinedEvent],
    ),
  ],
  providers: [
    GameRepository,
    GameViewRepository,
    CreateGameHandler,
    PlayerJoinHandler,
    StartGameHandler,
    PlayerMoveHandler,
    GameSagas,
    CheckGameEndHandler,
    EventPlayerMoveHandler,
  ],
})
export class AppModule {}
