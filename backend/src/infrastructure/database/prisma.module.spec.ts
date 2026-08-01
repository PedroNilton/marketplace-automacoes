import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Environment } from '../../config/environment';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

describe('PrismaModule', () => {
  let testingModule: TestingModule;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const configService = {
      get: jest
        .fn<Environment['DATABASE_URL'], [key: keyof Environment]>()
        .mockReturnValue(
          'postgresql://marketplace:marketplace_local@127.0.0.1:5433/marketplace_automacoes',
        ),
    };

    testingModule = await Test.createTestingModule({
      imports: [PrismaModule],
    })
      .overrideProvider(ConfigService)
      .useValue(configService)
      .compile();

    prismaService = testingModule.get(PrismaService);
  });

  afterEach(async () => {
    await prismaService.$disconnect();
    await testingModule.close();
  });

  it('exports one injectable Prisma client', () => {
    expect(testingModule.get(PrismaService)).toBe(prismaService);
    expect(prismaService.$connect).toEqual(expect.any(Function));
    expect(prismaService.$disconnect).toEqual(expect.any(Function));
  });
});
