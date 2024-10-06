import { ANY, NO_STREAM, STREAM_EXISTS } from './constants';

type ExpectedRevision = bigint | typeof STREAM_EXISTS | typeof NO_STREAM | typeof ANY;

export class WrongExpectedVersion extends Error {
  readonly code = 'WRONG_EXPECTED_VERSION';
  readonly streamId: string;
  readonly expectedRevision: ExpectedRevision;

  constructor(args: {
    streamId: string;
    expectedRevision: ExpectedRevision;
    cause?: Error;
  }) {
    super(
      `Expected revision in ${args.streamId} do not match ${args.expectedRevision}`,
      { cause: args.cause },
    );
    this.streamId = args.streamId;
    this.expectedRevision = args.expectedRevision;
  }
}

export class StreamNotFound extends Error {
  readonly code = 'STREAM_NOT_FOUND';
  constructor(args: { streamId: string; cause?: Error }) {
    super(`Stream ${args.streamId} not found`, { cause: args?.cause });
  }
}
