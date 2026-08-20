export const SCHEMA = 'gatekeeper-list/v1' as const;

export const SITE_MATCHES = ['domain', 'url'] as const;
export type SiteMatch = (typeof SITE_MATCHES)[number];

export const STATUSES = ['warn', 'block'] as const;
export type GatekeeperStatus = (typeof STATUSES)[number];

export const REASONS = [
	'phishing',
	'malicious-dapp',
	'scam-address',
	'cex-hotwallet',
	'token-process',
	'fcon-authority',
	'known-drainer',
	'other',
] as const;
export type GatekeeperReason = (typeof REASONS)[number];

export interface SourceSiteEntry {
	value: string;
	match: SiteMatch;
	status: GatekeeperStatus;
	reason: GatekeeperReason;
	description?: string;
	references?: string[];
}

export interface SourceAddressEntry {
	value: string;
	status: GatekeeperStatus;
	reason: GatekeeperReason;
	description?: string;
	references?: string[];
}

export interface GatekeeperSource {
	sites: SourceSiteEntry[];
	addresses: SourceAddressEntry[];
}

export interface GatekeeperArtifact {
	schema: typeof SCHEMA;
	generatedAt: string;
	source: {
		repo: string;
		commit: string;
	};
	sites: SourceSiteEntry[];
	addresses: SourceAddressEntry[];
}

export interface PublishReceipt {
	id: string;
	sha256: string;
	contentDigest: string;
	bytes: number;
	commit: string;
	publishedAt: string;
}
