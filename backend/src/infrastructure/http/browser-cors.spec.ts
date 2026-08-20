import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureBrowserCors } from './browser-cors';

const FRONTEND_ORIGIN = 'http://127.0.0.1:3000';

describe('browser CORS', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [CorsTestController],
    }).compile();

    app = testingModule.createNestApplication();
    configureBrowserCors(app, FRONTEND_ORIGIN);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows only the configured frontend origin with credentials', async () => {
    await request(app.getHttpServer())
      .options('/_test/cors')
      .set('Origin', FRONTEND_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,x-csrf-token')
      .expect(204)
      .expect('Access-Control-Allow-Origin', FRONTEND_ORIGIN)
      .expect('Access-Control-Allow-Credentials', 'true')
      .expect('Access-Control-Allow-Headers', 'Content-Type,X-CSRF-Token');
  });

  it('does not grant CORS headers to another origin', async () => {
    const response = await request(app.getHttpServer())
      .options('/_test/cors')
      .set('Origin', 'https://attacker.example')
      .set('Access-Control-Request-Method', 'POST')
      .expect(404);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(
      response.headers['access-control-allow-credentials'],
    ).toBeUndefined();
  });
});

@Controller('_test/cors')
class CorsTestController {
  @Get()
  get(): { readonly status: 'ok' } {
    return { status: 'ok' };
  }
}
