const MIN_MAJOR = 26;
const major = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);

if (major < MIN_MAJOR) {
  const nvmrc = '26';
  process.stderr.write(
    `Node ${MIN_MAJOR}+ is required (found ${process.versions.node}).\n`
    + `Pondoknusa targets Node ${nvmrc} for native WebSocket and OpenSSL PQC support.\n`
    + `Use nvm: nvm install ${nvmrc} && nvm use ${nvmrc}\n`
    + `Or ensure Node ${MIN_MAJOR}+ appears before other Node installs on PATH.\n`,
  );
  process.exit(1);
}