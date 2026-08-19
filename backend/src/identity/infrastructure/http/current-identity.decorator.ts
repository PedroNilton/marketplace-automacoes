import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { requireRequestIdentity, RequestIdentity } from './request-identity';

export const CurrentIdentity = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestIdentity =>
    requireRequestIdentity(context.switchToHttp().getRequest<Request>()),
);
