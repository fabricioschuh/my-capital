import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(username: string, password: string): Promise<{ accessToken: string }> {
    const expectedUsername = this.configService.get<string>('app.authUsername');
    const passwordHash = this.configService.get<string>('app.authPasswordHash');
    const legacyPassword = this.configService.get<string>('app.authPassword');

    if (!passwordHash && !legacyPassword) {
      throw new Error('AUTH_PASSWORD_HASH (or AUTH_PASSWORD) is not configured');
    }

    const usernameMatch = username === expectedUsername;

    let passwordMatch: boolean;
    if (passwordHash) {
      // Secure path: compare against bcrypt hash
      passwordMatch = await bcrypt.compare(password, passwordHash);
    } else {
      // Legacy plain-text fallback (still works, but logs a warning)
      passwordMatch = password === legacyPassword;
      this.logger.warn('[Auth] Using plain-text AUTH_PASSWORD — switch to AUTH_PASSWORD_HASH.');
    }

    // Always do both checks before throwing to prevent timing attacks
    if (!usernameMatch || !passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: username, iat: Math.floor(Date.now() / 1000) };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }
}
