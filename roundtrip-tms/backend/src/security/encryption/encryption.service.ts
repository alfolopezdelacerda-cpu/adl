import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import logger from '../../common/logger';

/**
 * ENCRIPTACIÓN AES-256-GCM
 * 
 * CRÍTICO: Protege datos sensibles (RFC, CURP, teléfono, email, cuenta bancaria)
 * 
 * Características:
 * - Algorithm: AES-256-GCM (incluye autenticación)
 * - Key derivation: PBKDF2 (100,000 iterations)
 * - IV (Initialization Vector): random 16 bytes
 * - Auth tag: 16 bytes
 * 
 * Nunca:
 * - ✗ Usar ECB mode
 * - ✗ Reutilizar IV
 * - ✗ Almacenar claves en código
 * - ✗ Usar contraseñas débiles
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly saltLength = 32;
  private readonly tagLength = 16;
  private readonly ivLength = 16;
  private masterKey: Buffer;

  constructor(private configService: ConfigService) {
    this.initializeMasterKey();
  }

  /**
   * Inicializar clave maestra desde variable de entorno o Vault
   * EN PRODUCCIÓN: Obtener desde HashiCorp Vault con rotación automática
   */
  private initializeMasterKey(): void {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

    if (!encryptionKey || encryptionKey.length < 32) {
      logger.warn(
        '⚠️ ENCRYPTION_KEY no es suficientemente segura (min 32 chars)',
        'EncryptionService',
      );
      // En dev, usar fallback; en prod, fallar
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_KEY no configurada o insegura');
      }
    }

    // Derivar clave usando PBKDF2
    const salt = Buffer.from('roundtrip-salt-2026'); // En prod, usar salt aleatorio de Vault
    this.masterKey = crypto.pbkdf2Sync(
      encryptionKey,
      salt,
      100000, // Iteraciones (OWASP recommend: 100k+)
      32,     // 256 bits
      'sha256',
    );

    logger.log('🔐 Master key inicializada (AES-256-GCM)', 'EncryptionService');
  }

  /**
   * Encriptar valor sensible
   * 
   * @param plaintext Valor a encriptar (RFC, CURP, teléfono, etc.)
   * @param additionalData Datos autenticados (no encriptados, pero validados)
   * @returns Base64 encoded: IV + authTag + ciphertext
   */
  encrypt(plaintext: string, additionalData?: string): string {
    try {
      // 1. Generar IV aleatorio (CRÍTICO: nuevo para cada encryption)
      const iv = crypto.randomBytes(this.ivLength);

      // 2. Crear cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

      // 3. Autenticar datos adicionales (opcional)
      if (additionalData) {
        cipher.setAAD(Buffer.from(additionalData, 'utf8'));
      }

      // 4. Encriptar
      let encrypted = cipher.update(plaintext, 'utf8', 'binary');
      encrypted += cipher.final('binary');

      // 5. Obtener auth tag (CRÍTICO: debe ser incluido)
      const authTag = cipher.getAuthTag();

      // 6. Concatenar: IV + authTag + ciphertext
      const result = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'binary'),
      ]);

      return result.toString('base64');
    } catch (error) {
      logger.error('❌ Error encriptando:', error, 'EncryptionService');
      throw new Error('Encryption failed');
    }
  }

  /**
   * Desencriptar valor
   * 
   * @param ciphertext Base64 encoded: IV + authTag + ciphertext
   * @param additionalData Datos autenticados (debe coincidir)
   * @returns Plaintext original
   */
  decrypt(ciphertext: string, additionalData?: string): string {
    try {
      // 1. Decodificar base64
      const buffer = Buffer.from(ciphertext, 'base64');

      // 2. Extraer componentes
      const iv = buffer.slice(0, this.ivLength);
      const authTag = buffer.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = buffer.slice(this.ivLength + this.tagLength);

      // 3. Crear decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);

      // 4. Establecer auth tag (CRÍTICO: validará integridad)
      decipher.setAuthTag(authTag);

      // 5. Autenticar datos adicionales (debe coincidir con encryption)
      if (additionalData) {
        decipher.setAAD(Buffer.from(additionalData, 'utf8'));
      }

      // 6. Desencriptar
      let decrypted = decipher.update(encrypted, 'binary', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error(
        '❌ Error desencriptando (posible tampering detectado):',
        error,
        'EncryptionService',
      );
      // NO revelar detalles del error (previene information disclosure)
      throw new Error('Decryption failed - data may be corrupted');
    }
  }

  /**
   * Hash seguro (para contraseñas, tokens, etc.)
   * Nota: NestJS/bcryptjs maneja esto, pero aquí va para referencia
   */
  hashPassword(password: string): string {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
      .toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verificar hash de contraseña
   */
  verifyPassword(password: string, hash: string): boolean {
    const [salt, original] = hash.split(':');
    const verify = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
      .toString('hex');
    return verify === original;
  }

  /**
   * Generar token seguro (para password reset, email verification, etc.)
   */
  generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Validar integridad de datos (HMAC)
   */
  generateHmac(data: string, secret?: string): string {
    const key = secret || this.masterKey.toString('hex');
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Verificar HMAC
   */
  verifyHmac(data: string, hmac: string, secret?: string): boolean {
    const expected = this.generateHmac(data, secret);
    // Usar comparación de tiempo constante (previene timing attacks)
    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(expected),
    );
  }
}
