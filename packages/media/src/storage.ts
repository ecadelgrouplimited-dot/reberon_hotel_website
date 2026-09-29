import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

/** Walk up from cwd to the monorepo root (the folder holding pnpm-workspace.yaml). */
export function repoRoot(start = process.cwd()): string {
  let dir = resolve(start);
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = dirname(dir);
  }
  return process.cwd();
}

export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(prefix: string): Promise<void>;
  publicUrl(key: string): string;
}

/** Local-disk driver for development. Files under `{root}/public/*` are served by the api at MEDIA_PUBLIC_URL. */
export class LocalStorage implements StorageDriver {
  readonly root: string;
  constructor(
    dir = process.env.STORAGE_LOCAL_DIR ?? './storage',
    private readonly baseUrl = process.env.MEDIA_PUBLIC_URL ?? 'http://localhost:4000/media',
  ) {
    this.root = isAbsolute(dir) ? dir : resolve(repoRoot(), dir);
  }
  private path(key: string) {
    const p = resolve(this.root, key);
    if (!p.startsWith(this.root)) throw new Error('Invalid storage key');
    return p;
  }
  async put(key: string, body: Buffer) {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, body);
  }
  get(key: string) {
    return readFile(this.path(key));
  }
  async remove(prefix: string) {
    await rm(this.path(prefix), { recursive: true, force: true });
  }
  publicUrl(key: string) {
    return `${this.baseUrl}/${key.replace(/^public\//, '')}`;
  }
}

export function createStorage(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER ?? 'local';
  if (driver === 'local') return new LocalStorage();
  throw new Error(`Storage driver "${driver}" is not implemented yet`);
}

export const mediaKeys = {
  original: (id: string, ext: string) => `originals/${id}.${ext}`,
  variant: (id: string, width: number) => `public/i/${id}/${width}.webp`,
  file: (id: string, name: string) => `public/f/${id}/${name}`,
};
