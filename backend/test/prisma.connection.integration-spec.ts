import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationConfigModule } from '../src/config/application-config.module';
import { PrismaModule } from '../src/infrastructure/database/prisma.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('Prisma PostgreSQL connection', () => {
  let testingModule: TestingModule;
  let prismaService: PrismaService;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [ApplicationConfigModule, PrismaModule],
    }).compile();

    await testingModule.init();
    prismaService = testingModule.get(PrismaService);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  it('opens a connection and executes a minimal query', async () => {
    const rows = await prismaService.$queryRaw<Array<{ result: number }>>`
      SELECT 1::integer AS result
    `;

    expect(rows).toEqual([{ result: 1 }]);
  });
});
