import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import { Public } from './public.decorator';
import { RequireAuth } from './require-auth.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @RequireAuth()
  @Get('me')
  me(@CurrentUser() user: unknown) {
    return user;
  }

  @RequireAuth()
  @Post('change-password')
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    return this.authService.changePassword(user.id, body.currentPassword ?? '', body.newPassword ?? '');
  }
}
