import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { Environment } from './config/environment';
import { configureBrowserCors } from './infrastructure/http/browser-cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Environment, true>);
  const port = config.get('PORT', { infer: true });
  const frontendOrigin = config.get('FRONTEND_ORIGIN', { infer: true });

  configureBrowserCors(app, frontendOrigin);

  await app.listen(port);
}

void bootstrap();
