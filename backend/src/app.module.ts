import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from './config/application-config.module';
import { HealthController } from './health/health.controller';
import { ProblemDetailsModule } from './infrastructure/http/problem-details/problem-details.module';

@Module({
  imports: [ApplicationConfigModule, ProblemDetailsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
