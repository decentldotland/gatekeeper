import { readSourceLists } from './schema.js';

export async function validateLists(): Promise<void> {
	const source = await readSourceLists();
	console.log(`valid sites=${source.sites.length} addresses=${source.addresses.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await validateLists();
}
