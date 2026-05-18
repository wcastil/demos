# CLAUDE.md

Context for any agent (Claude Code local/cloud, ultrareview, Codex, etc.) working in this directory.

## What this is

A static-site publishing pipeline for **password-protected HTML demos**. The owner (`wcastil`) sends one-off demo pages to people and wants them out of reach of scrapers and search engines.

Each HTML file is encrypted with [staticrypt](https://github.com/robinmoisson/staticrypt) (AES-256 key derived from the password via PBKDF2) before being committed. The served page is a real ciphertext blob behind a password prompt — not a JS gate over plaintext. A scraper fetching the URL gets unreadable bytes.

The repo is `github.com/wcastil/demos` (**public**) and is served by GitHub Pages at:

```
https://wcastil.github.io/demos/<page>.html
```

## Layout

```
src/                  # raw, unencrypted HTML — LOCAL ONLY, gitignored
<page>.html           # encrypted output at repo root — committed, served by Pages
.staticrypt.json      # encryption salt — committed (not secret)
.password             # local password file — gitignored
.nojekyll             # disables Jekyll processing on Pages (intentional)
.gitignore            # enforces the "no plaintext in repo" rule
build.sh              # encrypts every src/*.html
README.md             # human-facing summary
CLAUDE.md             # this file
```

## Key design decisions (don't undo these without thinking)

1. **Real encryption, not a JS prompt.** A `if (prompt() !== "x") return` gate is cosmetic — the plaintext is still in the page source. The whole point of this pipeline is that the served HTML contains no plaintext at all. If asked to "add a simple password check," do not replace staticrypt with a JS check.

2. **`src/` is gitignored.** The originals never enter the public repo. Committing them would expose the plaintext via the GitHub repo browser, defeating the entire pipeline. The trade-off is that source HTML lives only on the owner's machine — if they need a backup, they should sync `src/` to iCloud/Dropbox or a separate private repo.

3. **Salt is committed; password is not.** `.staticrypt.json` holds the PBKDF2 salt. It is not secret — it just needs to stay stable so the same password keeps deriving the same key across rebuilds. The password itself lives only in `.password` (gitignored) or `$STATICRYPT_PASSWORD`.

4. **`.nojekyll` is intentional.** Jekyll's default processing can mangle staticrypt's HTML (front-matter parsing, `_`-prefixed file handling). Leave it.

5. **Filename = URL.** A page named `foo.html` in `src/` becomes `https://wcastil.github.io/demos/foo.html`. When updating an existing page, keep the filename stable so previously-shared links keep working.

## Workflow: add a new page

```bash
cp /path/to/new.html src/<name>.html
./build.sh                                # encrypts src/*.html → repo root
git add . && git commit -m "add <name>" && git push
```

Live URL: `https://wcastil.github.io/demos/<name>.html`. First build takes 30–60s.

Then update the table at the bottom of this file.

## Workflow: update an existing page

```bash
cp /path/to/updated.html src/<existing-name>.html   # keep filename stable
./build.sh
git add . && git commit -m "update <existing-name>" && git push
```

Salt is reused → same password keeps working → no need to re-notify recipients.

## Password handling

`build.sh` reads the password from, in order:

1. `$STATICRYPT_PASSWORD` env var
2. `.password` file (gitignored)
3. Interactive prompt

**Never commit the password or paste it into any file in this repo.** The repo is public.

To rotate the password: update `.password` (or the env var), run `./build.sh` to re-encrypt every page, push, and re-notify recipients. Anyone holding the old password will not be able to read the new encrypted output.

## Verification after deploying

```bash
# 1. Confirm Pages built the latest commit
gh api repos/wcastil/demos/pages/builds/latest --jq '{status, commit, error}'

# 2. Confirm served bytes match local encrypted file
curl -s https://wcastil.github.io/demos/<page>.html | wc -c
wc -c < <page>.html

# 3. Sanity check: no plaintext leak in the served file
#    Pick a string you know is in the unencrypted src — it should not appear in the served HTML.
curl -s https://wcastil.github.io/demos/<page>.html | grep -c "<known-plaintext-string>"
# expected: 0
```

## Don'ts

- Do **not** commit `src/`.
- Do **not** commit `.password` or hardcode the password anywhere.
- Do **not** delete or regenerate `.staticrypt.json` (changes the salt → existing password no longer decrypts).
- Do **not** put unencrypted HTML at the repo root.
- Do **not** remove `.nojekyll`.
- Do **not** make the repo private to "improve security" — the encryption already handles that, and private Pages requires GitHub Pro.
- Do **not** rename existing committed pages without coordinating — it breaks links already in the wild.

## Pages config (for reference)

- Source: branch `main`, path `/` (root)
- Build type: `legacy` (plain static, no GitHub Actions workflow)
- `https_enforced: true`
- Set via: `gh api -X POST repos/wcastil/demos/pages -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/'`

## Possible future enhancements

- **Magic links** (`--share` flag on staticrypt): produces a URL with the hashed password in the fragment, so recipients click once and don't type. Useful if typing the password becomes annoying. Trade-off: anyone with the magic link gets in.
- **Per-page passwords**: pass different passwords to `staticrypt` per file. Means `build.sh` needs a mapping (e.g., a `passwords.json` keyed by filename) — and that mapping must also be gitignored.
- **Source backup**: a separate private repo, or a sync rule for `src/`, to protect against losing the only copy of the plaintext originals.

## Current pages

| File | URL |
| --- | --- |
| `strata-revenue-demo-may15.html` | https://wcastil.github.io/demos/strata-revenue-demo-may15.html |

Keep this table updated when adding or removing pages.
