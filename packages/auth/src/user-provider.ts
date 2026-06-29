import type { Model } from '@pondoknusa/database';
import { Hasher } from './hasher.js';
import { InvalidCredentialsException } from './exceptions.js';
import type { Authenticatable, UserModelConstructor } from './types.js';

export interface UserProvider {
  retrieveById(id: string | number): Promise<Authenticatable | null>;
  retrieveByCredentials(credentials: Record<string, string>): Promise<Authenticatable | null>;
  validateCredentials(user: Authenticatable, credentials: Record<string, string>): Promise<boolean>;
}

export class EloquentUserProvider implements UserProvider {
  private readonly hasher = new Hasher();

  constructor(private readonly model: UserModelConstructor) {}

  async retrieveById(id: string | number): Promise<Authenticatable | null> {
    const ModelClass = this.model as unknown as typeof Model;
    const user = await ModelClass.find(id);
    return user as Authenticatable | null;
  }

  async retrieveByCredentials(
    credentials: Record<string, string>,
  ): Promise<Authenticatable | null> {
    const email = credentials.email;
    if (!email) {
      return null;
    }

    const ModelClass = this.model as unknown as typeof Model;
    const user = await ModelClass.query().where('email', email).firstModel();
    return user as Authenticatable | null;
  }

  async validateCredentials(
    user: Authenticatable,
    credentials: Record<string, string>,
  ): Promise<boolean> {
    const password = credentials.password;
    if (!password) {
      return false;
    }

    return this.hasher.check(password, user.getAuthPassword());
  }
}