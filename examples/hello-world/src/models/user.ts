import { Model } from '@pondoknusa/database';
import type { HasManyRelation, ModelQueryBuilder } from '@pondoknusa/database';
import type { Authenticatable } from '@pondoknusa/auth';
import { Post } from './post.js';

export interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password: string;
  created_at: string;
  updated_at: string;
}

export class User extends Model<UserAttributes> implements Authenticatable {
  static override table = 'users';

  static scopeWithEmail(builder: ModelQueryBuilder, domain: string): ModelQueryBuilder {
    return builder.where('email', 'like', `%@${domain}`);
  }

  getAuthIdentifier(): number {
    return Number(this.getAttribute('id'));
  }

  getAuthPassword(): string {
    return String(this.getAttribute('password'));
  }

  routeNotificationForSms(): string {
    return String(this.getAttribute('phone') ?? '');
  }

  posts(): HasManyRelation<Post> {
    return this.hasMany(Post);
  }
}