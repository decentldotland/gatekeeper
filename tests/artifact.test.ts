import { describe, expect, it } from 'vitest';

import { artifactForSource, contentDigest, sha256Hex, stableJson } from '../src/artifact.js';
import { SCHEMA } from '../src/types.js';

describe('artifact', () => {
	it('builds deterministic JSON with source metadata', () => {
		const artifact = artifactForSource(
			{
				sites: [{ value: 'fake.example', match: 'domain', status: 'block', reason: 'phishing' }],
				addresses: [{ value: 'A'.repeat(43), status: 'warn', reason: 'cex-hotwallet' }],
			},
			{ commit: 'abc123', generatedAt: '2026-08-20T00:00:00.000Z' },
		);
		const json = stableJson(artifact);

		expect(artifact.schema).toBe(SCHEMA);
		expect(json).toContain('"schema": "gatekeeper-list/v1"');
		expect(sha256Hex(json)).toMatch(/^[a-f0-9]{64}$/);
		expect(contentDigest(json)).toMatch(/^sha-256=:[A-Za-z0-9+/=]+:$/);
	});
});
