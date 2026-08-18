import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TraceIdGenerator } from './trace-id-generator';

@Injectable()
export class NodeTraceIdGenerator extends TraceIdGenerator {
  generate(): string {
    return randomUUID();
  }
}
