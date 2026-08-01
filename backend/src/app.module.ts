import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from './config/application-config.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [ApplicationConfigModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
