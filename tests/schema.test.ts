import { describe, expect, it } from 'vitest';

import { validateSourceEntries } from '../src/schema.js';

describe('source schema', () => {
	it('sorts entries into deterministic order', () => {
		const source = validateSourceEntries({
			sites: [
				{ value: 'z.example', match: 'domain', status: 'warn', reason: 'phishing' },
				{ value: 'https://a.example/path', match: 'url', status: 'block', reason: 'malicious-dapp' },
			],
			addresses: [
				{ value: `${'B'.repeat(43)}`, status: 'warn', reason: 'cex-hotwallet' },
				{ value: `${'A'.repeat(43)}`, status: 'block', reason: 'scam-address' },
			],
		});

		expect(source.sites.map((entry) => entry.value)).toEqual(['z.example', 'https://a.example/path']);
		expect(source.addresses.map((entry) => entry.value)).toEqual(['A'.repeat(43), 'B'.repeat(43)]);
	});

	it('rejects duplicate site and address entries', () => {
		expect(() =>
			validateSourceEntries({
				sites: [
					{ value: 'fake.example', match: 'domain', status: 'warn', reason: 'phishing' },
					{ value: 'FAKE.EXAMPLE', match: 'domain', status: 'block', reason: 'phishing' },
				],
				addresses: [],
			}),
		).toThrow('Duplicate site entry');

		expect(() =>
			validateSourceEntries({
				sites: [],
				addresses: [
					{ value: 'A'.repeat(43), status: 'warn', reason: 'cex-hotwallet' },
					{ value: 'A'.repeat(43), status: 'block', reason: 'scam-address' },
				],
			}),
		).toThrow('Duplicate address entry');
	});
});
