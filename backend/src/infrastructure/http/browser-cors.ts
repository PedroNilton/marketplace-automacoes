import type { INestApplication } from '@nestjs/common';
import type { CustomOrigin } from '@nestjs/common/interfaces/external/cors-options.interface';

export function configureBrowserCors(
  app: INestApplication,
  frontendOrigin: string,
): void {
  const allowConfiguredOrigin: CustomOrigin = (requestOrigin, callback) => {
    callback(null, !requestOrigin || requestOrigin === frontendOrigin);
  };

  app.enableCors({
    origin: allowConfiguredOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    exposedHeaders: ['X-Trace-Id', 'Retry-After'],
    maxAge: 600,
  });
}
