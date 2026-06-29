import type { Dispatcher, Job, QueueContract, QueueManager } from '@pondoknusa/queue';
import type { Application } from './application.js';

let activeApp: Application | undefined;

export function setQueueApplication(app: Application): void {
  activeApp = app;
}

function application(): Application {
  if (!activeApp) {
    throw new Error(
      'Queue facade is not ready. Boot the application before dispatching jobs.',
    );
  }
  return activeApp;
}

function manager(): QueueManager {
  return application().make<QueueManager>('queue');
}

export interface QueueConnectionFacade {
  dispatch(job: Job, queue?: string): Promise<string>;
  later(delaySeconds: number, job: Job, queue?: string): Promise<string>;
}

function connectionFacade(name?: string): QueueConnectionFacade {
  const connection = manager().connection(name);
  return {
    dispatch: (job, queue) => connection.push(job, queue),
    later: (delaySeconds, job, queue) => connection.later(delaySeconds, job, queue),
  };
}

export interface QueueFacade {
  connection(name?: string): QueueConnectionFacade;
  dispatch(job: Job, queue?: string): Promise<string>;
  later(delaySeconds: number, job: Job, queue?: string): Promise<string>;
}

export const Queue: QueueFacade = {
  connection: connectionFacade,
  dispatch: (job, queue) => connectionFacade().dispatch(job, queue),
  later: (delaySeconds, job, queue) => connectionFacade().later(delaySeconds, job, queue),
};

export async function dispatch(job: Job, queue?: string): Promise<string> {
  return Queue.dispatch(job, queue);
}