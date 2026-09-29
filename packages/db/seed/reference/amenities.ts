import type { AmenityCategory } from '../../src/index.js';
import { prisma, en, log } from '../lib.js';

export const AMENITIES: { key: string; name: string; icon: string; category: AmenityCategory }[] = [
  { key: 'mountain-view', name: 'Mountain view', icon: 'mountain', category: 'VIEW' },
  { key: 'escarpment-view', name: 'Escarpment view', icon: 'mountain-snow', category: 'VIEW' },
  { key: 'garden-view', name: 'Garden view', icon: 'trees', category: 'VIEW' },
  { key: 'balcony', name: 'Private balcony', icon: 'door-open', category: 'VIEW' },
  { key: 'hot-shower', name: 'Hot shower, all day', icon: 'shower-head', category: 'BATH' },
  { key: 'bathtub', name: 'Bathtub', icon: 'bath', category: 'BATH' },
  { key: 'towels', name: 'Towels and robes', icon: 'shirt', category: 'BATH' },
  { key: 'toiletries', name: 'Local toiletries', icon: 'droplets', category: 'BATH' },
  { key: 'warm-bedding', name: 'Extra blanket (nights are cold at 1,900 m)', icon: 'bed', category: 'COMFORT' },
  { key: 'kettle-coffee', name: 'Kettle and Kapchorwa coffee', icon: 'coffee', category: 'COMFORT' },
  { key: 'wardrobe', name: 'Wardrobe', icon: 'archive', category: 'COMFORT' },
  { key: 'desk', name: 'Writing desk', icon: 'lamp-desk', category: 'COMFORT' },
  { key: 'mosquito-net', name: 'Mosquito net', icon: 'shield', category: 'COMFORT' },
  { key: 'safe', name: 'In-room safe', icon: 'lock', category: 'COMFORT' },
  { key: 'sofa', name: 'Sitting area', icon: 'sofa', category: 'COMFORT' },
  { key: 'extra-bed', name: 'Extra bed on request', icon: 'bed-single', category: 'COMFORT' },
  { key: 'wifi', name: 'Wi-Fi', icon: 'wifi', category: 'TECH' },
  { key: 'backup-power', name: 'Backup power', icon: 'zap', category: 'TECH' },
  { key: 'usb-sockets', name: 'Sockets by the bed', icon: 'plug', category: 'TECH' },
  { key: 'tv', name: 'Television', icon: 'tv', category: 'TECH' },
  { key: 'ground-floor', name: 'Ground floor, step-free', icon: 'accessibility', category: 'ACCESS' },
  { key: 'parking', name: 'Parking on the compound', icon: 'car', category: 'ACCESS' },
];

export async function seedAmenities() {
  for (const [order, a] of AMENITIES.entries()) {
    await prisma.amenity.upsert({
      where: { key: a.key },
      create: { key: a.key, name: en(a.name), icon: a.icon, category: a.category, order },
      update: {},
    });
  }
  log('amenities', `${AMENITIES.length}`);
}
