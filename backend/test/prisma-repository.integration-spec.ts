import { Injectable } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { UniqueConstraintViolationError } from '../src/application/errors/unique-constraint-violation.error';
import { TransactionManager } from '../src/application/ports/transaction-manager';
import { ApplicationConfigModule } from '../src/config/application-config.module';
import { PrismaExecutionContext } from '../src/infrastructure/database/prisma-execution-context';
import { PrismaModule } from '../src/infrastructure/database/prisma.module';
import { PrismaRepository } from '../src/infrastructure/database/prisma-repository';

interface CreateUserInput {
  id: string;
  email: string;
}

@Injectable()
class TestUserRepository extends PrismaRepository {
  constructor(context: PrismaExecutionContext) {
    super(context);
  }

  create(input: CreateUserInput): Promise<{ id: string }> {
    return this.execute((client) =>
      client.user.create({
        data: {
          id: input.id,
          displayName: 'Integration Test',
          email: input.email,
          passwordHash: 'not-a-real-password-hash',
          termsVersion: 'test-v1',
          privacyVersion: 'test-v1',
          legalAcceptedAt: new Date(),
        },
        select: { id: true },
      }),
    );
  }

  findIdByEmail(email: string): Promise<string | null> {
    return this.execute(async (client) => {
      const user = await client.user.findUnique({
        where: { email },
        select: { id: true },
      });

      return user?.id ?? null;
    });
  }

  deleteByEmails(emails: string[]): Promise<number> {
    return this.execute(async (client) => {
      const result = await client.user.deleteMany({
        where: { email: { in: emails } },
      });

      return result.count;
    });
  }
}

describe('Prisma repository base', () => {
  const emails = {
    committed: 't001009-commit@example.com',
    duplicate: 't001009-duplicate@example.com',
    rolledBack: 't001009-rollback@example.com',
  };

  let testingModule: TestingModule;
  let repository: TestUserRepository;
  let transactions: TransactionManager;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [ApplicationConfigModule, PrismaModule],
      providers: [TestUserRepository],
    }).compile();

    await testingModule.init();
    repository = testingModule.get(TestUserRepository);
    transactions = testingModule.get(TransactionManager);
  });

  beforeEach(async () => {
    await repository.deleteByEmails(Object.values(emails));
  });

  afterAll(async () => {
    await repository.deleteByEmails(Object.values(emails));
    await testingModule.close();
  });

  it('commits all writes when the operation succeeds', async () => {
    const userId = randomUUID();

    await transactions.run(() =>
      repository.create({ id: userId, email: emails.committed }),
    );

    await expect(repository.findIdByEmail(emails.committed)).resolves.toBe(
      userId,
    );
  });

  it('rolls all writes back when the operation fails', async () => {
    const failure = new Error('expected transaction failure');

    await expect(
      transactions.run(async () => {
        await repository.create({
          id: randomUUID(),
          email: emails.rolledBack,
        });
        throw failure;
      }),
    ).rejects.toBe(failure);

    await expect(
      repository.findIdByEmail(emails.rolledBack),
    ).resolves.toBeNull();
  });

  it('maps a duplicate email to an application persistence error', async () => {
    await repository.create({
      id: randomUUID(),
      email: emails.duplicate,
    });

    const error: unknown = await repository
      .create({
        id: randomUUID(),
        email: emails.duplicate,
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UniqueConstraintViolationError);
    expect(error).toHaveProperty('code', 'UNIQUE_CONSTRAINT_VIOLATION');
    expect(error).toHaveProperty('fields', expect.arrayContaining(['email']));
  });
});
