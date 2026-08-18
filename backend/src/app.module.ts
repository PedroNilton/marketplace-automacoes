import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from './config/application-config.module';
import { HealthController } from './health/health.controller';
import { ProblemDetailsModule } from './infrastructure/http/problem-details/problem-details.module';
import { IdentityHttpModule } from './identity/infrastructure/http/identity-http.module';

@Module({
  imports: [ApplicationConfigModule, ProblemDetailsModule, IdentityHttpModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
