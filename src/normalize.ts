import { REASONS, SITE_MATCHES, STATUSES, type SourceAddressEntry, type SourceSiteEntry } from './types.js';

const ARWEAVE_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function asRecord(value: unknown, label: string): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
	return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string, label: string): string {
	const value = record[key];
	if (typeof value !== 'string' || !value.trim()) throw new Error(`${label}.${key} must be a non-empty string.`);
	return value.trim();
}

function optionalString(record: Record<string, unknown>, key: string, label: string): string | undefined {
	const value = record[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(`${label}.${key} must be a string.`);
	const trimmed = value.trim();
	return trimmed || undefined;
}

function optionalReferences(record: Record<string, unknown>, label: string): string[] | undefined {
	const value = record.references;
	if (value === undefined || value === null) return undefined;
	if (!Array.isArray(value)) throw new Error(`${label}.references must be an array.`);
	const references = value.map((item, index) => {
		if (typeof item !== 'string' || !item.trim()) {
			throw new Error(`${label}.references[${index}] must be a non-empty string.`);
		}
		try {
			const url = new URL(item.trim());
			if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('unsupported protocol');
			return url.href;
		} catch {
			throw new Error(`${label}.references[${index}] must be a valid HTTP(S) URL.`);
		}
	});
	return references.length > 0 ? references : undefined;
}

function normalizeStatus(value: string, label: string) {
	if (!STATUSES.includes(value as never)) throw new Error(`${label}.status must be one of: ${STATUSES.join(', ')}.`);
	return value as SourceSiteEntry['status'];
}

function normalizeReason(value: string, label: string) {
	if (!REASONS.includes(value as never)) throw new Error(`${label}.reason must be one of: ${REASONS.join(', ')}.`);
	return value as SourceSiteEntry['reason'];
}

export function normalizeDomain(value: string, label = 'site.value'): string {
	const normalized = value.trim().toLowerCase().replace(/^\*\./, '');
	if (!DOMAIN_PATTERN.test(normalized)) throw new Error(`${label} must be a valid domain.`);
	return normalized;
}

export function normalizeUrl(value: string, label = 'site.value'): string {
	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		throw new Error(`${label} must be a valid URL.`);
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(`${label} must use HTTP(S).`);
	if (url.username || url.password) throw new Error(`${label} must not include credentials.`);
	url.hostname = url.hostname.toLowerCase();
	url.hash = '';
	return url.href;
}

export function normalizeArweaveId(value: string, label = 'address.value'): string {
	const normalized = value.trim();
	if (!ARWEAVE_ID_PATTERN.test(normalized)) throw new Error(`${label} must be a 43-character Arweave id.`);
	return normalized;
}

export function normalizeSiteEntry(value: unknown, index: number): SourceSiteEntry {
	const label = `sites[${index}]`;
	const record = asRecord(value, label);
	const match = requiredString(record, 'match', label);
	if (!SITE_MATCHES.includes(match as never)) throw new Error(`${label}.match must be one of: ${SITE_MATCHES.join(', ')}.`);
	const entry: SourceSiteEntry = {
		value:
			match === 'domain'
				? normalizeDomain(requiredString(record, 'value', label), `${label}.value`)
				: normalizeUrl(requiredString(record, 'value', label), `${label}.value`),
		match: match as SourceSiteEntry['match'],
		status: normalizeStatus(requiredString(record, 'status', label), label),
		reason: normalizeReason(requiredString(record, 'reason', label), label),
	};
	const description = optionalString(record, 'description', label);
	const references = optionalReferences(record, label);
	return {
		...entry,
		...(description ? { description } : {}),
		...(references ? { references } : {}),
	};
}

export function normalizeAddressEntry(value: unknown, index: number): SourceAddressEntry {
	const label = `addresses[${index}]`;
	const record = asRecord(value, label);
	const entry: SourceAddressEntry = {
		value: normalizeArweaveId(requiredString(record, 'value', label), `${label}.value`),
		status: normalizeStatus(requiredString(record, 'status', label), label),
		reason: normalizeReason(requiredString(record, 'reason', label), label),
	};
	const description = optionalString(record, 'description', label);
	const references = optionalReferences(record, label);
	return {
		...entry,
		...(description ? { description } : {}),
		...(references ? { references } : {}),
	};
}

export function sortSites(entries: SourceSiteEntry[]): SourceSiteEntry[] {
	return [...entries].sort(
		(left, right) =>
			left.match.localeCompare(right.match) || left.value.localeCompare(right.value) || left.status.localeCompare(right.status),
	);
}

export function sortAddresses(entries: SourceAddressEntry[]): SourceAddressEntry[] {
	return [...entries].sort(
		(left, right) => left.value.localeCompare(right.value) || left.status.localeCompare(right.status),
	);
}

export function ensureUnique<T>(entries: T[], key: (entry: T) => string, label: string): void {
	const seen = new Set<string>();
	for (const entry of entries) {
		const id = key(entry);
		if (seen.has(id)) throw new Error(`Duplicate ${label}: ${id}`);
		seen.add(id);
	}
}
