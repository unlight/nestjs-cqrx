# EventDBX Node Client (`eventdbxjs`)

`eventdbxjs` is a native addon (via [`napi-rs`](https://napi.rs/)) that gives the Node.js ecosystem first-class access to the EventDBX control socket. It wraps the Cap’n Proto control protocol exposed on port `6363`, delivering simple, Promise-based helpers for aggregate workflows.

> Status: experimental — the binding is still evolving alongside the EventDBX control protocol. Expect minor breaking changes until the API stabilises.

## Feature Highlights

- 🔌 Plug-and-play TCP client with optional token authentication.
- 🧾 JSON (de)serialisation for aggregates and event envelopes.
- 🧪 Built-in JSON Patch support (`[{ op, path, value }]`).
- 🧵 Async API surface designed for `async/await`.
- 🔁 Automatic retries with configurable exponential backoff.
- 🧱 Portable builds across macOS, Linux, and Windows via Cargo.

## Prerequisites

- Node.js 18 or newer (Node-API v8 compatible runtime).
- A Rust toolchain with `cargo` (install via [`rustup`](https://rustup.rs/)).
- `pnpm` 8+ or npm 9+ with [`corepack`](https://nodejs.org/api/corepack.html) enabled (`corepack enable`).

## Installing & Building

### Bootstrap this repository

```bash
corepack enable                       # once per machine
pnpm install                          # install JS dependencies and @napi-rs/cli
pnpm build                            # runs `napi build --platform --release`
```

`pnpm build` emits a platform-specific `eventdbx.*.node` binary in the project root.

If you prefer npm:

```bash
npm install
npm run build
```

### Using Cargo directly

Compile the addon from the repository root:

```bash
cargo build            # debug build
cargo build --release  # optimized build
```

The shared library is written to `target/{debug,release}` as `libeventdbx.*`. Rename it to `eventdbx.node` and place it beside your JavaScript entrypoint if you are wiring it up manually.

## Quick Start

```js
import { createClient } from 'eventdbxjs'

async function main() {
  const client = createClient({
    ip: process.env.EVENTDBX_HOST,
    port: Number(process.env.EVENTDBX_PORT) || 6363,
    token: process.env.EVENTDBX_TOKEN,
    verbose: false, // set true or false for mutate response, this should match verbose_responses = false on the server config file
    noNoise: false, // request plaintext control channel if the server allows it
    retry: {
      attempts: 3,
      initialDelayMs: 100,
      maxDelayMs: 1_000,
    },
  })

  await client.connect()

  try {
    // get a list of people, also support filtering if needed
    const { items: aggregates, nextCursor } = await client.list('person', { take: 20 })
    console.log(
      'known people:',
      aggregates.map((agg) => agg.aggregateId),
    )
    console.log('next cursor:', nextCursor)

    // create an aggregate
    const snapshot = await client.create('person', 'p-110', 'person_registered', {
      payload: { name: 'Jane Doe', status: 'active' },
      metadata: { '@source': 'seed-script' },
      note: 'seed aggregate',
    })
    console.log('created aggregate version', snapshot.version)

    // apply an event
    await client.apply('person', 'p-110', 'person_contact_added', {
      payload: { name: 'Jane Doe', status: 'active' },
      metadata: { note: 'seed data' },
    })

    // patch an event, it is like apply but allow you to use json+patch operation
    await client.patch('person', 'p-110', 'person_status_updated', [
      { op: 'replace', path: '/status', value: 'inactive' },
    ])

    // archive a person, moving an aggregate from active index to archived
    await client.archive('person', 'p-110', {
      note: 'cleanup test data',
    })

    // return a list of events of a p-110
    const { items: history } = await client.events('person', 'p-110')
    console.log('event count:', history.length)
  } finally {
    await client.disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
```

## API Overview

| API                                                                         | Description                                                                                |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `createClient(options?)`                                                    | Instantiate a client with optional `ip`, `port`, and `token` overrides.                    |
| `client.connect()` / `client.disconnect()`                                  | Open or close the TCP control socket.                                                      |
| `client.isConnected()`                                                      | Resolve to `true` when a socket is currently held.                                         |
| `client.endpoint`                                                           | Read-only `{ ip, port }` pulled from configuration.                                        |
| `client.list(aggregateType?, page?)`                                        | Fetch a page of aggregate snapshots, optionally filtered by type.                          |
| `client.get(aggregateType, aggregateId)`                                    | Resolve with the latest snapshot or `null` if none exists.                                 |
| `client.events(aggregateType, aggregateId, page?)`                          | Enumerate historical events for an aggregate.                                              |
| `client.apply(aggregateType, aggregateId, eventType, options?)`             | Append an event with JSON payload/metadata and return the stored event.                    |
| `client.create(aggregateType, aggregateId, eventType, options?)`            | Create an aggregate with an initial event payload and return the resulting snapshot.       |
| `client.archive(aggregateType, aggregateId, options?)`                      | Mark an aggregate as archived and return the updated snapshot.                             |
| `client.restore(aggregateType, aggregateId, options?)`                      | Restore an archived aggregate and return the updated snapshot.                             |
| `client.patch(aggregateType, aggregateId, eventType, operations, options?)` | Apply an RFC 6902 JSON Patch and return the updated aggregate snapshot.                    |
| `client.createSnapshot(aggregateType, aggregateId, options?)`               | Create a point-in-time snapshot for an aggregate and return it.                            |
| `client.listSnapshots(options?)`                                            | List snapshots, optionally filtering by aggregate type/ID or version.                      |
| `client.getSnapshot(snapshotId, options?)`                                  | Fetch a snapshot by ID or `null` when it does not exist.                                   |
| `client.select(aggregateType, aggregateId, fields)`                         | Resolve with a JSON object containing only the requested fields when the aggregate exists. |

`PageOptions` supports `{ take, cursor, includeArchived, archivedOnly, token }` for cursor-based pagination. Both `client.list` and `client.events` resolve to `{ items, nextCursor }` so you can feed the returned cursor into the next call. Set `archivedOnly` to `true` to request archived aggregates exclusively—`includeArchived` is inferred when you do. When appending events with `client.apply`, the aggregate must already exist; use `client.create` to emit the first event. `client.create` always requires an `eventType` and accepts optional `payload`, `metadata`, `publishTargets`, and `note` to seed the initial snapshot. Use `client.archive`/`client.restore` with `{ note }` to record why an aggregate changed archive state. Event mutations (`apply`, `create`, `patch`) also accept `publishTargets` to direct downstream plugins.

Aggregate sorting now matches the EventDBX CLI: pass fields like `created_at`, `updated_at`, `aggregate_type`, `aggregate_id`, or `archived`, optionally with `:asc`/`:desc` (e.g. `created_at:asc,aggregate_id:desc`). The `sort` option should be provided as a string in that format.

## Runtime Configuration

The constructor falls back to environment variables when options are omitted:

| Variable         | Default     | Description                          |
| ---------------- | ----------- | ------------------------------------ |
| `EVENTDBX_HOST`  | `127.0.0.1` | Hostname or IP address of the socket |
| `EVENTDBX_PORT`  | `6363`      | Control-plane TCP port               |
| `EVENTDBX_TOKEN` | _empty_     | Authentication token sent on connect |
| `EVENTDBX_TENANT_ID` | _empty_ | Tenant identifier included in the handshake |
| `EVENTDBX_NO_NOISE` | `false`  | Request plaintext control frames when the server allows it |

Passing explicit overrides is also supported:

```js
const client = createClient({
  ip: '10.1.0.42',
  port: 7000,
  token: 'super-secret',
  tenantId: 'tenant-a',
  noNoise: true, // ask the server to skip Noise encryption if configured to allow plaintext
})
await client.connect()
```

If you're running against a multi-tenant deployment, set `tenantId` (or the `EVENTDBX_TENANT_ID` env var) so the control handshake targets the expected tenant.

### Retry configuration

Each `DbxClient` automatically retries connection attempts and RPCs that fail due to transport/capnp errors. Retries are disabled by default (`attempts = 1`), but you can opt-in by passing a `retry` object:

```js
const client = createClient({
  token: process.env.EVENTDBX_TOKEN,
  retry: {
    attempts: 4,          // total tries (initial attempt + 3 retries)
    initialDelayMs: 100,  // first backoff duration
    maxDelayMs: 2_000,    // clamp exponential backoff
  },
})
```

Backoff doubles on each retry until `maxDelayMs` is reached. Only IO-level disconnects (e.g., socket resets) trigger a retry; logical server errors still surface immediately so you can handle them explicitly.

## TypeScript Surface

```ts
type Json = null | string | number | boolean | Json[] | { [key: string]: Json }

type JsonPatch =
  | { op: 'add' | 'replace' | 'test'; path: string; value: Json }
  | { op: 'remove'; path: string }
  | { op: 'move' | 'copy'; from: string; path: string }

interface ClientOptions {
  ip?: string
  port?: number
  token?: string
  tenantId?: string
  noNoise?: boolean
  verbose?: boolean
  retry?: RetryOptions
}

interface RetryOptions {
  attempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
}

interface PageOptions {
  cursor?: string
  take?: number
  includeArchived?: boolean
  archivedOnly?: boolean
  token?: string
  filter?: string
  sort?: string // e.g. "created_at:asc,aggregate_id:desc"
}

interface PageResult {
  items: Json[]
  nextCursor?: string
}

interface PublishTargetOptions {
  plugin: string
  mode?: 'all' | 'event-only' | 'state-only' | 'schema-only' | 'event-and-schema' | 'extensions-only' // default: 'all'
  priority?: 'high' | 'normal' | 'low'
}

interface AppendOptions {
  payload?: Json
  metadata?: Json
  note?: string
  token?: string
  publishTargets?: PublishTargetOptions[]
}

interface CreateAggregateOptions {
  token?: string
  payload?: Json
  metadata?: Json
  note?: string
  publishTargets?: PublishTargetOptions[]
}

interface SetArchiveOptions {
  token?: string
  note?: string
  comment?: string // legacy alias
}

interface PatchOptions {
  metadata?: Json
  note?: string
  token?: string
  publishTargets?: PublishTargetOptions[]
}

interface ClientEndpoint {
  ip: string
  port: number
}

interface Aggregate<TState = Json> {
  aggregateType: string
  aggregateId: string
  version: number
  state: TState
  merkleRoot: string
  archived: boolean
}

interface Event<TPayload = Json> {
  aggregateType: string
  aggregateId: string
  eventType: string
  version: number
  sequence: number
  payload: TPayload
  metadata: {
    eventId: string
    createdAt: string
    issuedBy?: { group?: string; user?: string }
    note?: string | null
  }
  hash: string
  merkleRoot: string
}

class DbxClient {
  constructor(options?: ClientOptions)
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): Promise<boolean>
  readonly endpoint: ClientEndpoint

  list<TState = Json>(aggregateType?: string, opts?: PageOptions): Promise<Aggregate<TState>[]>
  get<TState = Json>(aggregateType: string, aggregateId: string): Promise<Aggregate<TState> | null>
  events<TPayload = Json>(aggregateType: string, aggregateId: string, opts?: PageOptions): Promise<Event<TPayload>[]>
  apply<TPayload = Json>(
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    opts?: AppendOptions,
  ): Promise<Event<TPayload>>
  create<TState = Json>(
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    opts?: CreateAggregateOptions,
  ): Promise<any>
  archive<TState = Json>(aggregateType: string, aggregateId: string, opts?: SetArchiveOptions): Promise<any>
  restore<TState = Json>(aggregateType: string, aggregateId: string, opts?: SetArchiveOptions): Promise<any>
  patch<TState = Json>(
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    operations: JsonPatch[],
    opts?: PatchOptions,
  ): Promise<Aggregate<TState>>
  createSnapshot(
    aggregateType: string,
    aggregateId: string,
    opts?: { token?: string; comment?: string },
  ): Promise<Json>
  listSnapshots(opts?: {
    aggregateType?: string
    aggregateId?: string
    version?: number
    token?: string
  }): Promise<Json[]>
  getSnapshot(snapshotId: number, opts?: { token?: string }): Promise<Json | null>
  select(aggregateType: string, aggregateId: string, fields: string[]): Promise<Json | null>
}

declare function createClient(options?: ClientOptions): DbxClient
```

Filters use the same shorthand syntax understood by the EventDBX server: SQL-lite comparisons joined by `AND`/`OR`, optional `NOT`, and support for `=`, `!=`, `>`, `<`, `LIKE`, and `IN [...]`. Example strings include `status = "active"`, `score > 40 AND archived = false`, or `(owner.group = "ops" OR owner.group = "support") AND NOT archived = true`.

> The generated TypeScript declarations currently expose `any` for JSON payloads and snapshots; the runtime values still follow the `Aggregate`/`Event` shapes shown above.

All methods return Promises and throw regular JavaScript `Error` instances on failure (network issues, protocol validation errors, rejected patch operations, etc.) — wrap awaited calls in `try/catch`.

## Testing & Tooling

- `pnpm test` runs the JavaScript test suite (AVA).
- `cargo test` runs the Rust unit tests for the binding and shared client.
- `pnpm run lint` executes `oxlint` plus project formatting tasks.
- `pnpm run bench` runs micro benchmarks against an attached EventDBX instance.

## Development Notes

- The addon talks Cap’n Proto over TCP via the shared `ControlClient` in `src/plugin_api`.
- JSON Patch payloads **must** be valid RFC 6902 arrays; malformed operations are rejected by the server.
- WASI/worker bindings are generated under `eventdbx.wasi.*` for experimentation with Node WASI and browser runtimes.

### Tests

- `pnpm test` automatically exercises the JS bindings. If `EVENTDBX_TEST_PORT` is reachable, the suite runs a live smoke test; otherwise it falls back to mocked responses to keep coverage offline-friendly.
- `cargo test` runs the Rust unit tests that back the Node bindings.

## Roadmap

- [x] Add `package.json` metadata and prebuild scripts for automated npm releases.
- [x] Regenerate the published TypeScript definitions from the napi-rs metadata.
- [x] Surface strongly typed helpers for common aggregate payloads.
- [ ] Support streaming subscriptions once EventDBX exposes them on the control socket.
