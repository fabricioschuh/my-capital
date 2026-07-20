import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(_context: ExecutionContext): Promise<boolean> {
    // Auth temporarily disabled
    return true;
  }

  private extractToken(request: Request): string | undefined {
    // 1. Authorization: Bearer <token>
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    // 2. Cookie: token=<token> (httpOnly cookie from frontend)
    const cookieToken = (request.cookies as Record<string, string>)?.['token'];
    if (cookieToken) return cookieToken;

    return undefined;
  }
}
