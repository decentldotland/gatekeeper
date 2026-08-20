import { mkdir, writeFile } from 'node:fs/promises';

import { artifactForSource, currentCommit, sha256Hex, stableJson } from './artifact.js';
import { ARTIFACT_PATH, DIGEST_PATH, DIST_DIR } from './paths.js';
import { readSourceLists } from './schema.js';

export async function buildArtifact(): Promise<{ artifactJson: string; sha256: string }> {
	const source = await readSourceLists();
	const artifact = artifactForSource(source, {
		commit: await currentCommit(),
		generatedAt: new Date().toISOString(),
	});
	const artifactJson = stableJson(artifact);
	const sha256 = sha256Hex(artifactJson);
	await mkdir(DIST_DIR, { recursive: true });
	await writeFile(ARTIFACT_PATH, artifactJson, 'utf8');
	await writeFile(DIGEST_PATH, `${sha256}\n`, 'utf8');
	return { artifactJson, sha256 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const { sha256 } = await buildArtifact();
	console.log(`built ${ARTIFACT_PATH}`);
	console.log(`sha256 ${sha256}`);
}
