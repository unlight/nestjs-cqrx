import { ObjectType } from 'simplytyped';
import { Event } from 'cqrx-core';
import type { UserRegisteredDto } from '../dto/response/user-registered.dto.ts';

type TData = ObjectType<UserRegisteredDto>;

export class UserRegistered extends Event<TData> {
  constructor(readonly data: TData) {
    super();
  }
}
