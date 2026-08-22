import { describe, expect, it } from 'vitest';

import { parseMetaMaskConfig, parsePhantomBlocklist, siteEntryFromUpstreamValue } from '../src/updateSites.js';

describe('site updater helpers', () => {
	it('extracts Phantom blocklist URL entries', () => {
		expect(
			parsePhantomBlocklist(`
- url: wallet-fix.example
- url: 123
- note: ignored
`),
		).toEqual(['wallet-fix.example']);
	});

	it('extracts only the MetaMask blacklist', () => {
		expect(
			parseMetaMaskConfig(
				JSON.stringify({
					blacklist: ['wallet-drainer.example'],
					whitelist: ['walletconnect.org'],
				}),
			),
		).toEqual(['wallet-drainer.example']);
	});

	it('normalizes domains and path-scoped URLs from upstream values', () => {
		expect(siteEntryFromUpstreamValue(' WalletConnectDapps.com ')).toMatchObject({
			value: 'walletconnectdapps.com',
			match: 'domain',
		});
		expect(siteEntryFromUpstreamValue('sites.google.com/view/start-ledger-wallet')).toMatchObject({
			value: 'https://sites.google.com/view/start-ledger-wallet',
			match: 'url',
		});
	});

	it('skips shared-hosting roots and invalid upstream values', () => {
		expect(siteEntryFromUpstreamValue('vercel.app')).toBeNull();
		expect(siteEntryFromUpstreamValue('åssetdäsh.com')).toBeNull();
	});
});
