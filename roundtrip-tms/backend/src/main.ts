import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as helmet from 'helmet';
import * as compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'mongo-sanitize';
import { AppModule } from './app.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import logger from './common/logger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // ============================================
  // SEGURIDAD: Headers (OWASP)
  // ============================================
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 año
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    noSniff: true,
    xssFilter: true,
  }));

  // ============================================
  // SEGURIDAD: Rate Limiting
  // ============================================
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // máx 1000 requests por IP
    message: 'Demasiadas solicitudes desde esta IP, por favor intente más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Whitelist IPs internas
      return ['127.0.0.1', '::1'].includes(req.ip);
    },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // Máx 5 intentos de login
    message: 'Demasiados intentos de login, cuenta bloqueada 15 minutos',
    skipSuccessfulRequests: true,
  });

  app.use('/api/', limiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/refresh', authLimiter);

  // ============================================
  // SEGURIDAD: Compression + Data Sanitization
  // ============================================
  app.use(compression());
  app.use(mongoSanitize()); // Previene NoSQL injection

  // ============================================
  // SEGURIDAD: CORS (Solo frontend autorizado)
  // ============================================
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  });

  // ============================================
  // VALIDACIÓN: Input Validation (Automático)
  // ============================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades no definidas
      forbidNonWhitelisted: true, // Rechaza propiedades extra
      transform: true, // Transforma tipos automáticamente
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map(
          (error) => ({
            field: error.property,
            messages: Object.values(error.constraints || {}),
          }),
        );
        return new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: messages,
        });
      },
    }),
  );

  // ============================================
  // AUDITORÍA: Interceptor Global
  // ============================================
  app.useGlobalInterceptors(new AuditInterceptor());

  // ============================================
  // ERROR HANDLING: Global Exception Filter
  // ============================================
  app.useGlobalFilters(new AllExceptionsFilter());

  // ============================================
  // SEGURIDAD: Desactivar headers peligrosos
  // ============================================
  app.disable('x-powered-by');
  app.disable('etag');

  // ============================================
  // HEALTH CHECK
  // ============================================
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // ============================================
  // INICIAR SERVIDOR
  // ============================================
  const port = process.env.API_PORT || 3000;
  const env = process.env.NODE_ENV || 'development';

  await app.listen(port);

  logger.log(
    `🚀 ROUNDTRIP TMS Backend iniciado en puerto ${port} (${env})`,
    'Bootstrap',
  );

  // Log de configuración de seguridad
  logger.log('🔒 Seguridad activada:', 'Bootstrap');
  logger.log('  ✓ Helmet headers configurados', 'Bootstrap');
  logger.log('  ✓ Rate limiting activo', 'Bootstrap');
  logger.log('  ✓ CORS configurado', 'Bootstrap');
  logger.log('  ✓ Input validation activo', 'Bootstrap');
  logger.log('  ✓ Auditoría global activada', 'Bootstrap');
}

bootstrap().catch((err) => {
  logger.error('❌ Error al iniciar:', err);
  process.exit(1);
});
