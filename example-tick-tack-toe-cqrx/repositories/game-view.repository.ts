import { Injectable } from '@nestjs/common';

@Injectable()
export class GameViewRepository {
    #countEvents = 0;

    resetCount() {
        this.#countEvents = 0;
    }

    incEvent() {
        this.#countEvents++;
    }

    get countEvents() {
        return this.#countEvents;
    }
}
