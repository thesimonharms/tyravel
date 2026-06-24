import type { AuthManager } from '@tyravel/auth';
import { ConfigRepository } from '@tyravel/config';
import {
  BroadcastDispatcher,
  BroadcastEvent,
  BroadcastManager,
  ChannelRegistry,
  type BroadcastQueueBridge,
  type BroadcastingConfig,
} from '@tyravel/broadcasting';
import { EventDispatcher } from '@tyravel/events';
import { Dispatcher, JobRegistry, QueueManager } from '@tyravel/queue';
import { ServiceProvider } from './service-provider.js';
import { setBroadcastApplication } from './broadcast.js';

export class BroadcastServiceProvider extends ServiceProvider {
  override async register(): Promise<void> {
    const config = this.app.make<ConfigRepository>('config');
    const broadcastingConfig = config.get<BroadcastingConfig>('broadcasting', {
      default: 'null',
      connections: { null: { driver: 'null' } },
    });

    const manager = new BroadcastManager(broadcastingConfig);
    const channels = new ChannelRegistry();
    const queueBridge = this.createQueueBridge();
    const dispatcher = new BroadcastDispatcher({
      manager,
      queue: queueBridge,
    });

    this.app.instance('broadcasting', manager);
    this.app.instance('broadcasting.dispatcher', dispatcher);
    this.app.instance('broadcasting.channels', channels);
    this.app.singleton(BroadcastManager, () => manager);
    this.app.singleton(BroadcastDispatcher, () => dispatcher);
    this.app.singleton(ChannelRegistry, () => channels);

    BroadcastEvent.broadcaster = async (connection, payload) => {
      await manager.connection(connection).broadcast(payload);
    };

    this.registerBroadcastJob();
    this.wireEventDispatcher(dispatcher, broadcastingConfig);
    setBroadcastApplication(this.app);
  }

  override async boot(): Promise<void> {
    const config = this.app.make<ConfigRepository>('config');
    const broadcastingConfig = config.get<BroadcastingConfig>('broadcasting', {
      default: 'null',
      connections: { null: { driver: 'null' } },
    });
    const dispatcher = this.app.make<BroadcastDispatcher>('broadcasting.dispatcher');

    dispatcher.setQueueDefaults({
      connection: broadcastingConfig.queueConnection,
      queue: broadcastingConfig.queue,
    });

    this.registerAuthRoute();
    this.loadChannelAuthorizations();
  }

  private wireEventDispatcher(
    broadcastDispatcher: BroadcastDispatcher,
    config: BroadcastingConfig,
  ): void {
    try {
      const events = this.app.make<EventDispatcher>('events');
      events.onAfterDispatch(async (event) => {
        await broadcastDispatcher.dispatch(event);
      });
      broadcastDispatcher.setQueueDefaults({
        connection: config.queueConnection,
        queue: config.queue,
      });
    } catch {
      // Event provider not registered.
    }
  }

  private registerBroadcastJob(): void {
    try {
      const jobs = this.app.make<JobRegistry>('jobs.registry');
      jobs.register(BroadcastEvent);
    } catch {
      // Queue provider not registered.
    }
  }

  private createQueueBridge(): BroadcastQueueBridge | undefined {
    try {
      const manager = this.app.make<QueueManager>('queue');
      return {
        dispatch: async (job, options) => {
          const connection = manager.connection(options.connection);
          const dispatcher = new Dispatcher(connection);
          const delaySeconds = options.delaySeconds ?? 0;
          if (delaySeconds > 0) {
            await dispatcher.dispatchLater(delaySeconds, job, options.queue);
            return;
          }
          await dispatcher.dispatch(job, options.queue);
        },
      };
    } catch {
      return undefined;
    }
  }

  private registerAuthRoute(): void {
    try {
      const router = this.app.router();
      router.post('/broadcasting/auth', async (request) => {
        const channels = this.app.make<ChannelRegistry>('broadcasting.channels');
        const body = await request.json() as {
          socket_id?: string;
          channel_name?: string;
          channel_data?: string;
        };

        const socketId = body.socket_id;
        const channelName = body.channel_name;
        if (!socketId || !channelName) {
          return Response.json({ message: 'Invalid broadcasting auth payload.' }, { status: 400 });
        }

        let user: unknown = null;
        try {
          const auth = this.app.make<AuthManager>('auth');
          user = auth.user();
        } catch {
          // Auth provider not registered.
        }

        const allowed = await channels.authorize(channelName, user);
        if (!allowed) {
          return Response.json({ message: 'Forbidden.' }, { status: 403 });
        }

        const manager = this.app.make<BroadcastManager>('broadcasting');
        const connection = manager.connection();
        if (!('signChannel' in connection)) {
          return Response.json({ auth: `${socketId}:${channelName}` });
        }

        const signer = connection as {
          signChannel(socketId: string, channel: string, channelData?: string): string;
        };
        const channelData = body.channel_data;
        const auth = signer.signChannel(socketId, channelName, channelData);
        return channelData
          ? Response.json({ auth, channel_data: channelData })
          : Response.json({ auth });
      });
    } catch {
      // Router not available.
    }
  }

  private loadChannelAuthorizations(): void {
    // Apps register channels in routes/channels.ts via Broadcast::channel() at boot.
  }
}