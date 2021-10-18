import erroz from 'erroz';

/**
 * @constructor
 * @param options
 * @param options.streamId
 * @param options.expectedRevision
 */
export const WrongExpectedVersion = erroz({
    code: 'WRONG_EXPECTED_VERSION',
    template: 'Expected revision in %streamId do not match %expectedRevision',
});

/**
 * @constructor
 * @param options
 * @param options.streamId
 */
export const StreamNotFound = erroz({
    code: 'STREAM_NOT_FOUND',
    template: 'Stream %streamId not found',
});
