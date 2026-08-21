import { Test, TestingModule } from '@nestjs/testing';
import { TransactionalEmailSender } from '../src/identity/application/ports/transactional-email-sender';
import { IdentityEmailModule } from '../src/identity/infrastructure/mail/identity-email.module';

const MAILPIT_MESSAGES_URL = 'http://127.0.0.1:8025/api/v1/messages';
const RECIPIENT = 'smtp-port-integration@marketplace.local';

interface MailpitMessage {
  readonly From: { readonly Address: string };
  readonly To: readonly { readonly Address: string }[];
  readonly Subject: string;
}

interface MailpitMessagesResponse {
  readonly messages: readonly MailpitMessage[];
}

describe('SmtpTransactionalEmailSender integration', () => {
  let testingModule: TestingModule;
  let sender: TransactionalEmailSender;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [IdentityEmailModule],
    }).compile();
    sender = testingModule.get(TransactionalEmailSender);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  it('delivers a configured SMTP message to Mailpit', async () => {
    const subject = `T-001-032 Mailpit ${Date.now()}`;

    await sender.send({
      to: RECIPIENT,
      subject,
      text: 'Mensagem de integração capturada pelo Mailpit.',
    });

    const message = await waitForMessage(subject);

    expect(message.From.Address).toBe('nao-responder@marketplace.local');
    expect(message.To.map((recipient) => recipient.Address)).toContain(
      RECIPIENT,
    );
    expect(message.Subject).toBe(subject);
  });
});

async function waitForMessage(subject: string): Promise<MailpitMessage> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(MAILPIT_MESSAGES_URL);

    if (!response.ok) {
      throw new Error(`Mailpit returned ${response.status}.`);
    }

    const payload = (await response.json()) as MailpitMessagesResponse;
    const message = payload.messages.find(
      (candidate) => candidate.Subject === subject,
    );

    if (message) {
      return message;
    }

    await delay(100);
  }

  throw new Error(`Mailpit did not receive the message "${subject}".`);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
