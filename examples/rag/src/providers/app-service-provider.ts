import { ServiceProvider } from '@pondoknusa/core';
import { JobRegistry } from '@pondoknusa/queue';
import { EmbedChunksJob } from '@pondoknusa/vector';

export class AppServiceProvider extends ServiceProvider {
  override register() {
    this.app.make<JobRegistry>('jobs.registry').register(EmbedChunksJob);
  }
}