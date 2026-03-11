import { Module } from '@nestjs/common';
import { CqrxModule } from 'nestjs-cqrx';
import { CreateGameHandler } from './commands/create-game.handler.js';
import { PlayerJoinHandler } from './commands/player-join.command.js';
import { GameRepository } from './repositories/game.repository.js';
import { StartGameHandler } from './commands/start-game.command.js';
import { PlayerMoveHandler } from './commands/player-move.handler.js';
import { GameSagas } from './sagas/game.sagas.js';
import { CheckGameEndHandler } from './commands/check-game-end.handler.js';
import { Game } from './models/game.model.js';
import { PlayerMoveEvent } from './events/player-move.event.js';
import { GameEndedEvent } from './events/game-ended.event.js';
import { PlayerJoinedEvent } from './events/player-joined.event.js';
import { PlayerMoveHandler as EventPlayerMoveHandler } from './events/player-move.handler.js';
import { GameViewRepository } from './repositories/game-view.repository.js';

@Module({
  imports: [
    CqrxModule.forRoot({
      type: 'kurrentdb',
      connectionString: 'kurrentdb://localhost:2113?tls=false',
      subscribeToAll: true,
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
