#!/usr/bin/env node
/**
 * Generate reference documentation from the monorepo source of truth.
 *
 * Outputs:
 *   docs/reference/generated/packages.md
 *   docs/reference/generated/cli.md
 *   docs/reference/generated/packages/<slug>.md
 *   docs/.vitepress/generated/manifest.json
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const GENERATED_ROOT = join(ROOT, 'docs/reference/generated');
const PACKAGE_PAGES = join(GENERATED_ROOT, 'packages');
const MANIFEST_PATH = join(ROOT, 'docs/.vitepress/generated/manifest.json');

const PACKAGE_CATEGORIES = [
  {
    id: 'kernel',
    title: 'Kernel & HTTP',
    match: (name) =>
      ['core', 'http', 'container', 'config', 'validation', 'support', 'collection'].includes(name),
  },
  {
    id: 'data',
    title: 'Database',
    match: (name) => name === 'database' || name.startsWith('database-'),
  },
  {
    id: 'presentation',
    title: 'Views & client',
    match: (name) => ['views', 'ssr', 'echo', 'locale'].includes(name),
  },
  {
    id: 'platform',
    title: 'Platform services',
    match: (name) =>
      [
        'auth',
        'auth-oauth',
        'crypto',
        'queue',
        'events',
        'broadcasting',
        'broadcasting-websocket',
        'cache',
        'mail',
        'notifications',
        'storage',
        'admin',
        'debug',
        'log',
        'repl',
      ].includes(name),
  },
  {
    id: 'cache-drivers',
    title: 'Cache drivers',
    match: (name) => name.startsWith('cache-'),
  },
  {
    id: 'storage-drivers',
    title: 'Storage drivers',
    match: (name) => name.startsWith('storage-'),
  },
  {
    id: 'redis',
    title: 'Redis',
    match: (name) => name === 'redis' || name === 'redis-node',
  },
  {
    id: 'ai',
    title: 'AI & agents',
    match: (name) =>
      ['vector', 'rag', 'graphql', 'mcp'].includes(name) || name.startsWith('vector-'),
  },
  {
    id: 'dx',
    title: 'Developer experience',
    match: (name) => ['cli', 'testing'].includes(name),
  },
];

const FACADES = [
  { name: 'Route', package: '@tyravel/core', guide: '/guide/routing' },
  { name: 'DB', package: '@tyravel/core', guide: '/guide/database' },
  { name: 'Auth', package: '@tyravel/core', guide: '/guide/auth' },
  { name: 'Cache', package: '@tyravel/core', guide: '/guide/cache' },
  { name: 'Queue', package: '@tyravel/core', guide: '/guide/queues' },
  { name: 'Events', package: '@tyravel/core', guide: '/guide/events' },
  { name: 'Log', package: '@tyravel/core', guide: '/guide/configuration' },
  { name: 'Mail', package: '@tyravel/core', guide: '/guide/mail' },
  { name: 'Notifications', package: '@tyravel/core', guide: '/guide/notifications' },
  { name: 'Schedule', package: '@tyravel/core', guide: '/guide/queues' },
  { name: 'Storage', package: '@tyravel/core', guide: '/guide/storage' },
  { name: 'View', package: '@tyravel/core', guide: '/guide/views' },
  { name: 'Config', package: '@tyravel/config', guide: '/guide/configuration' },
  { name: 'Broadcast', package: '@tyravel/core', guide: '/guide/broadcasting' },
];

function ensureBuiltCli() {
  const kernelPath = join(ROOT, 'packages/cli/dist/kernel.js');
  if (!existsSync(kernelPath)) {
    execSync('npm run build --workspace=@tyravel/cli', { cwd: ROOT, stdio: 'inherit' });
  }
}

function readPackages() {
  const packagesDir = join(ROOT, 'packages');
  const entries = [];

  for (const dir of readdirSync(packagesDir).sort()) {
    const pkgPath = join(packagesDir, dir, 'package.json');
    if (!existsSync(pkgPath)) {
      continue;
    }

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (!pkg.name?.startsWith('@tyravel/')) {
      continue;
    }

    const shortName = pkg.name.replace('@tyravel/', '');
    const dtsPath = join(packagesDir, dir, 'dist/index.d.ts');
    entries.push({
      name: pkg.name,
      shortName,
      slug: shortName,
      version: pkg.version ?? '0.0.0',
      description: pkg.description ?? 'Tyravel package',
      directory: `packages/${dir}`,
      engines: pkg.engines?.node,
      dependencies: Object.keys(pkg.dependencies ?? {})
        .filter((dep) => dep.startsWith('@tyravel/'))
        .sort(),
      exports: existsSync(dtsPath) ? parseTypeScriptExports(readFileSync(dtsPath, 'utf8')) : { values: [], types: [] },
    });
  }

  return entries;
}

function parseTypeScriptExports(content) {
  const values = new Set();
  const types = new Set();

  for (const match of content.matchAll(/^export \{([^}]+)\}/gm)) {
    for (const symbol of splitExportSymbols(match[1] ?? '')) {
      values.add(symbol);
    }
  }

  for (const match of content.matchAll(/^export type \{([^}]+)\}/gm)) {
    for (const symbol of splitExportSymbols(match[1] ?? '')) {
      types.add(symbol);
    }
  }

  for (const match of content.matchAll(
    /^export (?:declare )?(?:abstract class|class|function|const|enum) (\w+)/gm,
  )) {
    if (match[1]) {
      values.add(match[1]);
    }
  }

  return {
    values: [...values].sort(),
    types: [...types].sort(),
  };
}

function splitExportSymbols(block) {
  return block
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const alias = part.match(/^(?:type\s+)?(\w+)(?:\s+as\s+(\w+))?$/);
      return alias?.[2] ?? alias?.[1] ?? part;
    });
}

function categorizePackage(shortName) {
  for (const category of PACKAGE_CATEGORIES) {
    if (category.match(shortName)) {
      return category;
    }
  }

  return { id: 'other', title: 'Other packages', match: () => true };
}

async function readCliCommands() {
  ensureBuiltCli();
  const { createKernel } = await import(join(ROOT, 'packages/cli/dist/kernel.js'));
  const kernel = createKernel();
  return kernel.list().map((command) => command.definition());
}

function generatedBanner() {
  return `<!-- Generated by scripts/generate-docs.mjs — do not edit by hand. -->\n\n`;
}

function writePackagePages(packages) {
  rmSync(PACKAGE_PAGES, { recursive: true, force: true });
  mkdirSync(PACKAGE_PAGES, { recursive: true });

  const byCategory = new Map();

  for (const pkg of packages) {
    const category = categorizePackage(pkg.shortName);
    const list = byCategory.get(category.id) ?? { category, packages: [] };
    list.packages.push(pkg);
    byCategory.set(category.id, list);
  }

  const overviewLines = [
    generatedBanner(),
    '# Package reference',
    '',
    'Auto-generated from `packages/*/package.json` and compiled TypeScript declarations.',
    '',
    `Current monorepo version: **${packages[0]?.version ?? 'unknown'}**.`,
    '',
  ];

  for (const { category, packages: grouped } of [...byCategory.values()].sort((left, right) =>
    left.category.title.localeCompare(right.category.title),
  )) {
    overviewLines.push(`## ${category.title}`, '');
    overviewLines.push('| Package | Description |');
    overviewLines.push('|---------|-------------|');
    for (const pkg of grouped.sort((left, right) => left.name.localeCompare(right.name))) {
      overviewLines.push(
        `| [${pkg.name}](/reference/generated/packages/${pkg.slug}) | ${escapeCell(pkg.description)} |`,
      );
    }
    overviewLines.push('');
  }

  writeFileSync(join(GENERATED_ROOT, 'packages.md'), overviewLines.join('\n'));

  for (const pkg of packages) {
    const category = categorizePackage(pkg.shortName);
    const lines = [
      generatedBanner(),
      `# ${pkg.name}`,
      '',
      pkg.description,
      '',
      '## Install',
      '',
      '```bash',
      `npm install ${pkg.name}`,
      '```',
      '',
      '## Metadata',
      '',
      '| Field | Value |',
      '|-------|-------|',
      `| Version | \`${pkg.version}\` |`,
      `| Source | [\`${pkg.directory}\`](https://github.com/thesimonharms/tyravel/tree/main/${pkg.directory}) |`,
      `| Category | ${category.title} |`,
    ];

    if (pkg.engines) {
      lines.push(`| Node.js | \`${pkg.engines}\` |`);
    }

    lines.push('');

    if (pkg.dependencies.length > 0) {
      lines.push('## Tyravel dependencies', '');
      for (const dependency of pkg.dependencies) {
        const slug = dependency.replace('@tyravel/', '');
        lines.push(`- [${dependency}](/reference/generated/packages/${slug})`);
      }
      lines.push('');
    }

    if (pkg.exports.values.length > 0 || pkg.exports.types.length > 0) {
      lines.push('## Public exports', '');
      lines.push('From the package entry point (`dist/index.d.ts`). Deep imports are not supported.');
      lines.push('');

      if (pkg.exports.values.length > 0) {
        lines.push('### Values', '');
        lines.push(pkg.exports.values.map((symbol) => `- \`${symbol}\``).join('\n'));
        lines.push('');
      }

      if (pkg.exports.types.length > 0) {
        lines.push('### Types', '');
        lines.push(pkg.exports.types.map((symbol) => `- \`${symbol}\``).join('\n'));
        lines.push('');
      }
    }

    const guide = guideLinkForPackage(pkg.shortName);
    if (guide) {
      lines.push('## Guide', '', `See the [${guide.title}](${guide.link}) guide for usage examples.`, '');
    }

    writeFileSync(join(PACKAGE_PAGES, `${pkg.slug}.md`), lines.join('\n'));
  }
}

function guideLinkForPackage(shortName) {
  const map = {
    core: { title: 'Introduction', link: '/guide/introduction' },
    http: { title: 'Controllers & middleware', link: '/guide/controllers' },
    database: { title: 'Database & ORM', link: '/guide/database' },
    views: { title: 'Views & templating', link: '/guide/views' },
    auth: { title: 'Authentication', link: '/guide/auth' },
    crypto: { title: 'Post-quantum crypto', link: '/guide/crypto' },
    cache: { title: 'Cache', link: '/guide/cache' },
    queue: { title: 'Queues & jobs', link: '/guide/queues' },
    mail: { title: 'Mail', link: '/guide/mail' },
    notifications: { title: 'Notifications', link: '/guide/notifications' },
    storage: { title: 'Storage', link: '/guide/storage' },
    cli: { title: 'Getting started', link: '/guide/getting-started' },
    testing: { title: 'Testing', link: '/guide/testing' },
    container: { title: 'Service container', link: '/guide/container' },
    collection: { title: 'Collections', link: '/guide/collection' },
    config: { title: 'Configuration', link: '/guide/configuration' },
    validation: { title: 'Validation', link: '/guide/validation' },
    events: { title: 'Events', link: '/guide/events' },
    vector: { title: 'Getting started', link: '/guide/getting-started' },
    rag: { title: 'Getting started', link: '/guide/getting-started' },
    graphql: { title: 'Getting started', link: '/guide/getting-started' },
    mcp: { title: 'Getting started', link: '/guide/getting-started' },
  };

  return map[shortName] ?? null;
}

function commandGroup(name) {
  return name.includes(':') ? name.split(':')[0] : 'project';
}

const GROUP_TITLES = {
  project: 'Project',
  db: 'Database',
  make: 'Generators',
  queue: 'Queue',
  route: 'Routing',
  view: 'Views',
  model: 'Models',
  auth: 'Auth',
  oauth: 'Auth',
  crypto: 'Crypto',
  vector: 'AI / vector',
  mcp: 'MCP',
  notification: 'Notifications',
  lang: 'Localization',
  debug: 'Debug',
  admin: 'Admin',
  schedule: 'Scheduler',
  session: 'Sessions',
};

const GROUP_ORDER = [
  'project',
  'db',
  'make',
  'queue',
  'route',
  'view',
  'model',
  'auth',
  'oauth',
  'crypto',
  'vector',
  'mcp',
  'notification',
  'lang',
  'debug',
  'admin',
  'schedule',
  'session',
];

function writeCliReference(commands, version) {
  const groups = new Map();

  for (const command of commands) {
    const group = commandGroup(command.name);
    const list = groups.get(group) ?? [];
    list.push(command);
    groups.set(group, list);
  }

  const lines = [
    generatedBanner(),
    '# CLI reference',
    '',
    'Auto-generated from `tyravel list` via `@tyravel/cli`.',
    '',
    `Monorepo version: **${version}**.`,
    '',
    '## Usage',
    '',
    '```bash',
    'tyravel <command> [options] [arguments]',
    'tyravel help <command>',
    '```',
    '',
  ];

  const rendered = new Set();

  for (const key of GROUP_ORDER) {
    const list = groups.get(key);
    if (!list) {
      continue;
    }
    rendered.add(key);
    lines.push(`## ${GROUP_TITLES[key] ?? key}`, '');
    lines.push('| Command | Description | Usage |');
    lines.push('|---------|-------------|-------|');
    for (const command of list.sort((left, right) => left.name.localeCompare(right.name))) {
      lines.push(
        `| \`${command.name}\` | ${escapeCell(command.description)} | ${command.usage ? `\`${escapeCell(command.usage)}\`` : '—'} |`,
      );
    }
    lines.push('');
  }

  for (const [group, list] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    if (rendered.has(group)) {
      continue;
    }
    lines.push(`## ${GROUP_TITLES[group] ?? group}`, '');
    lines.push('| Command | Description | Usage |');
    lines.push('|---------|-------------|-------|');
    for (const command of list.sort((left, right) => left.name.localeCompare(right.name))) {
      lines.push(
        `| \`${command.name}\` | ${escapeCell(command.description)} | ${command.usage ? `\`${escapeCell(command.usage)}\`` : '—'} |`,
      );
    }
    lines.push('');
  }

  writeFileSync(join(GENERATED_ROOT, 'cli.md'), lines.join('\n'));
}

function writeFacadesReference(version) {
  const lines = [
    generatedBanner(),
    '# Facades',
    '',
    'Facades provide a static entry point to services resolved from the application container.',
    '',
    `Documented for Tyravel **${version}**. See [API stability](/guide/api-stability) for stability tiers.`,
    '',
    '| Facade | Package | Guide |',
    '|--------|---------|-------|',
  ];

  for (const facade of FACADES) {
    lines.push(`| \`${facade.name}\` | \`${facade.package}\` | [${facade.guide}](${facade.guide}) |`);
  }

  lines.push(
    '',
    '## Usage',
    '',
    'Import facades from `@tyravel/core` (or `@tyravel/config` for `Config`) after booting the application:',
    '',
    '```typescript',
    "import { Route, View, DB } from '@tyravel/core';",
    "import { env } from '@tyravel/config';",
    '```',
    '',
  );

  writeFileSync(join(GENERATED_ROOT, 'facades.md'), lines.join('\n'));
}

function writeManifest(packages, commands, version) {
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        version,
        packages: packages.map((pkg) => ({
          name: pkg.name,
          slug: pkg.slug,
          description: pkg.description,
          path: `reference/generated/packages/${pkg.slug}`,
        })),
        commands: commands.map((command) => command.name),
        facades: FACADES.map((facade) => facade.name),
        sections: ['guide', 'reference', 'tutorials', 'cookbook'],
      },
      null,
      2,
    ) + '\n',
  );
}

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function packageSidebarItems(packages) {
  const byCategory = new Map();

  for (const pkg of packages) {
    const category = categorizePackage(pkg.shortName);
    const list = byCategory.get(category.title) ?? [];
    list.push(pkg);
    byCategory.set(category.title, list);
  }

  const items = [
    { text: 'Overview', link: '/reference/' },
    { text: 'All packages', link: '/reference/generated/packages' },
    { text: 'CLI commands', link: '/reference/generated/cli' },
    { text: 'Facades', link: '/reference/generated/facades' },
  ];

  for (const [title, grouped] of [...byCategory.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    items.push({
      text: title,
      collapsed: true,
      items: grouped
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((pkg) => ({
          text: pkg.shortName,
          link: `/reference/generated/packages/${pkg.slug}`,
        })),
    });
  }

  return items;
}

function writeSidebarModule(packages) {
  const sidebarPath = join(ROOT, 'docs/.vitepress/sidebar.mts');
  const content = `// Generated by scripts/generate-docs.mjs — package links refresh on docs:generate.

export const guideSidebar = [
  {
    text: 'Getting started',
    items: [
      { text: 'Introduction', link: '/guide/introduction' },
      { text: 'Installation', link: '/guide/getting-started' },
      { text: 'Application structure', link: '/guide/application-structure' },
      { text: 'API stability', link: '/guide/api-stability' },
      { text: 'Upgrading to 1.0', link: '/guide/upgrading-to-1.0' },
      { text: 'Configuration reference', link: '/guide/configuration-reference' },
    ],
  },
  {
    text: 'Deployment',
    items: [
      { text: 'Overview', link: '/guide/deployment' },
      { text: 'Docker', link: '/guide/deployment/docker' },
      { text: 'Fly.io', link: '/guide/deployment/fly' },
      { text: 'Railway', link: '/guide/deployment/railway' },
    ],
  },
  {
    text: 'Core concepts',
    items: [
      { text: 'Configuration', link: '/guide/configuration' },
      { text: 'Routing', link: '/guide/routing' },
      { text: 'Controllers & middleware', link: '/guide/controllers' },
      { text: 'Validation & form requests', link: '/guide/validation' },
    ],
  },
  {
    text: 'Data & APIs',
    items: [
      { text: 'Database & ORM', link: '/guide/database' },
      { text: 'API resources', link: '/guide/api-resources' },
      { text: 'Pagination', link: '/guide/pagination' },
    ],
  },
  {
    text: 'Platform features',
    items: [
      { text: 'Authentication', link: '/guide/auth' },
      { text: 'Post-quantum crypto', link: '/guide/crypto' },
      { text: 'Cache', link: '/guide/cache' },
      { text: 'Mail', link: '/guide/mail' },
      { text: 'Notifications', link: '/guide/notifications' },
      { text: 'Storage', link: '/guide/storage' },
      { text: 'Queues & jobs', link: '/guide/queues' },
      { text: 'Events', link: '/guide/events' },
      { text: 'Broadcasting', link: '/guide/broadcasting' },
      { text: 'Views & templating', link: '/guide/views' },
      { text: 'Testing', link: '/guide/testing' },
    ],
  },
  {
    text: 'Packages',
    items: [
      { text: 'Service container', link: '/guide/container' },
      { text: 'Collections', link: '/guide/collection' },
      { text: 'Support utilities', link: '/guide/support' },
      { text: 'Ecosystem', link: '/guide/ecosystem' },
    ],
  },
];

export const referenceSidebar = ${JSON.stringify(packageSidebarItems(packages), null, 2)};

export const tutorialsSidebar = [
  {
    text: 'Tutorial track',
    items: [
      { text: 'Overview', link: '/tutorials/' },
      { text: '1. Install & first route', link: '/tutorials/01-install-and-first-route' },
      { text: '2. Auth & database', link: '/tutorials/02-auth-and-database' },
      { text: '3. Queues & events', link: '/tutorials/03-queues-and-events' },
      { text: '4. Realtime & deploy', link: '/tutorials/04-realtime-and-deploy' },
    ],
  },
];

export const cookbookSidebar = [
  {
    text: 'Recipes',
    items: [
      { text: 'Overview', link: '/cookbook/' },
      { text: 'Realtime UI with Echo', link: '/cookbook/realtime-echo' },
      { text: 'RAG Q&A endpoint', link: '/cookbook/rag-q-and-a' },
      { text: 'Testing with fakes', link: '/cookbook/testing-fakes' },
      { text: 'Admin panel', link: '/cookbook/admin-panel' },
      { text: 'Multi-locale apps', link: '/cookbook/multi-locale' },
    ],
  },
];
`;

  writeFileSync(sidebarPath, content);
}

async function main() {
  mkdirSync(GENERATED_ROOT, { recursive: true });

  const packages = readPackages();
  const commands = await readCliCommands();
  const version = packages.find((pkg) => pkg.name === '@tyravel/core')?.version ?? '0.0.0';

  writePackagePages(packages);
  writeCliReference(commands, version);
  writeFacadesReference(version);
  writeManifest(packages, commands, version);
  writeSidebarModule(packages);

  console.log(`Generated docs for ${packages.length} packages and ${commands.length} CLI commands.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});