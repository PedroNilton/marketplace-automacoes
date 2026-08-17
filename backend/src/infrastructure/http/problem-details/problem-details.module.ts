import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { NodeTraceIdGenerator } from './node-trace-id-generator';
import { ProblemDetailsFilter } from './problem-details.filter';
import { ProblemDetailsMapper } from './problem-details.mapper';
import { TraceIdGenerator } from './trace-id-generator';

@Module({
  providers: [
    ProblemDetailsMapper,
    NodeTraceIdGenerator,
    {
      provide: TraceIdGenerator,
      useExisting: NodeTraceIdGenerator,
    },
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsFilter,
    },
  ],
})
export class ProblemDetailsModule {}
