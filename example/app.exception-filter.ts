import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { serializeError } from 'serialize-error';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        if (exception instanceof HttpException) {
            return super.catch(exception, host);
        }
        if (host.getType() === 'http') {
            const response = host.getArgByIndex(1);
            const body = {
                statusCode: 500,
                ...serializeError(exception),
            };
            return this.applicationRef?.reply(response, body, 500);
        }
        return super.catch(exception, host);
    }
}
