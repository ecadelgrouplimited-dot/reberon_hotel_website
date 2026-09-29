import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, slugify, toMinor, formatMoney, addDays, nightsBetween, referenceCode } from './index.js';

test('normalizePhone handles Ugandan formats', () => {
  assert.equal(normalizePhone('0772 123 456'), '+256772123456');
  assert.equal(normalizePhone('772123456'), '+256772123456');
  assert.equal(normalizePhone('+256 772 123456'), '+256772123456');
  assert.equal(normalizePhone('00447700900123'), '+447700900123');
  assert.equal(normalizePhone('12'), null);
});

test('money uses minor units per currency', () => {
  assert.equal(toMinor(70, 'USD'), 7000n);
  assert.equal(toMinor(250000, 'UGX'), 250000n);
  assert.match(formatMoney(7000n, 'USD'), /\$70/);
});

test('dates', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(nightsBetween('2026-12-20', '2026-12-23'), 3);
});

test('slug and code', () => {
  assert.equal(slugify('Sipi Falls & Coffee!'), 'sipi-falls-and-coffee');
  assert.match(referenceCode('EQ'), /^EQ-[2-9A-Z]{4}$/);
});
