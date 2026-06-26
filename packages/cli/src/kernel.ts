import { ConsoleKernel } from './console.js';
import { DbSeedCommand } from './commands/db-seed.js';
import { MakeEventCommand } from './commands/make-event.js';
import { MakeFactoryCommand } from './commands/make-factory.js';
import { MakeSeederCommand } from './commands/make-seeder.js';
import { MakeTestCommand } from './commands/make-test.js';
import { MakeCommandCommand } from './commands/make-command.js';
import { MakeControllerCommand } from './commands/make-controller.js';
import { MakeMiddlewareCommand } from './commands/make-middleware.js';
import { MakeRequestCommand } from './commands/make-request.js';
import { MakeResourceCommand } from './commands/make-resource.js';
import { RouteCacheCommand, RouteClearCommand } from './commands/route-cache.js';
import { RouteListCommand } from './commands/route-list.js';
import { ScheduleRunCommand } from './commands/schedule-run.js';
import { SessionPruneCommand } from './commands/session-prune.js';
import { MakeJobCommand } from './commands/make-job.js';
import { MakeSubscriberCommand } from './commands/make-subscriber.js';
import { MakeListenerCommand } from './commands/make-listener.js';
import { MakeMigrationCommand } from './commands/make-migration.js';
import { MakeModelCommand } from './commands/make-model.js';
import { MakeProviderCommand } from './commands/make-provider.js';
import { MakeComponentCommand } from './commands/make-component.js';
import { MakeIslandCommand } from './commands/make-island.js';
import { MakeSocialDriverCommand } from './commands/make-social-driver.js';
import { MakeViewCommand } from './commands/make-view.js';
import { ViewCacheCommand, ViewClearCommand } from './commands/view-cache.js';
import { ViewLintCommand } from './commands/view-lint.js';
import { ViewTypesCommand } from './commands/view-types.js';
import { ViewWatchCommand } from './commands/view-watch.js';
import { MigrateCommand } from './commands/migrate.js';
import { AuthInstallCommand } from './commands/auth-install.js';
import { CryptoGenerateKeysCommand } from './commands/crypto-generate-keys.js';
import { AdminInstallCommand } from './commands/admin-install.js';
import { DebugClearCommand } from './commands/debug-clear.js';
import { DebugInstallCommand } from './commands/debug-install.js';
import { DebugWatchCommand } from './commands/debug-watch.js';
import { LangMissingCommand } from './commands/lang-missing.js';
import { LangPublishCommand } from './commands/lang-publish.js';
import { CryptoInstallCommand } from './commands/crypto-install.js';
import { OAuthClientCreateCommand } from './commands/oauth-client-create.js';
import { OAuthInstallCommand } from './commands/oauth-install.js';
import { NewCommand } from './commands/new.js';
import { QueueFailedCommand, QueueFailedTableCommand, QueueRetryCommand } from './commands/queue-failed.js';
import { QueueTableCommand } from './commands/queue-table.js';
import { QueueWorkCommand } from './commands/queue-work.js';
import { ServeCommand } from './commands/serve.js';
import { ShellCommand } from './commands/shell.js';
import { VectorEmbedCommand } from './commands/vector-embed.js';
import { VectorInstallCommand } from './commands/vector-install.js';
import { McpServeCommand } from './commands/mcp-serve.js';
import { McpExportRulesCommand } from './commands/mcp-export-rules.js';
import { MakeToolCommand } from './commands/make-tool.js';
import { MakeRagResourceCommand } from './commands/make-rag-resource.js';
import { NotificationFailedCommand, NotificationRetryCommand } from './commands/notification-failed.js';
import { VersionCommand } from './commands/version.js';

export function createKernel(): ConsoleKernel {
  return new ConsoleKernel([
    new NewCommand(),
    new AuthInstallCommand(),
    new OAuthInstallCommand(),
    new OAuthClientCreateCommand(),
    new LangPublishCommand(),
    new LangMissingCommand(),
    new AdminInstallCommand(),
    new DebugInstallCommand(),
    new DebugClearCommand(),
    new DebugWatchCommand(),
    new CryptoInstallCommand(),
    new CryptoGenerateKeysCommand(),
    new ServeCommand(),
    new ShellCommand(),
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
    new MakeComponentCommand(),
    new MakeIslandCommand(),
    new MakeSocialDriverCommand(),
    new ViewCacheCommand(),
    new ViewClearCommand(),
    new ViewWatchCommand(),
    new ViewLintCommand(),
    new ViewTypesCommand(),
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
    new ScheduleRunCommand(),
    new SessionPruneCommand(),
    new RouteListCommand(),
    new RouteCacheCommand(),
    new RouteClearCommand(),
    new MakeMiddlewareCommand(),
    new MakeCommandCommand(),
    new VectorEmbedCommand(),
    new VectorInstallCommand(),
    new McpServeCommand(),
    new McpExportRulesCommand(),
    new MakeToolCommand(),
    new MakeRagResourceCommand(),
    new NotificationFailedCommand(),
    new NotificationRetryCommand(),
    new VersionCommand(),
  ]);
}