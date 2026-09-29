import type { NavMenuKey } from '../../src/index.js';
import { prisma, en, log } from '../lib.js';

type Item = { label: string; url: string; children?: Item[] };

const MENUS: Record<NavMenuKey, Item[]> = {
  HEADER: [
    { label: 'Rooms', url: '/rooms' },
    { label: 'Kapchorwa', url: '/kapchorwa', children: [
      { label: 'Sipi Falls', url: '/kapchorwa/sipi-falls' },
      { label: 'Mount Elgon', url: '/kapchorwa/mount-elgon' },
      { label: 'Coffee', url: '/kapchorwa/kapchorwa-coffee' },
      { label: 'The road', url: '/kapchorwa/the-road' },
      { label: 'When to come', url: '/kapchorwa/when-to-come' },
    ] },
    { label: 'Facilities', url: '/facilities' },
    { label: 'The house rising', url: '/rising' },
    { label: 'About', url: '/about' },
    { label: 'Contact', url: '/contact' },
  ],
  MOBILE: [
    { label: 'Rooms', url: '/rooms' },
    { label: 'Kapchorwa', url: '/kapchorwa' },
    { label: 'Facilities', url: '/facilities' },
    { label: 'The house rising', url: '/rising' },
    { label: 'About', url: '/about' },
    { label: 'Getting here', url: '/kapchorwa/getting-here' },
    { label: 'Contact', url: '/contact' },
  ],
  FOOTER_PRIMARY: [
    { label: 'Stay', url: '/rooms', children: [
      { label: 'Rooms', url: '/rooms' },
      { label: 'Claim a first stay', url: '/first-stay' },
      { label: 'Facilities', url: '/facilities' },
    ] },
    { label: 'Kapchorwa', url: '/kapchorwa', children: [
      { label: 'Sipi Falls', url: '/kapchorwa/sipi-falls' },
      { label: 'Mount Elgon', url: '/kapchorwa/mount-elgon' },
      { label: 'Getting here', url: '/kapchorwa/getting-here' },
      { label: 'When to come', url: '/kapchorwa/when-to-come' },
    ] },
    { label: 'The house', url: '/about', children: [
      { label: 'About', url: '/about' },
      { label: 'Watch it rise', url: '/rising' },
      { label: 'Contact', url: '/contact' },
    ] },
  ],
  FOOTER_LEGAL: [
    { label: 'Privacy', url: '/legal/privacy' },
    { label: 'Booking terms', url: '/legal/booking-terms' },
    { label: 'Cancellation', url: '/legal/cancellation' },
  ],
};

export async function seedNavigation() {
  if (await prisma.navigationItem.count()) return log('navigation', 'exists, skipped');
  for (const [menu, items] of Object.entries(MENUS) as [NavMenuKey, Item[]][]) {
    for (const [order, item] of items.entries()) {
      const parent = await prisma.navigationItem.create({ data: { menu, label: en(item.label), target: 'URL', url: item.url, order } });
      for (const [i, child] of (item.children ?? []).entries()) {
        await prisma.navigationItem.create({ data: { menu, parentId: parent.id, label: en(child.label), target: 'URL', url: child.url, order: i } });
      }
    }
  }
  log('navigation', `${Object.keys(MENUS).length} menus`);
}
