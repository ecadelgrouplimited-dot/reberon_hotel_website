import { CanActivate, ExecutionContext, Injectable, SetMetadata, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { jwtVerify, SignJWT } from 'jose';
import { type Permission, type Role } from '@reberon/contracts';
import { env } from '../config.js';
import { forbidden, unauthorized } from './errors.js';
import { PrismaService } from './prisma.service.js';
import { ACCESS_SELECT, accessProblem, permissionsOf } from './access.js';

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
  /** Effective permissions (role preset ± per-person changes), set by the guard. */
  perms?: Permission[];
}

/** Whether this person may do this: their own permissions when known, else their role's preset. */
export function has(user: AuthUser | null | undefined, p: Permission): boolean {
  if (!user) return false;
  return user.perms ? user.perms.includes(p) : permissionsOf({ role: user.role, grants: [], revokes: [] }).includes(p);
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
    // Re-read every time: disabling someone, ending their hours or changing their access applies at once.
    const user = await this.prisma.user.findUnique({ where: { id: claims.id }, select: ACCESS_SELECT });
    if (!user) throw unauthorized('Your account is not active');
    const problem = accessProblem(user);
    if (problem) throw unauthorized(problem);
    const mine = permissionsOf(user);
    req.user = { id: user.id, email: user.email ?? '', name: user.name, role: user.role, perms: mine };

    const perms = this.reflector.getAllAndOverride<Permission[]>('permissions', [ctx.getHandler(), ctx.getClass()]) ?? [];
    for (const p of perms) if (!mine.includes(p)) throw forbidden();
    return true;
  }
}

function bearer(req: Request) {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : undefined;
}
