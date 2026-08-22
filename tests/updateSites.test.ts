import { describe, expect, it } from 'vitest';

import { parseLineList, parseMetaMaskConfig, parsePhantomBlocklist, siteEntryFromUpstreamValue } from '../src/updateSites.js';

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

	it('extracts non-empty SEAL line-list entries', () => {
		expect(
			parseLineList(`
# comment
ledger-wallet.example

https://sites.google.com/view/start-ledger-wallet
`),
		).toEqual(['ledger-wallet.example', 'https://sites.google.com/view/start-ledger-wallet']);
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
		expect(siteEntryFromUpstreamValue('192.0.2.10')).toBeNull();
		expect(siteEntryFromUpstreamValue('åssetdäsh.com')).toBeNull();
	});
});
