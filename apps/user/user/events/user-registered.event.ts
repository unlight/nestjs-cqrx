import { ObjectType } from 'simplytyped';
import { UserRegisteredDto } from '../dto/index.ts';
import { Event } from 'cqrx-core';

type TData = ObjectType<UserRegisteredDto>;

export class UserRegistered extends Event<TData> {
  constructor(readonly data: TData) {
    super();
  }
}
