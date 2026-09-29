import type { MediaRef, ResolvedBlock, SiteDTO } from '@reberon/contracts';
import type { CtaContext } from '@/lib/cta';

export interface BlockProps<D = Record<string, unknown>, R = Record<string, unknown>> {
  block: ResolvedBlock & { data: D; resolved?: R };
  media: Record<string, MediaRef>;
  site: SiteDTO;
  ctx: CtaContext;
  index: number;
}
