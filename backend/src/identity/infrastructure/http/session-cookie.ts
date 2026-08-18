import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import type { Environment } from '../../../config/environment';

@Injectable()
export class SessionCookie {
  private readonly name: string;
  private readonly options: CookieOptions;

  constructor(config: ConfigService<Environment, true>) {
    this.name = config.get('SESSION_COOKIE_NAME', { infer: true });
    this.options = {
      httpOnly: true,
      secure: config.get('SESSION_COOKIE_SECURE', { infer: true }),
      sameSite: config.get('SESSION_COOKIE_SAME_SITE', { infer: true }),
      path: '/',
    };
  }

  issue(response: Response, token: string, absoluteExpiresAt: Date): void {
    response.cookie(this.name, token, {
      ...this.options,
      expires: absoluteExpiresAt,
    });
  }

  remove(response: Response): void {
    response.clearCookie(this.name, this.options);
  }

  read(cookieHeader: string | undefined): string | null {
    return readCookie(cookieHeader, this.name);
  }
}

export function readCookie(
  cookieHeader: string | undefined,
  cookieName: string,
): string | null {
  if (!cookieHeader || cookieName.length === 0) {
    return null;
  }

  const values = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${cookieName}=`))
    .map((part) => part.slice(cookieName.length + 1));

  if (values.length !== 1 || values[0].length === 0) {
    return null;
  }

  try {
    return decodeURIComponent(values[0]);
  } catch {
    return null;
  }
}
