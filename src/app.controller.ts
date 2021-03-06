import {BadRequestException, Body, Controller, Get, Post, Req, Res, UnauthorizedException} from '@nestjs/common';
import {AppService} from './app.service';
import * as bcrypt from 'bcrypt';
import {JwtService} from "@nestjs/jwt";
import {Response, Request} from 'express';

@Controller('api')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private jwtService: JwtService
  ) {
  }

  @Post('register')
  async register(
    @Body('username') username: string,
    @Body('password') password: string
  ) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await this.appService.create({ // register user baru
      username,
      password: hashedPassword
    });
    delete user.password;
    return user;
  }

  @Post('login')
  async login(
    @Body('username') username: string,
    @Body('password') password: string,
    @Res({passthrough: true}) response: Response
  ) {
    const user = await this.appService.findOne({username});
    if (!user) { // Jika username tidak cocok
      throw new BadRequestException('username tidak ditemukan');
    }
    if (!await bcrypt.compare(password, user.password)) { // Jika password tidak cocok
      throw new BadRequestException('password salah');
    }
    const jwt = await this.jwtService.signAsync({id: user.id});
    response.cookie('jwt', jwt, {httpOnly: true}); // simpan cookie
    return {
      message: 'login berhasil'
    };
  }

  @Get('user')
  async user(@Req() request: Request) {
    try {
      const cookie = request.cookies['jwt']; // Cek Cookie
      const data = await this.jwtService.verifyAsync(cookie); // Verifikasi Cookie
      if (!data) { // Jika data tidak valid
        throw new UnauthorizedException();
      }
      const user = await this.appService.findOne({id: data['id']}); // Get user by id
      const {password, ...result} = user;
      return result;
    } catch (e) {
      throw new UnauthorizedException();
    }
  }

  @Post('logout')
  async logout(@Res({passthrough: true}) response: Response) {
    response.clearCookie('jwt'); // Hapus Cookie
    return {
      message: 'logout berhasil'
    }
  }
}
