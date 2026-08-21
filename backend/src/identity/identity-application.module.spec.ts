import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationConfigModule } from '../config/application-config.module';
import { ConfirmEmailVerification } from './application/confirm-email-verification';
import { ConfirmPasswordReset } from './application/confirm-password-reset';
import { GetCurrentIdentity } from './application/get-current-identity';
import { LoginUser } from './application/login-user';
import { LogoutSession } from './application/logout-session';
import { RegisterUser } from './application/register-user';
import { RequestPasswordReset } from './application/request-password-reset';
import { ResendEmailVerification } from './application/resend-email-verification';
import { TransactionalEmailSender } from './application/ports/transactional-email-sender';
import { IdentityEmailTemplates } from './infrastructure/mail/identity-email-templates';
import { SmtpTransactionalEmailSender } from './infrastructure/mail/smtp-transactional-email-sender';
import { IdentityApplicationModule } from './identity-application.module';

describe('IdentityApplicationModule', () => {
  let testingModule: TestingModule | undefined;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [ApplicationConfigModule, IdentityApplicationModule],
    }).compile();
  });

  afterAll(async () => {
    await testingModule?.close();
  });

  it.each([
    RegisterUser,
    ConfirmEmailVerification,
    ResendEmailVerification,
    LoginUser,
    GetCurrentIdentity,
    LogoutSession,
    RequestPasswordReset,
    ConfirmPasswordReset,
  ])('composes and exports %s with validated dependencies', (useCase) => {
    expect(testingModule?.get(useCase)).toBeInstanceOf(useCase);
  });

  it('composes the transactional email port with the SMTP adapter', () => {
    expect(testingModule?.get(TransactionalEmailSender)).toBeInstanceOf(
      SmtpTransactionalEmailSender,
    );
  });

  it('composes the identity email templates with validated configuration', () => {
    expect(testingModule?.get(IdentityEmailTemplates)).toBeInstanceOf(
      IdentityEmailTemplates,
    );
  });
});
