export interface TransactionalEmail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
}

export abstract class TransactionalEmailSender {
  abstract send(message: TransactionalEmail): Promise<void>;
}
