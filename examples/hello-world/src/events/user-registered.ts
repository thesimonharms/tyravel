import { Event } from '@tyravel/events';

export interface UserRegisteredPayload {
  userId: number;
  name: string;
  email: string;
}

export class UserRegistered extends Event<UserRegisteredPayload> {}