import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { Environment } from '../../../config/environment';
import { ZodBodyPipe } from '../../../infrastructure/http/validation/zod-body.pipe';
import { ConfirmEmailVerification } from '../../application/confirm-email-verification';
import { ConfirmPasswordReset } from '../../application/confirm-password-reset';
import { InvalidOrExpiredTokenError } from '../../application/errors/invalid-or-expired-token.error';
import { GetCurrentIdentity } from '../../application/get-current-identity';
import { LoginUser } from '../../application/login-user';
import { LogoutSession } from '../../application/logout-session';
import { RegisterUser } from '../../application/register-user';
import { RequestPasswordReset } from '../../application/request-password-reset';
import { ResendEmailVerification } from '../../application/resend-email-verification';
import {
  confirmPasswordResetRequestSchema,
  ConfirmPasswordResetRequestDto,
  CurrentIdentityResponseDto,
  emailRequestSchema,
  EmailRequestDto,
  loginRequestSchema,
  LoginRequestDto,
  LoginResponseDto,
  NeutralAcceptedResponseDto,
  registerUserRequestSchema,
  RegisterUserRequestDto,
  tokenConfirmationRequestSchema,
  TokenConfirmationRequestDto,
} from './identity.dto';
import { readSessionCookie } from './session-cookie';

const REGISTRATION_ACCEPTED_MESSAGE =
  'Se o cadastro puder ser concluído, enviaremos as instruções para o e-mail informado.';
const EMAIL_VERIFICATION_ACCEPTED_MESSAGE =
  'Se a solicitação puder ser concluída, enviaremos as instruções para o e-mail informado.';
const PASSWORD_RESET_ACCEPTED_MESSAGE =
  'Se a recuperação puder ser iniciada, enviaremos as instruções para o e-mail informado.';

@ApiTags('Identidade e acesso')
@Controller('v1/auth')
export class IdentityController {
  private readonly sessionCookieName: string;

  constructor(
    private readonly registerUser: RegisterUser,
    private readonly confirmEmailVerification: ConfirmEmailVerification,
    private readonly resendEmailVerification: ResendEmailVerification,
    private readonly loginUser: LoginUser,
    private readonly getCurrentIdentity: GetCurrentIdentity,
    private readonly logoutSession: LogoutSession,
    private readonly requestPasswordReset: RequestPasswordReset,
    private readonly confirmPasswordReset: ConfirmPasswordReset,
    config: ConfigService<Environment, true>,
  ) {
    this.sessionCookieName = config.get('SESSION_COOKIE_NAME', { infer: true });
  }

  @Post('registrations')
  @HttpCode(202)
  @ApiOperation({ summary: 'Solicita o cadastro de uma conta' })
  @ApiBody({ type: RegisterUserRequestDto })
  @ApiAcceptedResponse({ type: NeutralAcceptedResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Dados inválidos.' })
  @ApiResponse({ status: 429, description: 'Limite de tentativas excedido.' })
  async register(
    @Body(new ZodBodyPipe(registerUserRequestSchema))
    body: RegisterUserRequestDto,
    @Req() request: Request,
  ): Promise<NeutralAcceptedResponseDto> {
    await this.registerUser.execute({
      ...body,
      originIdentifier: originIdentifier(request),
    });

    return { message: REGISTRATION_ACCEPTED_MESSAGE };
  }

  @Post('email-verifications/confirmations')
  @HttpCode(204)
  @ApiOperation({ summary: 'Confirma o endereço de e-mail' })
  @ApiBody({ type: TokenConfirmationRequestDto })
  @ApiNoContentResponse({ description: 'E-mail confirmado.' })
  @ApiBadRequestResponse({ description: 'Token inválido ou expirado.' })
  async confirmEmail(
    @Body(new ZodBodyPipe(tokenConfirmationRequestSchema))
    body: TokenConfirmationRequestDto,
  ): Promise<void> {
    const result = await this.confirmEmailVerification.execute(body);

    if (result.status === 'INVALID_OR_EXPIRED') {
      throw new InvalidOrExpiredTokenError();
    }
  }

  @Post('email-verifications/requests')
  @HttpCode(202)
  @ApiOperation({ summary: 'Solicita novo e-mail de verificação' })
  @ApiBody({ type: EmailRequestDto })
  @ApiAcceptedResponse({ type: NeutralAcceptedResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Dados inválidos.' })
  @ApiResponse({ status: 429, description: 'Limite de tentativas excedido.' })
  async resendEmail(
    @Body(new ZodBodyPipe(emailRequestSchema)) body: EmailRequestDto,
    @Req() request: Request,
  ): Promise<NeutralAcceptedResponseDto> {
    await this.resendEmailVerification.execute({
      email: body.email,
      originIdentifier: originIdentifier(request),
    });

    return { message: EMAIL_VERIFICATION_ACCEPTED_MESSAGE };
  }

  @Post('sessions')
  @HttpCode(200)
  @ApiOperation({ summary: 'Inicia uma sessão' })
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas.' })
  @ApiResponse({ status: 429, description: 'Limite de tentativas excedido.' })
  async login(
    @Body(new ZodBodyPipe(loginRequestSchema)) body: LoginRequestDto,
    @Req() request: Request,
  ): Promise<LoginResponseDto> {
    const result = await this.loginUser.execute({
      ...body,
      originIdentifier: originIdentifier(request),
    });

    return {
      user: result.user,
      session: {
        restricted: result.session.restricted,
        csrfToken: result.session.csrfToken,
        returnTo: result.session.returnTo,
      },
    };
  }

  @Get('session')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Obtém a identidade da sessão atual' })
  @ApiOkResponse({ type: CurrentIdentityResponseDto })
  @ApiUnauthorizedResponse({ description: 'Autenticação necessária.' })
  current(@Req() request: Request): Promise<CurrentIdentityResponseDto> {
    return this.getCurrentIdentity.execute({
      sessionToken: this.sessionToken(request),
    });
  }

  @Delete('session')
  @HttpCode(204)
  @ApiOperation({ summary: 'Encerra a sessão atual' })
  @ApiNoContentResponse({ description: 'Sessão encerrada.' })
  async logout(@Req() request: Request): Promise<void> {
    await this.logoutSession.execute({
      sessionToken: this.sessionToken(request),
    });
  }

  @Post('password-resets/requests')
  @HttpCode(202)
  @ApiOperation({ summary: 'Solicita recuperação de senha' })
  @ApiBody({ type: EmailRequestDto })
  @ApiAcceptedResponse({ type: NeutralAcceptedResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Dados inválidos.' })
  @ApiResponse({ status: 429, description: 'Limite de tentativas excedido.' })
  async requestReset(
    @Body(new ZodBodyPipe(emailRequestSchema)) body: EmailRequestDto,
    @Req() request: Request,
  ): Promise<NeutralAcceptedResponseDto> {
    await this.requestPasswordReset.execute({
      email: body.email,
      originIdentifier: originIdentifier(request),
    });

    return { message: PASSWORD_RESET_ACCEPTED_MESSAGE };
  }

  @Post('password-resets/confirmations')
  @HttpCode(204)
  @ApiOperation({ summary: 'Define uma nova senha com token de recuperação' })
  @ApiBody({ type: ConfirmPasswordResetRequestDto })
  @ApiNoContentResponse({ description: 'Senha alterada.' })
  @ApiBadRequestResponse({ description: 'Token inválido ou expirado.' })
  @ApiUnprocessableEntityResponse({ description: 'Dados inválidos.' })
  async confirmReset(
    @Body(new ZodBodyPipe(confirmPasswordResetRequestSchema))
    body: ConfirmPasswordResetRequestDto,
  ): Promise<void> {
    const result = await this.confirmPasswordReset.execute(body);

    if (result.status === 'INVALID_OR_EXPIRED') {
      throw new InvalidOrExpiredTokenError();
    }
  }

  private sessionToken(request: Request): string | null {
    return readSessionCookie(request.headers.cookie, this.sessionCookieName);
  }
}

function originIdentifier(request: Request): string {
  return request.ip || request.socket.remoteAddress || 'unknown-origin';
}
