import { Model } from '@pondoknusa/database';

export interface PostAttributes {
  id: number;
  user_id: number;
  title: string;
  published: number;
  created_at: string;
  updated_at: string;
}

export class Post extends Model<PostAttributes> {
  static override table = 'posts';
}