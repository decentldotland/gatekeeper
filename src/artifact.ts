import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { SCHEMA, type GatekeeperArtifact, type GatekeeperSource } from './types.js';

const execFileAsync = promisify(execFile);

export const SOURCE_REPO = 'https://github.com/permaweb/gatekeeper';

export async function currentCommit(): Promise<string> {
	try {
		const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD']);
		return stdout.trim();
	} catch {
		return 'unknown';
	}
}

export function artifactForSource(source: GatekeeperSource, input: { commit: string; generatedAt: string }): GatekeeperArtifact {
	return {
		schema: SCHEMA,
		generatedAt: input.generatedAt,
		source: {
			repo: SOURCE_REPO,
			commit: input.commit,
		},
		sites: source.sites,
		addresses: source.addresses,
	};
}

export function stableJson(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}

export function sha256Hex(value: string | Uint8Array): string {
	return createHash('sha256').update(value).digest('hex');
}

export function contentDigest(value: string | Uint8Array): string {
	return `sha-256=:${createHash('sha256').update(value).digest('base64')}:`;
}
