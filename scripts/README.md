# Scripts

## iOS Dev Preview (iPhone 17 Pro Max)

Command:

```bash
npm run ios:preview
```

What it does:
- Reuses Metro if already running on `:8081`, otherwise starts Metro with `--dev-client --localhost --clear`.
- Waits until Metro is reachable before app launch.
- Boots `iPhone 17 Pro Max`.
- Builds/installs the dev client with `--no-bundler`.
- Opens the app via localhost dev-client URL.

Optional device override:

```bash
IOS_SIMULATOR_DEVICE="iPhone 16e" npm run ios:preview
```

## Metro Only

Command:

```bash
npm run ios:metro
```

## Generate README Demo GIF

Command:

```bash
bash ./scripts/make-demo-gif.sh
```

Optional custom input/output:

```bash
bash ./scripts/make-demo-gif.sh docs/media/demo/mediasis-demo.mov docs/media/demo/mediasis-demo.gif
```

Notes:
- Requires `ffmpeg` installed on your machine.
- Defaults: 18s clip, 10 FPS, width 540px.
- Override defaults with env vars: `START_AT`, `DURATION`, `FPS`, `WIDTH`.

## Data Scripts

### Generate MeSH Starter Pack (exact 7,000)

Command:

```bash
npm run import:mesh -- /absolute/or/relative/path/to/desc.xml
```

Optional custom output path:

```bash
npm run import:mesh -- /path/to/desc.xml src/data/generated/mesh7000.json
```

Input expectation:
- MeSH Descriptor XML dump from NLM.
- Script keeps only records with `term` + scope note definition.

Output:
- `src/data/generated/mesh7000.json` with exactly 7,000 terms.
- App seeds from this file automatically on a fresh local database.
