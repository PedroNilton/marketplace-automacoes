import { Module } from '@nestjs/common';
import { IdentityApplicationModule } from '../../identity-application.module';
import { IdentityController } from './identity.controller';

@Module({
  imports: [IdentityApplicationModule],
  controllers: [IdentityController],
})
export class IdentityHttpModule {}
