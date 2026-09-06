import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

interface ErrorBody {
  success: false;
  statusCode: number;
  message: string;
  code: string;
  details?: unknown;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Consistent API error envelope. Redacts internal details in production.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<{ originalUrl?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let body: ErrorBody = {
      success: false,
      statusCode: status,
      message,
      code,
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const r = response as Record<string, unknown>;
        message = (r.message as string) || message;
        if (Array.isArray(r.message)) {
          message = (r.message as string[]).join(', ');
        }
        code = (r.error as string) || code;
        if (r.fieldErrors) body.fieldErrors = r.fieldErrors as Record<string, string[]>;
      }
      body = { success: false, statusCode: status, message, code };
    } else if (exception instanceof Error) {
      // Prisma known request errors
      this.logger.error(exception.message, exception.stack, req?.originalUrl);
      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        message =
          process.env.NODE_ENV === 'development'
            ? exception.message
            : 'Internal server error';
      }
      body = { success: false, statusCode: status, message, code };
    } else {
      body = { success: false, statusCode: status, message, code };
    }

    res.status(status).json(body);
  }
}
