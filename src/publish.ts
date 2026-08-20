import { readFile, writeFile } from 'node:fs/promises';

import Arweave from 'arweave';
import type { JWKInterface } from 'arweave/web/lib/wallet.js';

import { buildArtifact } from './build.js';
import { contentDigest, currentCommit } from './artifact.js';
import { ARTIFACT_PATH, LATEST_PUBLISH_PATH } from './paths.js';
import type { PublishReceipt } from './types.js';

interface PublishArgs {
	walletPath: string;
	gatewayHost: string;
	gatewayPort: number;
	gatewayProtocol: 'http' | 'https';
}

function parseArgs(argv: string[]): PublishArgs {
	let walletPath = '';
	let gatewayHost = 'arweave.net';
	let gatewayPort = 443;
	let gatewayProtocol: 'http' | 'https' = 'https';
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		const next = argv[index + 1];
		if (arg === '--wallet' && next) {
			walletPath = next;
			index += 1;
		} else if (arg === '--gateway-host' && next) {
			gatewayHost = next;
			index += 1;
		} else if (arg === '--gateway-port' && next) {
			gatewayPort = Number(next);
			index += 1;
		} else if (arg === '--gateway-protocol' && (next === 'http' || next === 'https')) {
			gatewayProtocol = next;
			index += 1;
		} else {
			throw new Error(`Unknown or incomplete argument: ${arg}`);
		}
	}
	if (!walletPath) throw new Error('Missing required --wallet <path> argument.');
	if (!Number.isInteger(gatewayPort) || gatewayPort < 1 || gatewayPort > 65535) {
		throw new Error('--gateway-port must be an integer between 1 and 65535.');
	}
	return { walletPath, gatewayHost, gatewayPort, gatewayProtocol };
}

export async function publishArtifact(args: PublishArgs): Promise<PublishReceipt> {
	const { sha256 } = await buildArtifact();
	const artifactJson = await readFile(ARTIFACT_PATH, 'utf8');
	const wallet = JSON.parse(await readFile(args.walletPath, 'utf8')) as JWKInterface;
	const arweave = Arweave.init({ host: args.gatewayHost, port: args.gatewayPort, protocol: args.gatewayProtocol });
	const transaction = await arweave.createTransaction({ data: artifactJson }, wallet);
	const commit = await currentCommit();
	const digest = contentDigest(artifactJson);
	transaction.addTag('Content-Type', 'application/json');
	transaction.addTag('App-Name', 'gatekeeper');
	transaction.addTag('Protocol', 'gatekeeper');
	transaction.addTag('Protocol-Version', '1');
	transaction.addTag('Gatekeeper-Schema', 'gatekeeper-list/v1');
	transaction.addTag('Gatekeeper-Commit', commit);
	transaction.addTag('Content-Digest', digest);
	await arweave.transactions.sign(transaction, wallet);
	const response = await arweave.transactions.post(transaction);
	if (![200, 202, 208].includes(response.status)) {
		throw new Error(`Arweave post failed (${response.status} ${response.statusText}).`);
	}
	const receipt: PublishReceipt = {
		id: transaction.id,
		sha256,
		contentDigest: digest,
		bytes: Buffer.byteLength(artifactJson),
		commit,
		publishedAt: new Date().toISOString(),
	};
	await writeFile(LATEST_PUBLISH_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
	return receipt;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const receipt = await publishArtifact(parseArgs(process.argv.slice(2)));
	console.log(`published ${receipt.id}`);
	console.log(`sha256 ${receipt.sha256}`);
}
