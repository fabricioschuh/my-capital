import { Controller, Post, Body, HttpCode, HttpStatus, Res, Get } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: boolean }> {
    const { accessToken } = await this.authService.login(dto.username, dto.password);
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response): { ok: boolean } {
    res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none' });
    return { ok: true };
  }

  @Get('me')
  me(): { ok: boolean } {
    return { ok: true };
  }
}
