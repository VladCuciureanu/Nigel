# Nigel

`rm`, but every deletion goes through a review board first.

Each file gets a ticket, a 3–5 second "review", and a verdict. Approved files are deleted; denied ones stay put. Every decision goes into an audit log.

```console
$ nigel rm report.txt

  Request NGL-00001 submitted. Review in progress.

  ✓ Running impact assessment...
  ✓ Checking file retention schedule...
  ✓ Cross-referencing with department policy...
  ✓ Assigning reviewer...

  NGL-00001 — ✗ DENIED: Unable to verify chain of custody. Request returned for clarification.
```

## Requirements

Node.js 26 or newer (see `.nvmrc`).

## Install

```sh
npm install     # also builds dist/
npm link        # puts `nigel` on your PATH, pointing at this checkout
```

Without linking, run `npm start -- <command>` (or `node src/main.ts <command>`) instead of `nigel`.

## Usage

```sh
nigel rm <file> [files...]   # submit deletion requests, reviewed one at a time
nigel status                 # department status board
nigel audit                  # print the audit log
nigel -h, --help
nigel -v, --version
```

Options for `rm`:

| Flag | Effect |
| --- | --- |
| `-r`, `--recursive` | Allow directories. Without it, a directory is rejected. |
| `--dry-run` | Run the full review but never delete. Approved requests are logged as `DRY-RUN`; denied ones as `DENIED`. |
| `-f`, `--force` | Skip the review and delete. Logged as `FORCED`. Nigel takes repeat offences within the same command personally, then forgets by the next one. |
| `--approval-rate <0-100>` | Chance of approval, in percent: an integer from 0 to 100. Default `70`. Anything else is rejected with an error. |
| `--appeal` | Submit the request again. Same as `rm`, and lets you leave out the `rm`: `nigel --appeal file.txt`. |

Short flags combine like `rm`'s: `nigel rm -rf build/` is `--recursive --force`. Flags take no value (`--dry-run=yes` is an error), and unknown or mistyped flags such as `--dryrun` are rejected with a one-line `nigel: ...` error on stderr before anything is reviewed or deleted.

The review progress is written to stderr, as a spinner on a terminal and as one line per step when stderr is redirected; verdicts go to stdout.

### Audit log

Each request that reaches a verdict is appended to `~/.nigel/audit.log`: approved, forced and dry-run deletions, plus denials. Missing files, unreadable paths, directories given without `-r` and failed deletions are reported on stderr but not logged. One line per request:

```
[2026-10-20T10:08:39.610Z] NGL-00001 | DENIED | report.txt | Unable to verify chain of custody. Request returned for clarification.
```

Verdicts are `APPROVED`, `DENIED`, `FORCED` and `DRY-RUN`. Ticket numbers continue from the highest one already in the log.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Every request was approved (or forced) and carried out. |
| `1` | At least one request was denied, the file was missing, a directory was given without `-r`, or deletion failed. Also returned for an unknown or mistyped flag, when no files or no known command are given (the usage text then goes to stderr), or when the audit log can't be read or written (reported as a single `nigel: ...` line on stderr). |

## Development

```sh
npm run dev         # run src/main.ts with --watch
npm test            # node --test, files in test/*.test.ts
npm run typecheck   # tsc, no emit
npm run lint        # biome lint
npm run format      # biome check --write (format, sort imports, safe fixes)
npm run check       # biome check, typecheck and tests
npm run build       # compile src/ to dist/
```

CI runs `npm run check` and `npm run build` on pushes to main and on pull requests.
