import { Module } from '@nestjs/common';
import { IdentityApplicationModule } from '../../identity-application.module';
import { IdentityController } from './identity.controller';
import { SessionCookie } from './session-cookie';
import { IdentityAccessGuard } from './identity-access.guard';
import { APP_GUARD } from '@nestjs/core';
import { BrowserProtectionGuard } from '../../../infrastructure/http/browser-protection/browser-protection.guard';

@Module({
  imports: [IdentityApplicationModule],
  controllers: [IdentityController],
  providers: [
    SessionCookie,
    IdentityAccessGuard,
    {
      provide: APP_GUARD,
      useClass: BrowserProtectionGuard,
    },
  ],
  exports: [IdentityAccessGuard],
})
export class IdentityHttpModule {}
