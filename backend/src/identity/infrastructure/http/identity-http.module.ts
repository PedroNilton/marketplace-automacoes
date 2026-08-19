import { Module } from '@nestjs/common';
import { IdentityApplicationModule } from '../../identity-application.module';
import { IdentityController } from './identity.controller';
import { SessionCookie } from './session-cookie';
import { IdentityAccessGuard } from './identity-access.guard';

@Module({
  imports: [IdentityApplicationModule],
  controllers: [IdentityController],
  providers: [SessionCookie, IdentityAccessGuard],
  exports: [IdentityAccessGuard],
})
export class IdentityHttpModule {}
