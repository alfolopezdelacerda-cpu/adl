import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { KeycloakStrategy } from './strategies/keycloak.strategy';
import { User } from './entities/user.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { MfaService } from './services/mfa.service';
import { KeycloakService } from './services/keycloak.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // Leer claves públicas/privadas para JWT RS256
        const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || 
          path.join(process.cwd(), 'keys/jwt.public.pem');
        const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH ||
          path.join(process.cwd(), 'keys/jwt.private.pem');

        // En producción, estas claves deben estar en Vault
        let publicKey = '';
        let privateKey = '';

        try {
          if (fs.existsSync(publicKeyPath)) {
            publicKey = fs.readFileSync(publicKeyPath, 'utf8');
          }
          if (fs.existsSync(privateKeyPath)) {
            privateKey = fs.readFileSync(privateKeyPath, 'utf8');
          }
        } catch (error) {
          console.warn('⚠️ JWT keys no encontradas, usando fallback');
          // En dev, permitir sin claves (Keycloak se encargará)
        }

        return {
          secret: configService.get('JWT_SECRET', 'dev-secret-min-32-chars-required'),
          signOptions: {
            expiresIn: configService.get('JWT_EXPIRATION', '900s'), // 15 min
            algorithm: 'HS256',
            issuer: 'roundtrip-tms',
          },
          verifyOptions: {
            algorithms: ['HS256', 'RS256'],
          },
          ...(privateKey && { privateKey }),
          ...(publicKey && { publicKey }),
        };
      },
    }),
    TypeOrmModule.forFeature([User, TokenBlacklist]),
  ],
  providers: [
    AuthService,
    MfaService,
    KeycloakService,
    JwtStrategy,
    JwtRefreshStrategy,
    KeycloakStrategy,
  ],
  controllers: [AuthController],
  exports: [AuthService, MfaService, KeycloakService],
})
export class AuthModule {}
