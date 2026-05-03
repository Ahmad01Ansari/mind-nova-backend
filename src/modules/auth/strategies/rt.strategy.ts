import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_REFRESH_SECRET!,
      passReqToCallback: true, // Corrected property for Passport-JWT
    });
  }

  async validate(req: Request, payload: any) {
    const authHeader = req.get('authorization');
    const refreshToken = authHeader?.replace('Bearer', '').trim();
    
    if (!refreshToken) throw new ForbiddenException('Refresh token malformed');

    return {
      ...payload,
      refreshToken,
    };
  }
}
