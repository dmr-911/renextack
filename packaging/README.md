# Packaging

Material for selling the kit. Nothing in this folder is part of the app or its build.

| Path | What it is |
|---|---|
| `landing-page/index.html` | A standalone, dependency-free sales page. Replace the `[BRACKETED]` values (prices, checkout links, demo URL, company name), copy `docs/screenshots/*.png` into `landing-page/screenshots/` and update the image paths, then host it on any static host. |
| `../LICENSE.md` | Commercial license template with Personal / Team / Agency tiers. Have it reviewed by a lawyer before selling. |
| `../docs/feature-checklist.md` | What's included and how each item is verified: useful for a product page or buyer FAQ. |
| `../docs/screenshots/` | Demo screenshots, regenerated with `npm run screenshots` (needs a build and the test database). |

## Release checklist

1. Update `CHANGELOG.md` and bump `version` in `package.json`.
2. `npm run verify && npm run test:e2e` on a clean checkout.
3. `npm run screenshots` if the UI changed.
4. Tag `vX.Y.Z` and publish the release to buyers (private repository invite, or a zip of the tag without `.git`).
5. Never ship your own `.env`, `node_modules`, `.next` or test reports. `git archive --format=zip -o launchstack-next-vX.Y.Z.zip vX.Y.Z` produces a clean bundle from committed files only.
