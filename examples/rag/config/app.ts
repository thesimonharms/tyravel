import { env, s } from '@pondoknusa/config';

export const schema = s.object({
  name: s.string({ required: true, minLength: 1 }),
  debug: s.boolean(),
  url: s.string({ url: true }),
});

export default {
  name: env('APP_NAME', 'pondoknusa-rag-example'),
  debug: env('APP_DEBUG', true),
  url: env('APP_URL', 'http://127.0.0.1:3000'),
} as const;