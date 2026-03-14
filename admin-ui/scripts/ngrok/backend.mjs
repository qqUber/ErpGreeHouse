import ngrok from '@ngrok/ngrok';

function getPort() {
  const value = process.env.NGROK_ADDR?.trim() || process.env.NGROK_PORT?.trim() || '8000';
  if (value.includes(':') && !/^\d+$/.test(value)) {
    return value;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid NGROK_ADDR/NGROK_PORT value: ${value}`);
  }

  return parsed;
}

function getDomain() {
  const explicitDomain = process.env.NGROK_DOMAIN?.trim();
  if (explicitDomain) {
    return explicitDomain;
  }

  const baseWebUrl = process.env.BASE_WEB_URL?.trim();
  if (!baseWebUrl) {
    return undefined;
  }

  try {
    const parsed = new URL(baseWebUrl);
    return parsed.hostname || undefined;
  } catch {
    throw new Error(`Invalid BASE_WEB_URL value: ${baseWebUrl}`);
  }
}

async function main() {
  const addr = getPort();
  const domain = getDomain();
  const listener = await ngrok.connect({
    addr,
    authtoken_from_env: true,
    domain,
  });

  const url = listener.url();

  console.log(`Ingress established at: ${url}`);
  console.log(`Set BASE_WEB_URL=${url}`);
  console.log(`Telegram webhook endpoint: ${url}/telegram/webhook`);

  const shutdown = async () => {
    clearInterval(keepAlive);
    await listener.close();
    process.exit(0);
  };

  const keepAlive = setInterval(() => {}, 60_000);

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
