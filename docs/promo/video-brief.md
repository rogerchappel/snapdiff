# Video brief: "Stop testing CLIs with Jest — SnapDiff demo"

## Target
- Length: 2–3 minute screencast
- Audience: CLI tool maintainers, code generator authors, dev tool builders

## Hook (first 5 seconds)
- Show a massive node_modules folder with Jest, Vitest, 50+ transitive deps
- Voiceover/text: "You're installing 200 packages to snapshot-test a CLI."

## Demo flow (screen recording)

1. `npm install -g @rogerchappel/snapdiff` — one dependency
2. `snapdiff capture --from cmd --cmd "mytool --format fancy" --name my-output`
3. Show `snapshots/my-output.snap` and `snapshots/my-output.meta.json` — plain files
4. Change mytool output, run `snapdiff verify --name my-output` — shows mismatch, exits 1
5. `snapdiff diff --name my-output` — human-readable diff
6. `snapdiff update --name my-output` — accept the new baseline
7. Show `json-equiv` mode: `snapdiff capture --from file --file output.json --name api --mode json-equiv`

## Key talking points
- Zero framework overhead — standalone CLI
- Works offline, no accounts, no telemetry
- Three modes: exact, normalize, json-equiv
- Snapshots are plain files — version controllable, editable, reviewable
- CI exits 0/1 — drop it into any pipeline

## File references (all exist in repo)
- `dist/index.js` — compiled CLI
- `src/` — TypeScript source
- `examples/` — fixture.txt, fixture.json, fixture.md
- `snapshots/` — snapshot storage (after capture)

## Call to action
- "npm install -g @rogerchappel/snapdiff"
- https://github.com/rogerchappel/snapdiff
- PRs welcome — especially new comparison modes

## What NOT to say
- Don't claim it replaces all snapshot testing — it's for CLI/file output snapshots
- Don't claim binary support — text and JSON only
- Don't claim adoption numbers
