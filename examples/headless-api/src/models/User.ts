import { Model } from '@pondoknusa/database';
import type { Authenticatable } from '@pondoknusa/auth';

export interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password: string;
}

export class User extends Model<UserAttributes> implements Authenticatable {
  static override table = 'users';

  getAuthIdentifier(): number {
    return Number(this.get('id'));
  }

  getAuthPassword(): string {
    return String(this.get('password'));
  }
}
