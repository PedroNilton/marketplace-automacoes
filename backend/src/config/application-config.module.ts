import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { validateEnvironment } from './environment';

const rootEnvironmentFile = resolve(__dirname, '../../../.env');

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: rootEnvironmentFile,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      isGlobal: true,
      skipProcessEnv: true,
      validate: validateEnvironment,
    }),
  ],
})
export class ApplicationConfigModule {}
