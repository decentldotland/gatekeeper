import { describe, expect, it } from 'vitest';

import { normalizeAddressEntry, normalizeDomain, normalizeSiteEntry, normalizeUrl } from '../src/normalize.js';

describe('normalization', () => {
	it('normalizes domains and strips wildcard prefixes', () => {
		expect(normalizeDomain('*.Fake-Fold.Example')).toBe('fake-fold.example');
	});

	it('normalizes URL site entries', () => {
		expect(
			normalizeSiteEntry(
				{
					value: 'https://Fake-Fold.Example/login#token',
					match: 'url',
					status: 'block',
					reason: 'phishing',
				},
				0,
			),
		).toMatchObject({ value: 'https://fake-fold.example/login', match: 'url' });
	});

	it('rejects non-HTTP URLs', () => {
		expect(() => normalizeUrl('javascript:alert(1)')).toThrow('must use HTTP(S)');
	});

	it('validates address entries', () => {
		expect(
			normalizeAddressEntry(
				{
					value: 'A'.repeat(43),
					status: 'warn',
					reason: 'cex-hotwallet',
				},
				0,
			),
		).toMatchObject({ value: 'A'.repeat(43), status: 'warn' });
		expect(() =>
			normalizeAddressEntry({ value: 'not-an-id', status: 'warn', reason: 'scam-address' }, 0),
		).toThrow('43-character Arweave id');
	});
});
