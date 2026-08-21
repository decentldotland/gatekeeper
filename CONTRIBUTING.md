# Gatekeeper Contributor Guide

Gatekeeper maintains The Fold protection lists for phishing sites and risky/sink Arweave destinations. The source of truth is the YAML in `lists/`; the published artifact is deterministic JSON that wallets can fetch from Arweave.

This guide is inspired by the public-review model used by phishing-list projects such as MetaMask's `eth-phishing-detect`: keep entries precise, include evidence, avoid broad blocks, and treat false positives as urgent.

## Scope

Gatekeeper accepts entries that protect users from clear wallet-security risk:

- Phishing sites, wallet-drainer sites, fake support or recovery pages, and malicious dapps.
- Arweave addresses or AO process ids where direct transfers are likely to lose funds or expose the user to known abuse.
- Exchange hot wallets where direct wallet transfers should warn the user because deposit-credit handling is external to The Fold.

Gatekeeper is not a general moderation list, reputation database, sanctions list, or personal-dispute registry. Do not add people, projects, or services just because they are controversial, low-quality, or risky in a broad investment sense.

## Repository Structure

- `lists/sites.yaml` contains site protections.
- `lists/addresses.yaml` contains Arweave address and process protections.
- `src/` contains validation, normalization, artifact generation, and publishing code.
- `dist/gatekeeper-list.v1.json` is the generated artifact consumed by The Fold.
- `dist/latest-publish.json` records the last Arweave publish receipt.

Only edit `lists/*.yaml` for normal list changes. Regenerate `dist/` with the project commands.

## Entry Format

Site entries use this shape:

```yaml
- value: fake-fold.example
  match: domain
  status: block
  reason: phishing
  description: Impersonates The Fold wallet and prompts users to connect or recover keys.
  references:
    - https://example.com/report
```

Address entries use this shape:

```yaml
- value: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
  status: warn
  reason: cex-hotwallet
  description: Exchange hot wallet; warn before direct transfer because custody and deposit-credit handling are outside The Fold.
  references:
    - https://example.com/evidence
```

Supported values:

- `match`: `domain` or `url`.
- `status`: `warn` or `block`.
- `reason`: `phishing`, `malicious-dapp`, `scam-address`, `cex-hotwallet`, `token-process`, `fcon-authority`, `known-drainer`, or `other`.

## Site Policy

Prefer the narrowest entry that protects users:

- Use `match: domain` for attacker-controlled hostnames where the exact host and its subdomains should match.
- Use `match: url` when only one path is known malicious on an otherwise legitimate host.
- Do not block shared-hosting roots such as `github.io`, `vercel.app`, `pages.dev`, `web.app`, `netlify.app`, `ngrok.app`, or `arweave.net`.
- For shared hosting, block only the exact malicious subdomain or URL.
- Do not add fuzzy lookalike rules. Gatekeeper currently uses explicit entries only.

Blocking should be quick for active phishing, key-stealing, wallet-draining, impersonation, or fake recovery flows. Use `warn` when the site is suspicious but the evidence does not justify blocking wallet functionality.

## Address Policy

Address entries must be 43-character Arweave identifiers.

Use `warn` for destinations that may be legitimate but dangerous for direct transfer, such as exchange hot wallets, token process ids, and authority addresses. Use `block` only when the address is tied to known theft, phishing infrastructure, or another clearly malicious destination where letting the action proceed creates a direct user-loss risk.

Do not add personal addresses unless there is strong public evidence that the exact address is part of an active scam or fund-loss path. Do not include private intelligence that cannot be reviewed by maintainers.

## Evidence

Every non-obvious entry should include a concise `description` and at least one `references` URL. Good references include:

- Upstream blocklists or security reports.
- Public incident reports.
- Explorer pages showing the exact address, process, or relevant transaction path.
- Screenshots or archived reports linked from a stable public URL.

For copied entries from upstream lists, name the upstream source in the description. For exchange hot-wallet warnings, avoid putting exchange brand names into descriptions unless the source already requires it; the wallet UX should remain generic and avoid implying an endorsement or a guaranteed deposit path.

## False Positives and Removals

False positives can block legitimate user activity, so treat removal requests as high priority.

Open a PR that removes or narrows the entry and include:

- The affected domain, URL, or address.
- Why the current entry is wrong or too broad.
- Any evidence that the site or address is controlled by a legitimate owner.

If a shared-hosting entry catches legitimate unrelated content, narrow it to the malicious URL or remove it.

## Workflow

1. Create a branch for the change.
2. Edit only the relevant YAML list.
3. Keep each PR focused on one related batch of additions or removals.
4. Run validation and tests.
5. Include the evidence and reasoning in the PR body.

Required checks:

```sh
npm run validate
npm run build
npm test
npm run typecheck
```

Publishing is maintainer-only unless maintainers explicitly ask you to publish:

```sh
npm run publish -- --wallet ./wallet.json
```

`wallet.json` must stay local and ignored by git.

## Review Checklist

Before approving or publishing, maintainers should confirm:

- The entry is in scope for wallet user protection.
- The match is no broader than necessary.
- Shared-hosting roots are not blocked.
- The `status` is proportional to the risk.
- The `reason` matches the evidence.
- References are reviewable and stable enough for future audits.
- `npm run validate`, `npm run build`, `npm test`, and `npm run typecheck` pass.
- Generated `dist/` changes are deterministic and expected.

## Commit Messages

Use direct commit titles that describe the list action:

- `Block phishing domain example.com`
- `Warn on exchange hot wallet destination`
- `Remove false positive example.com`

Avoid vague titles such as `update list` or `fix stuff`.
