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

Node.js 26 or newer (see `.nvmrc`). Nigel runs its TypeScript sources directly; there is no build step.

## Install

```sh
npm install
npm link        # puts `nigel` on your PATH, pointing at this checkout
```

Without linking, run `node src/main.ts <command>` instead of `nigel`.

## Usage

```sh
nigel rm <file> [files...]   # submit deletion requests, reviewed one at a time
nigel status                 # department status board
nigel audit                  # print the audit log
nigel --help
nigel --version
```

Options for `rm`:

| Flag | Effect |
| --- | --- |
| `-r`, `--recursive` | Allow directories. Without it, a directory is rejected. |
| `--dry-run` | Run the full review but never delete. Approved requests are logged as `DRY-RUN`; denied ones as `DENIED`. |
| `--force` | Skip the review and delete. Logged as `FORCED`. Nigel takes repeat offences within the same command personally, then forgets by the next one. |
| `--approval-rate <0-100>` | Chance of approval, in percent. Default `70`. Out-of-range values are clamped; non-numeric values fall back to `70`. |
| `--appeal` | Submit the request again. Same as `rm`, and lets you leave out the `rm`: `nigel --appeal file.txt`. |

The review animation is written to stderr; verdicts go to stdout.

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
| `1` | At least one request was denied, the file was missing, a directory was given without `-r`, or deletion failed. Also returned when no files or no known command are given. |

## Development

```sh
npm test            # node --test, files in test/*_test.ts
npm run typecheck   # tsc, no emit
```

CI runs both on every push and pull request.
