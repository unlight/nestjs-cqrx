import ExtensibleCustomError from 'extensible-custom-error';
import { NO_STREAM, STREAM_EXISTS, ANY } from './constants';

type ExpectedRevision = bigint | typeof STREAM_EXISTS | typeof NO_STREAM | typeof ANY;

export class WrongExpectedVersion extends ExtensibleCustomError {
  readonly code = 'WRONG_EXPECTED_VERSION';
  readonly streamId: string;
  readonly expectedRevision: ExpectedRevision;

  constructor(args: {
    streamId: string;
    expectedRevision: ExpectedRevision;
    error?: Error;
  }) {
    super(
      `Expected revision in ${args.streamId} do not match ${args.expectedRevision}`,
      args.error,
    );
    this.streamId = args.streamId;
    this.expectedRevision = args.expectedRevision;
  }
}

export class StreamNotFound extends ExtensibleCustomError {
  readonly code = 'STREAM_NOT_FOUND';
  constructor(args: { streamId: string; error?: Error }) {
    super(`Stream ${args.streamId} not found`, args.error);
  }
}
