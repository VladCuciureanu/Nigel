# Nigel

A CLI tool that replaces `rm` with a passive-aggressive bureaucratic approval process.

Want to delete a file? Submit a request. It gets "reviewed." You get a decision in 3–5 business seconds.

## Install

Requires [Deno](https://deno.com/).

```sh
# Run directly
deno run --allow-read --allow-write --allow-env src/main.ts rm file.txt

# Compile to standalone binary
deno task compile
./nigel rm file.txt
```

## Usage

```sh
# Submit a deletion request
nigel rm file.txt

# Batch request (sequential review)
nigel rm file1.txt file2.txt file3.txt

# Delete a directory
nigel rm -r my-directory/

# Dry run — full review, no actual deletion
nigel rm --dry-run file.txt

# Skip the review (Nigel will not be happy)
nigel rm --force file.txt

# Appeal a previous denial
nigel rm --appeal file.txt

# Custom approval rate
nigel rm --approval-rate 50 file.txt

# View department status
nigel status

# View audit log
nigel audit
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0`  | All requests approved |
| `1`  | At least one request denied or file not found |

## Development

```sh
# Run tests
deno task test

# Run in dev mode
deno task dev
```

## License

MIT
