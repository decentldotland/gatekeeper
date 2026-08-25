# Gatekeeper

Gatekeeper is a community-run publisher repository for PermawebOS Browser protection lists. Contributors maintain YAML source files for phishing sites and risky Arweave addresses. The tooling validates and normalizes those files into a deterministic JSON artifact that can be published to Arweave and consumed by [the browser](https://github.com/permaweb/PermawebOS-Browser).

> Gatekeeper Trusted Publisher is one example of a community-generated list. It is not affiliated with the official PermawebOS Browser build and should not be considered an official Gatekeeper list, because PermawebOS Browser does not enforce any list.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for list scope, evidence requirements, false-positive handling, and validation workflow.

## Flow

```text
lists/sites.yaml + lists/addresses.yaml
-> npm run validate
-> npm run build
-> npm run publish -- --wallet ./wallet.json
-> PermawebOS Browser fetches gatekeeper-list.v1.json from Arweave
```

PermawebOS Browser should consume the generated JSON artifact only.

## Commands

```sh
npm run validate
npm run update:sites -- --dry-run
npm run build
npm test
npm run publish -- --wallet ./wallet.json
```

`publish` writes `dist/latest-publish.json` with the transaction id, SHA-256 digest, timestamp, and source commit.

`update:sites` fetches upstream Phantom, MetaMask, and SEAL phishing feeds, normalizes wallet-security-relevant missing entries, and appends them to `lists/sites.yaml`. Use `--dry-run` first. Pass `--all` only for a full upstream import, because the upstream lists are intentionally broad.

## Latest Published Artifact

- Trusted publisher: `31URqz6C4jiNgyJo8fZRDDCuO8mSGPigWuO0zf4I5CU`
- Transaction ID: `wyZ54NQkJCVpMWiFtLTn-oz8bn4sJI6UvCdMqURtLjo`
- SHA-256: `b82c07fc3229fcb8d938670b3449fc122c6ecc580dd7c420719d7567c6c32bba`
- Content-Digest: `sha-256=:uCwH/DIp/LjZOGcLNEn8EixuzFgN18QgcZ11Z8bDK7o=:`
- Bytes: `585868`
- Source commit: `a6f79f4dd603372cfdd9860c06e2cb3d58523c5d`

## List Entries

`sites.yaml` supports exact URLs and domains. Domains match the exact host and subdomains.

```yaml
- value: fake-permawebos-browser.example
  match: domain
  status: block
  reason: phishing
  description: Impersonates a PermawebOS Browser wallet.
  references:
    - https://example.com/report
```

`addresses.yaml` supports 43-character Arweave address/process identifiers.

```yaml
- value: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
  status: warn
  reason: cex-hotwallet
  description: Direct transfers to this exchange wallet may lose funds.
```

## Published Tags

The Arweave transaction uses:

- `Content-Type: application/json`
- `App-Name: gatekeeper`
- `Protocol: gatekeeper`
- `Protocol-Version: <package version>`
- `Gatekeeper-Schema: gatekeeper-list/v1`
- `Gatekeeper-Commit: <git commit>`
- `Content-Digest: sha-256=:<base64>:`
