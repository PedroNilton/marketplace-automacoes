import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    healthController = module.get<HealthController>(HealthController);
  });

  it('reports that the API is healthy', () => {
    expect(healthController.check()).toEqual({
      status: 'ok',
      service: 'marketplace-automacoes-api',
    });
  });
});
