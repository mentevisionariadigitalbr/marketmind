import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ApplicationError } from '../../modules/iam/application/errors';

const STATUS_BY_CODE: Record<string, number> = {
  VALIDATION: HttpStatus.BAD_REQUEST,
  EMAIL_IN_USE: HttpStatus.CONFLICT,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  INVALID_REFRESH_TOKEN: HttpStatus.UNAUTHORIZED,
  USER_INACTIVE: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  PLAN_LIMIT_EXCEEDED: HttpStatus.PAYMENT_REQUIRED,
  SUBSCRIPTION_REQUIRED: HttpStatus.PAYMENT_REQUIRED,
  BILLING_NOT_CONFIGURED: HttpStatus.SERVICE_UNAVAILABLE,
  PLAN_CODE_IN_USE: HttpStatus.CONFLICT,
};

/** Traduz erros de aplicação (framework-free) em respostas HTTP coerentes. */
@Catch(ApplicationError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: ApplicationError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = STATUS_BY_CODE[exception.code] ?? HttpStatus.BAD_REQUEST;
    response.status(status).json({
      statusCode: status,
      code: exception.code,
      message: exception.message,
    });
  }
}
