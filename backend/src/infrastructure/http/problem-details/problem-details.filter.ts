import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ProblemDetails, ProblemDescriptor } from './problem-details';
import { ProblemDetailsMapper } from './problem-details.mapper';
import { TraceIdGenerator } from './trace-id-generator';

const PROBLEM_TYPE_BASE_URL = 'https://marketplace.example/problems';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly mapper: ProblemDetailsMapper,
    private readonly traceIds: TraceIdGenerator,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const descriptor = this.mapper.map(exception);
    const traceId = this.traceIds.generate();
    const response = host.switchToHttp().getResponse<unknown>();
    const adapter = this.adapterHost.httpAdapter;

    adapter.setHeader(response, 'Content-Type', 'application/problem+json');
    adapter.setHeader(response, 'X-Trace-Id', traceId);
    if (descriptor.retryAfterSeconds !== undefined) {
      adapter.setHeader(
        response,
        'Retry-After',
        descriptor.retryAfterSeconds.toString(),
      );
    }

    adapter.reply(
      response,
      problemDetails(descriptor, traceId),
      descriptor.status,
    );
  }
}

function problemDetails(
  descriptor: ProblemDescriptor,
  traceId: string,
): ProblemDetails {
  return {
    type: `${PROBLEM_TYPE_BASE_URL}/${descriptor.typeSlug}`,
    title: descriptor.title,
    status: descriptor.status,
    code: descriptor.code,
    instance: `/problems/${traceId}`,
    ...(descriptor.errors ? { errors: descriptor.errors } : {}),
  };
}
