import { CanActivate, ExecutionContext, Injectable, SetMetadata, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { jwtVerify, SignJWT } from 'jose';
import { can, type Permission, type Role } from '@reberon/contracts';
import { env } from '../config.js';
import { forbidden, unauthorized } from './errors.js';
import { PrismaService } from './prisma.service.js';

export const ACCESS_COOKIE = 'rb_at';
export const REFRESH_COOKIE = 'rb_rt';
export const SESSION_HINT_COOKIE = 'rb_session';
export const ACCESS_TTL_SECONDS = 15 * 60;

const key = new TextEncoder().encode(env.JWT_SECRET);

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export async function signAccessToken(user: AuthUser) {
  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setIssuer('reberon-api')
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(key);
}

export async function verifyAccessToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, key, { issuer: 'reberon-api' });
    return { id: payload.sub!, email: payload.email as string, name: payload.name as string, role: payload.role as Role };
  } catch {
    return null;
  }
}

/** Mark a route as reachable without a session (login, refresh…). */
export const Public = () => SetMetadata('isPublic', true);
/** Require permissions (all of them). */
export const Requires = (...perms: Permission[]) => SetMetadata('permissions', perms);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>().user);

/**
 * Guards every /v1/admin route. Reads the access cookie, re-checks the user is
 * still active (so disabling someone takes effect at once), then checks permissions.
 * Mutations must carry the X-Reberon-Client header: a custom header forces a CORS
 * preflight, so other sites cannot forge requests with the user's cookie.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (!req.path.startsWith('/v1/admin')) return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [ctx.getHandler(), ctx.getClass()]);

    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers['x-reberon-client'] !== 'admin') {
      throw forbidden('Missing client header');
    }
    if (isPublic) return true;

    const token = req.cookies?.[ACCESS_COOKIE] ?? bearer(req);
    const claims = token ? await verifyAccessToken(token) : null;
    if (!claims) throw unauthorized();
    const user = await this.prisma.user.findUnique({ where: { id: claims.id }, select: { id: true, email: true, name: true, role: true, status: true, deletedAt: true } });
    if (!user || user.status !== 'ACTIVE' || user.deletedAt) throw unauthorized('Your account is not active');
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role };

    const perms = this.reflector.getAllAndOverride<Permission[]>('permissions', [ctx.getHandler(), ctx.getClass()]) ?? [];
    for (const p of perms) if (!can(user.role, p)) throw forbidden();
    return true;
  }
}

function bearer(req: Request) {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : undefined;
}
