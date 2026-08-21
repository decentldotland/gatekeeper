# Gatekeeper

Gatekeeper is a publisher repo for The Fold protection lists. Humans maintain YAML source files for phishing sites and risky Arweave addresses. The tooling validates and normalizes those files into a deterministic JSON artifact that can be published to Arweave and consumed by The Fold.

## Flow

```text
lists/sites.yaml + lists/addresses.yaml
-> npm run validate
-> npm run build
-> npm run publish -- --wallet ./wallet.json
-> The Fold fetches gatekeeper-list.v1.json from Arweave
```

The Fold should consume the generated JSON artifact only. It should not parse YAML at runtime.

## Commands

```sh
npm run validate
npm run build
npm test
npm run publish -- --wallet ./wallet.json
```

`publish` writes `dist/latest-publish.json` with the transaction id, SHA-256 digest, timestamp, and source commit.

## List Entries

`sites.yaml` supports exact URLs and domains. Domains match the exact host and subdomains.

```yaml
- value: fake-fold.example
  match: domain
  status: block
  reason: phishing
  description: Impersonates The Fold wallet.
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
