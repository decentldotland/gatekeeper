# Gatekeeper

Gatekeeper is a publisher repo for PermawebOS Browser protection lists. contributors maintain YAML source files for phishing sites and risky Arweave addresses. The tooling validates and normalizes those files into a deterministic JSON artifact that can be published to Arweave and consumed by [the browser](https://github.com/permaweb/PermawebOS-Browser).

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
npm run build
npm test
npm run publish -- --wallet ./wallet.json
```

`publish` writes `dist/latest-publish.json` with the transaction id, SHA-256 digest, timestamp, and source commit.

## Latest Published Artifact

- Trusted publisher: `31URqz6C4jiNgyJo8fZRDDCuO8mSGPigWuO0zf4I5CU`
- Transaction ID: `INZO0N2vOuk6JAb3zqV-TZG5kDFlWyCS_xQYapJ9tsY`
- SHA-256: `586cb85461ec9605b65f57d1c8fcb059e99d5e1aca9baba6902ee30499c24be4`
- Content-Digest: `sha-256=:WGy4VGHslgW2X1fRyPywWemdXhrKm6umkC7jBJnCS+Q=:`
- Bytes: `16287`
- Source commit: `3f167193c0a2ff7634e4f7aff889dd16284d2dcc`

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
