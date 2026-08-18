import { Module } from '@nestjs/common';
import { IdentityApplicationModule } from '../../identity-application.module';
import { IdentityController } from './identity.controller';
import { SessionCookie } from './session-cookie';

@Module({
  imports: [IdentityApplicationModule],
  controllers: [IdentityController],
  providers: [SessionCookie],
})
export class IdentityHttpModule {}
