import { appendFile, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import YAML from 'yaml';

import { SITES_PATH } from './paths.js';
import { readSourceLists } from './schema.js';
import { normalizeDomain, normalizeUrl } from './normalize.js';
import type { SourceSiteEntry } from './types.js';

type UpstreamSourceId = 'phantom' | 'metamask' | 'seal-domains' | 'seal-urls';

interface UpstreamSource {
	id: UpstreamSourceId;
	name: string;
	fetchUrl: string;
	referenceUrl: string;
	descriptionSource: string;
	parse: (text: string) => string[];
}

interface CliOptions {
	dryRun: boolean;
	all: boolean;
	sources: Set<UpstreamSourceId>;
	keywords: string[];
	limit?: number;
}

interface SiteCandidate {
	raw: string;
	entry: SourceSiteEntry;
	source: UpstreamSource;
}

const SHARED_HOST_ROOTS = [
	'github.io',
	'vercel.app',
	'pages.dev',
	'web.app',
	'netlify.app',
	'ngrok.app',
	'arweave.net',
];

const DEFAULT_RELEVANCE_KEYWORDS = [
	'arweave',
	'ledger',
	'ledgar',
	'ledqar',
	'recover',
	'restore',
	'revoke',
	'synchroniz',
	'validate',
	'wallet-connect',
	'walletbridge',
	'walletconnect',
];

export const UPSTREAM_SOURCES: UpstreamSource[] = [
	{
		id: 'phantom',
		name: 'Phantom blocklist',
		fetchUrl: 'https://raw.githubusercontent.com/phantom/blocklist/master/blocklist.yaml',
		referenceUrl: 'https://github.com/phantom/blocklist/blob/master/blocklist.yaml',
		descriptionSource: 'Phantom',
		parse: parsePhantomBlocklist,
	},
	{
		id: 'metamask',
		name: 'MetaMask eth-phishing-detect',
		fetchUrl: 'https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/main/src/config.json',
		referenceUrl: 'https://github.com/MetaMask/eth-phishing-detect/blob/main/src/config.json',
		descriptionSource: 'MetaMask',
		parse: parseMetaMaskConfig,
	},
	{
		id: 'seal-domains',
		name: 'SEAL domain blocklist',
		fetchUrl: 'https://raw.githubusercontent.com/security-alliance/blocklists/main/domain.txt',
		referenceUrl: 'https://github.com/security-alliance/blocklists/blob/main/domain.txt',
		descriptionSource: 'SEAL',
		parse: parseLineList,
	},
	{
		id: 'seal-urls',
		name: 'SEAL URL blocklist',
		fetchUrl: 'https://raw.githubusercontent.com/security-alliance/blocklists/main/url.txt',
		referenceUrl: 'https://github.com/security-alliance/blocklists/blob/main/url.txt',
		descriptionSource: 'SEAL',
		parse: parseLineList,
	},
];

function asStringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function parsePhantomBlocklist(text: string): string[] {
	const parsed = YAML.parse(text) as unknown;
	if (!Array.isArray(parsed)) throw new Error('Phantom blocklist must be a YAML array.');
	return parsed
		.map((entry) => (entry && typeof entry === 'object' ? (entry as { url?: unknown }).url : undefined))
		.filter((url): url is string => typeof url === 'string');
}

export function parseMetaMaskConfig(text: string): string[] {
	const parsed = JSON.parse(text) as unknown;
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('MetaMask config must be a JSON object.');
	}
	return asStringArray((parsed as { blacklist?: unknown }).blacklist);
}

export function parseLineList(text: string): string[] {
	return text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith('#'));
}

function candidateKey(entry: Pick<SourceSiteEntry, 'match' | 'value'>): string {
	return `${entry.match}:${entry.value}`;
}

function hostnameFor(entry: SourceSiteEntry): string {
	return entry.match === 'domain' ? entry.value : new URL(entry.value).hostname;
}

function isSharedHostRoot(hostname: string): boolean {
	return SHARED_HOST_ROOTS.includes(hostname);
}

function isArweaveHosted(hostname: string): boolean {
	return hostname === 'arweave.net' || hostname.endsWith('.arweave.net');
}

function isSharedHostSubdomain(hostname: string): boolean {
	return SHARED_HOST_ROOTS.some((root) => hostname.endsWith(`.${root}`));
}

function hasPathLikeSyntax(value: string): boolean {
	return value.includes('/') || value.includes('?') || value.includes('#');
}

function isIpv4Address(value: string): boolean {
	return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value);
}

export function siteEntryFromUpstreamValue(value: string): SourceSiteEntry | null {
	const raw = value.trim();
	if (!raw) return null;
	try {
		if (/^https?:\/\//i.test(raw)) {
			return { value: normalizeUrl(raw), match: 'url', status: 'block', reason: 'phishing' };
		}
		if (hasPathLikeSyntax(raw)) {
			return { value: normalizeUrl(`https://${raw}`), match: 'url', status: 'block', reason: 'phishing' };
		}
		if (isIpv4Address(raw)) return null;
		const domain = normalizeDomain(raw);
		if (isSharedHostRoot(domain)) return null;
		return { value: domain, match: 'domain', status: 'block', reason: 'phishing' };
	} catch {
		return null;
	}
}

function isRelevantCandidate(candidate: SiteCandidate, options: CliOptions): boolean {
	if (options.all) return true;
	const haystack = `${candidate.raw} ${candidate.entry.value}`.toLowerCase();
	const keywords = [...DEFAULT_RELEVANCE_KEYWORDS, ...options.keywords.map((keyword) => keyword.toLowerCase())];
	return isArweaveHosted(hostnameFor(candidate.entry)) || keywords.some((keyword) => haystack.includes(keyword));
}

function descriptionFor(candidate: SiteCandidate): string {
	const host = hostnameFor(candidate.entry);
	if (isArweaveHosted(host)) return `Upstream-listed Arweave-hosted phishing site from ${candidate.source.descriptionSource}.`;
	if (isSharedHostSubdomain(host)) {
		return `Upstream-listed exact shared-host phishing site from ${candidate.source.descriptionSource}.`;
	}
	if (/ledger|ledgar|ladger|ledqar|trezor/.test(candidate.entry.value)) {
		return `Upstream-listed hardware-wallet phishing site from ${candidate.source.descriptionSource}.`;
	}
	if (/wallet|connect|dapp|bridge|revoke|approve|rectifier|recover|restore|seed/.test(candidate.entry.value)) {
		return `Upstream-listed wallet phishing site from ${candidate.source.descriptionSource}.`;
	}
	return `Upstream-listed phishing site from ${candidate.source.descriptionSource}.`;
}

function finalizeCandidate(candidate: SiteCandidate): SourceSiteEntry {
	return {
		...candidate.entry,
		description: descriptionFor(candidate),
		references: [candidate.source.referenceUrl],
	};
}

async function fetchText(url: string): Promise<string> {
	const response = await fetch(url, { headers: { accept: 'application/json,text/yaml,text/plain,*/*' } });
	if (!response.ok) throw new Error(`Failed to fetch ${url} (${response.status}).`);
	return response.text();
}

function parseOptions(argv: string[]): CliOptions {
	const options: CliOptions = {
		dryRun: false,
		all: false,
		sources: new Set(UPSTREAM_SOURCES.map((source) => source.id)),
		keywords: [],
	};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--dry-run') {
			options.dryRun = true;
			continue;
		}
		if (arg === '--all') {
			options.all = true;
			continue;
		}
		if (arg === '--keyword') {
			const keyword = argv[++index]?.trim();
			if (!keyword) throw new Error('--keyword requires a value.');
			options.keywords.push(keyword);
			continue;
		}
		if (arg.startsWith('--keyword=')) {
			const keyword = arg.slice('--keyword='.length).trim();
			if (!keyword) throw new Error('--keyword requires a value.');
			options.keywords.push(keyword);
			continue;
		}
		if (arg === '--source') {
			const value = argv[++index];
			if (!value) throw new Error('--source requires a value.');
			options.sources = parseSources(value);
			continue;
		}
		if (arg.startsWith('--source=')) {
			options.sources = parseSources(arg.slice('--source='.length));
			continue;
		}
		if (arg === '--limit') {
			options.limit = parseLimit(argv[++index]);
			continue;
		}
		if (arg.startsWith('--limit=')) {
			options.limit = parseLimit(arg.slice('--limit='.length));
			continue;
		}
		throw new Error(`Unknown option: ${arg}`);
	}
	return options;
}

function parseLimit(value: string | undefined): number {
	if (!value) throw new Error('--limit requires a value.');
	const limit = Number(value);
	if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('--limit must be a positive integer.');
	return limit;
}

function parseSources(value: string): Set<UpstreamSourceId> {
	const ids = new Set<UpstreamSourceId>();
	for (const raw of value.split(',')) {
		const id = raw.trim() as UpstreamSourceId;
		if (!UPSTREAM_SOURCES.some((source) => source.id === id)) {
			throw new Error(`Unknown source "${raw}". Expected: ${UPSTREAM_SOURCES.map((source) => source.id).join(', ')}.`);
		}
		ids.add(id);
	}
	if (ids.size === 0) throw new Error('--source requires at least one source.');
	return ids;
}

function appendYaml(entries: SourceSiteEntry[]): string {
	return [
		'',
		'# Added from upstream phishing feeds by npm run update:sites.',
		YAML.stringify(entries, { lineWidth: 0 }).trimEnd(),
		'',
	].join('\n');
}

export async function collectMissingSites(options: CliOptions): Promise<SourceSiteEntry[]> {
	const sourceLists = await readSourceLists();
	const existing = new Set(sourceLists.sites.map(candidateKey));
	const additions = new Map<string, SourceSiteEntry>();
	for (const source of UPSTREAM_SOURCES.filter((candidate) => options.sources.has(candidate.id))) {
		const text = await fetchText(source.fetchUrl);
		for (const raw of source.parse(text)) {
			const entry = siteEntryFromUpstreamValue(raw);
			if (!entry) continue;
			const candidate: SiteCandidate = { raw, entry, source };
			if (!isRelevantCandidate(candidate, options)) continue;
			const key = candidateKey(entry);
			if (existing.has(key) || additions.has(key)) continue;
			additions.set(key, finalizeCandidate(candidate));
		}
	}
	return [...additions.values()].sort(
		(left, right) =>
			left.references?.[0]?.localeCompare(right.references?.[0] ?? '') ||
			left.match.localeCompare(right.match) ||
			left.value.localeCompare(right.value),
	);
}

async function main(): Promise<void> {
	const options = parseOptions(process.argv.slice(2));
	const additions = await collectMissingSites(options);
	if (additions.length === 0) {
		console.log('No missing site entries found.');
		return;
	}
	if (options.dryRun) {
		console.log(`Would append ${additions.length} site entr${additions.length === 1 ? 'y' : 'ies'} to lists/sites.yaml.`);
		const shown = options.limit ? additions.slice(0, options.limit) : additions;
		for (const entry of shown) console.log(`${entry.match}:${entry.value}`);
		if (shown.length < additions.length) console.log(`...and ${additions.length - shown.length} more.`);
		return;
	}
	const current = await readFile(SITES_PATH, 'utf8');
	const separator = current.endsWith('\n') ? '' : '\n';
	await appendFile(SITES_PATH, `${separator}${appendYaml(additions)}`);
	await readSourceLists();
	console.log(`Appended ${additions.length} site entr${additions.length === 1 ? 'y' : 'ies'} to lists/sites.yaml.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
