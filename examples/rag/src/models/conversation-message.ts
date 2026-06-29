import { Model } from '@pondoknusa/database';

export interface ConversationMessageAttributes {
  id: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class ConversationMessage extends Model<ConversationMessageAttributes> {
  static override table = 'conversation_messages';
}