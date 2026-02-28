import { createEventdbxEventstoreClient } from '../../eventdbx-cqrx/src/index.ts';
import { createKurrentdbEventstoreClient } from '../../kurrentdb-cqrx/src/index.ts';

export async function dbxEventStoreClient() {
  const client = await createEventdbxEventstoreClient({
    ip: '127.0.0.1',
    port: 6363,
    token: process.env.EVENTDBX_TOKEN,
    verbose: true,
  });

  // To test pagination
  client.configure({ pageOptionsTake: 2 });

  return client;
}

export function kurrentdbEventStoreClient() {
  return createKurrentdbEventstoreClient({
    connectionString: 'kurrentdb://localhost:2113?tls=false',
  });
}

export { TestEvent } from './test-event.ts';
