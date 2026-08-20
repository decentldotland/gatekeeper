import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const LISTS_DIR = path.join(ROOT_DIR, 'lists');
export const DIST_DIR = path.join(ROOT_DIR, 'dist');
export const SITES_PATH = path.join(LISTS_DIR, 'sites.yaml');
export const ADDRESSES_PATH = path.join(LISTS_DIR, 'addresses.yaml');
export const ARTIFACT_PATH = path.join(DIST_DIR, 'gatekeeper-list.v1.json');
export const DIGEST_PATH = path.join(DIST_DIR, 'gatekeeper-list.v1.sha256');
export const LATEST_PUBLISH_PATH = path.join(DIST_DIR, 'latest-publish.json');
