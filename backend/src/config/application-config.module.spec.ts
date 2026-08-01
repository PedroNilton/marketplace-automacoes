import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import type { Environment } from './environment';

describe('ApplicationConfigModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('exposes validated runtime values with their inferred types', () => {
    const config = module.get(ConfigService<Environment, true>);

    expect(config.get('PORT', { infer: true })).toBe(3001);
    expect(config.get('SMTP_SECURE', { infer: true })).toBe(false);
    expect(config.get('SESSION_ABSOLUTE_TTL', { infer: true })).toBe(604800);
  });
});
