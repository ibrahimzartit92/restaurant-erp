import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './public.decorator';
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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: unknown) {
    return user;
  }
}
