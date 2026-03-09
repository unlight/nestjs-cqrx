import { Injectable } from '@nestjs/common';
import { Game } from '../models/game.model.ts';
import { AggregateRepository } from 'cqrx-core';
import { InjectAggregateRepository } from 'nestjs-cqrx';

@Injectable()
export class GameRepository {
  constructor(
    @InjectAggregateRepository(Game)
    private readonly gameAggregateRepository: AggregateRepository<Game>,
  ) {}

  async findOne(id: string): Promise<Game | undefined> {
    const game = await this.gameAggregateRepository.load(id);
    return game;
  }

  async save(game: Game): Promise<string> {
    await this.gameAggregateRepository.save(game);

    return game.id;
  }
}
