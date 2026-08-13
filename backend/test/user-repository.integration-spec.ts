import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { UserRepository } from '../src/identity/application/ports/user-repository';
import { EmailAddress } from '../src/identity/domain/email-address';
import { UserStatus } from '../src/identity/domain/user-account';
import { IdentityPersistenceModule } from '../src/identity/infrastructure/persistence/identity-persistence.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('PrismaUserRepository', () => {
  const emailValues = [
    't001014-create@example.com',
    't001014-normalized@example.com',
    't001014-verification@example.com',
    't001014-credentials@example.com',
    't001014-status@example.com',
  ];

  let testingModule: TestingModule;
  let repository: UserRepository;
  let prisma: PrismaService;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [IdentityPersistenceModule],
    }).compile();

    await testingModule.init();
    repository = testingModule.get(UserRepository);
    prisma = testingModule.get(PrismaService);
  });

  beforeEach(async () => {
    await deleteTestUsers();
  });

  afterAll(async () => {
    await deleteTestUsers();
    await testingModule.close();
  });

  it('creates an active, unverified member with the supplied account data', async () => {
    const legalAcceptedAt = new Date('2026-08-12T12:00:00.000Z');

    const user = await createUser(emailValues[0], { legalAcceptedAt });

    expect(user).toMatchObject({
      displayName: 'Usuário de Integração',
      passwordHash: 'argon2id:first-hash',
      status: 'ACTIVE',
      emailVerifiedAt: null,
      platformRole: 'MEMBER',
      termsVersion: 'terms-v1',
      privacyVersion: 'privacy-v1',
      legalAcceptedAt,
    });
    expect(user.email.value).toBe(emailValues[0]);
    expect(user.id).toEqual(expect.any(String));
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('finds the same account by id and by normalized email', async () => {
    const created = await createUser(emailValues[1]);
    const normalizedLookup = EmailAddress.create(
      '  T001014-NORMALIZED@EXAMPLE.COM  ',
    );

    await expect(repository.findById(created.id)).resolves.toMatchObject({
      id: created.id,
      email: { value: emailValues[1] },
    });
    await expect(
      repository.findByEmail(normalizedLookup),
    ).resolves.toMatchObject({ id: created.id });
  });

  it('returns null when an account does not exist', async () => {
    await expect(repository.findById(randomUUID())).resolves.toBeNull();
    await expect(
      repository.findByEmail(EmailAddress.create('missing@example.com')),
    ).resolves.toBeNull();
  });

  it('marks email verification only once', async () => {
    const created = await createUser(emailValues[2]);
    const firstVerification = new Date('2026-08-12T13:00:00.000Z');
    const repeatedVerification = new Date('2026-08-12T14:00:00.000Z');

    const verified = await repository.markEmailVerified(
      created.id,
      firstVerification,
    );
    const repeated = await repository.markEmailVerified(
      created.id,
      repeatedVerification,
    );

    expect(verified?.emailVerifiedAt).toEqual(firstVerification);
    expect(repeated?.emailVerifiedAt).toEqual(firstVerification);
  });

  it('replaces the password hash without changing account identity', async () => {
    const created = await createUser(emailValues[3]);

    const updated = await repository.updatePasswordHash(
      created.id,
      'argon2id:replacement-hash',
    );

    expect(updated).toMatchObject({
      id: created.id,
      passwordHash: 'argon2id:replacement-hash',
    });
    await expect(repository.findById(created.id)).resolves.toMatchObject({
      passwordHash: 'argon2id:replacement-hash',
    });
  });

  it.each<UserStatus>(['SUSPENDED', 'DEACTIVATED', 'ACTIVE'])(
    'changes the account state to %s',
    async (status) => {
      const existing =
        (await repository.findByEmail(EmailAddress.create(emailValues[4]))) ??
        (await createUser(emailValues[4]));

      const updated = await repository.updateStatus(existing.id, status);

      expect(updated).toMatchObject({ id: existing.id, status });
    },
  );

  it('returns null when trying to change a missing account', async () => {
    const missingId = randomUUID();

    await expect(
      repository.markEmailVerified(missingId, new Date()),
    ).resolves.toBeNull();
    await expect(
      repository.updatePasswordHash(missingId, 'argon2id:unused-hash'),
    ).resolves.toBeNull();
    await expect(
      repository.updateStatus(missingId, 'SUSPENDED'),
    ).resolves.toBeNull();
  });

  function createUser(
    email: string,
    overrides: { legalAcceptedAt?: Date } = {},
  ) {
    return repository.create({
      displayName: 'Usuário de Integração',
      email: EmailAddress.create(email),
      passwordHash: 'argon2id:first-hash',
      termsVersion: 'terms-v1',
      privacyVersion: 'privacy-v1',
      legalAcceptedAt:
        overrides.legalAcceptedAt ?? new Date('2026-08-12T12:00:00.000Z'),
    });
  }

  async function deleteTestUsers(): Promise<void> {
    await prisma.user.deleteMany({
      where: { email: { in: emailValues } },
    });
  }
});
