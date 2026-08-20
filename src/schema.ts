import { readFile } from 'node:fs/promises';

import YAML from 'yaml';

import { ADDRESSES_PATH, SITES_PATH } from './paths.js';
import {
	ensureUnique,
	normalizeAddressEntry,
	normalizeSiteEntry,
	sortAddresses,
	sortSites,
} from './normalize.js';
import type { GatekeeperSource, SourceAddressEntry, SourceSiteEntry } from './types.js';

async function readYamlArray(path: string, label: string): Promise<unknown[]> {
	const text = await readFile(path, 'utf8');
	const parsed = YAML.parse(text) as unknown;
	if (parsed === null) return [];
	if (!Array.isArray(parsed)) throw new Error(`${label} must be a YAML array.`);
	return parsed;
}

export function validateSourceEntries(input: {
	sites: unknown[];
	addresses: unknown[];
}): GatekeeperSource {
	const sites: SourceSiteEntry[] = sortSites(input.sites.map(normalizeSiteEntry));
	const addresses: SourceAddressEntry[] = sortAddresses(input.addresses.map(normalizeAddressEntry));
	ensureUnique(sites, (entry) => `${entry.match}:${entry.value}`, 'site entry');
	ensureUnique(addresses, (entry) => entry.value, 'address entry');
	return { sites, addresses };
}

export async function readSourceLists(): Promise<GatekeeperSource> {
	return validateSourceEntries({
		sites: await readYamlArray(SITES_PATH, 'lists/sites.yaml'),
		addresses: await readYamlArray(ADDRESSES_PATH, 'lists/addresses.yaml'),
	});
}
