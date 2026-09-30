import { createHmac } from 'node:crypto';
import { env } from '../config.js';

/** The unguessable part of a guest's stay link. Derived, never stored. */
export const stayToken = (code: string) => createHmac('sha256', env.JWT_SECRET).update(`booking:${code}`).digest('base64url').slice(0, 32);
export const stayLink = (code: string, hash = '') => `${env.WEB_URL}/stay?code=${code}&t=${stayToken(code)}${hash}`;
