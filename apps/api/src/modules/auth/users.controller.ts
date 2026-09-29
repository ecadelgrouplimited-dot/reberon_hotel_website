import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { zInviteInput, zUserUpdateInput, type UserDTO } from '@reberon/contracts';
import type { z } from 'zod';
import type { User } from '@reberon/db';
import { PrismaService } from '../../common/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { CurrentUser, Requires, type AuthUser } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import { badRequest, notFound } from '../../common/errors.js';
import { env } from '../../config.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { hashToken, newToken } from './tokens.js';

const toDTO = (u: User): UserDTO => ({
  id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role, status: u.status,
  lastLoginAt: u.lastLoginAt?.toISOString() ?? null, createdAt: u.createdAt.toISOString(),
});

@Controller('v1/admin/users')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Staff list is visible to anyone who can assign conversations. */
  @Get()
  @Requires('inbox:read')
  async list() {
    const rows = await this.prisma.user.findMany({ where: { deletedAt: null }, orderBy: [{ status: 'asc' }, { name: 'asc' }] });
    return rows.map(toDTO);
  }

  @Post('invite')
  @Requires('users:manage')
  async invite(@Body(new ZodPipe(zInviteInput)) body: z.infer<typeof zInviteInput>, @CurrentUser() me: AuthUser, @Req() req: Request) {
    const existing = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (existing && existing.status !== 'INVITED') throw badRequest('Someone with that email already has an account');
    const user = existing ?? (await this.prisma.user.create({ data: { email: body.email, name: body.name, role: body.role, status: 'INVITED' } }));
    const token = newToken();
    await this.prisma.userToken.create({ data: { userId: user.id, kind: 'INVITE', tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
    const url = `${env.ADMIN_URL}/accept-invite?token=${token}`;
    await this.notifications.email({
      to: user.email,
      subject: `${me.name} invited you to the Reberon Suite`,
      heading: 'You have been invited',
      paragraphs: [`Hello ${body.name.split(' ')[0]},`, `${me.name} has given you access to the Reberon Hotel Suite as ${body.role.toLowerCase()}. Choose a password to start. The link works for seven days.`],
      action: { label: 'Accept and set a password', url },
    });
    await this.audit.record({ actor: me, action: 'user.invite', entityType: 'User', entityId: user.id, summary: `Invited ${user.email} as ${body.role}`, req });
    return { user: toDTO(user), inviteUrl: env.NODE_ENV === 'production' ? undefined : url };
  }

  @Patch(':id')
  @Requires('users:manage')
  async update(@Param('id') id: string, @Body(new ZodPipe(zUserUpdateInput)) body: z.infer<typeof zUserUpdateInput>, @CurrentUser() me: AuthUser, @Req() req: Request) {
    const before = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw notFound('User');
    if (id === me.id && (body.role && body.role !== before.role || body.status === 'DISABLED')) throw badRequest('You cannot change your own role or disable yourself');
    if (before.role === 'OWNER' && (body.role && body.role !== 'OWNER' || body.status === 'DISABLED')) {
      const owners = await this.prisma.user.count({ where: { role: 'OWNER', status: 'ACTIVE', deletedAt: null } });
      if (owners <= 1) throw badRequest('There must always be at least one active owner');
    }
    const user = await this.prisma.user.update({ where: { id }, data: body });
    if (body.status === 'DISABLED') await this.prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit.record({ actor: me, action: 'user.update', entityType: 'User', entityId: id, summary: `Updated ${user.email}`, before: { role: before.role, status: before.status }, after: body, req });
    return toDTO(user);
  }
}
