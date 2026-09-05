import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { throttler } from './common/throttler';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { TransformInterceptor } from './common/transform.interceptor';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { getSensitiveHeaders } from './common/security';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: false,
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const prefix = process.env.API_PREFIX ?? '/api/v1';
  app.setGlobalPrefix(prefix);

  // Security headers (helmet + CSP). CSP content adapted for the NestJS API.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use((_req: Request, res: Response, next: NextFunction) => {
    getSensitiveHeaders(_req, res, next);
  });
  app.use(cookieParser());

  // CORS for the web app origin(s). Cookies are httpOnly + sameSite=lax.
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Rate limiting
  app.use(throttler());

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('FICMS API')
    .setDescription(
      'Universal Fertility & IVF Clinic Management System – versioned REST API. Tenant-scoped, RBAC-protected, white-label.',
    )
    .setVersion('1.0')
    .addCookieAuth('ficms_access')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${prefix}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // Health for container probes
  const health = app.getHttpAdapter().getInstance();
  health.get(`${prefix}/health`, (_req: Request, res: Response) =>
    res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }),
  );
  health.get('/healthz', (_req: Request, res: Response) => res.status(200).json({ status: 'ok' }));

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API listening on http://0.0.0.0:${port}${prefix}`, 'Bootstrap');
}

bootstrap();
