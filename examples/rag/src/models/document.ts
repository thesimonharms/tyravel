import { Model } from '@pondoknusa/database';

export class Document extends Model {
  static override table = 'documents';
  static override vectorColumn = 'embedding';
}