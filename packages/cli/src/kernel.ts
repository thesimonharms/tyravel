import { ConsoleKernel } from './console.js';
import { DbSeedCommand } from './commands/db-seed.js';
import { MakeEventCommand } from './commands/make-event.js';
import { MakeFactoryCommand } from './commands/make-factory.js';
import { MakeSeederCommand } from './commands/make-seeder.js';
import { MakeTestCommand } from './commands/make-test.js';
import { MakeControllerCommand } from './commands/make-controller.js';
import { MakeRequestCommand } from './commands/make-request.js';
import { MakeResourceCommand } from './commands/make-resource.js';
import { MakeJobCommand } from './commands/make-job.js';
import { MakeSubscriberCommand } from './commands/make-subscriber.js';
import { MakeListenerCommand } from './commands/make-listener.js';
import { MakeMigrationCommand } from './commands/make-migration.js';
import { MakeModelCommand } from './commands/make-model.js';
import { MakeProviderCommand } from './commands/make-provider.js';
import { MakeViewCommand } from './commands/make-view.js';
import { MigrateCommand } from './commands/migrate.js';
import { AuthInstallCommand } from './commands/auth-install.js';
import { NewCommand } from './commands/new.js';
import { QueueFailedCommand, QueueFailedTableCommand, QueueRetryCommand } from './commands/queue-failed.js';
import { QueueTableCommand } from './commands/queue-table.js';
import { QueueWorkCommand } from './commands/queue-work.js';
import { ServeCommand } from './commands/serve.js';
import { VersionCommand } from './commands/version.js';

export function createKernel(): ConsoleKernel {
  return new ConsoleKernel([
    new NewCommand(),
    new AuthInstallCommand(),
    new ServeCommand(),
    new MigrateCommand(),
    new DbSeedCommand(),
    new MakeControllerCommand(),
    new MakeRequestCommand(),
    new MakeResourceCommand(),
    new MakeModelCommand(),
    new MakeFactoryCommand(),
    new MakeSeederCommand(),
    new MakeMigrationCommand(),
    new MakeProviderCommand(),
    new MakeViewCommand(),
    new MakeJobCommand(),
    new MakeEventCommand(),
    new MakeListenerCommand(),
    new MakeSubscriberCommand(),
    new MakeTestCommand(),
    new QueueTableCommand(),
    new QueueFailedTableCommand(),
    new QueueFailedCommand(),
    new QueueRetryCommand(),
    new QueueWorkCommand(),
    new VersionCommand(),
  ]);
}