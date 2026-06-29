/**
 * Cluster primary/worker bootstrap for `pondoknusa start --cluster`.
 *
 * Workers dynamically import PONDOKNUSA_CLUSTER_ENTRY (the app main file).
 */
import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';
import { pathToFileURL } from 'node:url';

const entry = process.env.PONDOKNUSA_CLUSTER_ENTRY;
if (!entry) {
  console.error('PONDOKNUSA_CLUSTER_ENTRY is not set.');
  process.exit(1);
}

const clusterEntry = entry;

const workers = Math.max(
  1,
  Number(process.env.PONDOKNUSA_WORKERS) || availableParallelism(),
);

async function runWorker(): Promise<void> {
  await import(pathToFileURL(clusterEntry).href);
}

if (cluster.isPrimary) {
  console.log(`Cluster primary ${process.pid} — starting ${workers} workers`);
  console.log('Use Redis (or database) session store when running multiple workers.');

  for (let index = 0; index < workers; index += 1) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    if (signal === 'SIGTERM' || signal === 'SIGINT') {
      return;
    }

    console.error(`Worker ${worker.process.pid} exited (${code ?? signal}); restarting…`);
    cluster.fork();
  });

  const shutdown = () => {
    for (const worker of Object.values(cluster.workers ?? {})) {
      worker?.kill('SIGTERM');
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} else {
  runWorker().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}