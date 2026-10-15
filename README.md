# sites

Static, password-protected HTML pages hosted on GitHub Pages.

Each page is encrypted with [staticrypt](https://github.com/robinmoisson/staticrypt) (AES-256 + PBKDF2). The served HTML is just a password gate over an encrypted blob — without the password, the content is genuinely unreadable, so scrapers and casual visitors see nothing.

## Layout

```
src/                       # raw, unencrypted source HTML (LOCAL ONLY — gitignored)
<page>.html                # encrypted, committed, served by Pages
.password                  # local password file (gitignored)
.staticrypt.json           # salt for encryption — committed (not secret)
build.sh                   # re-encrypts every src/*.html
```

## Add a new page

1. Drop the HTML into `src/`.
2. Run `./build.sh` — produces the encrypted version at the repo root.
3. `git add . && git commit -m "add <page>" && git push`

The live URL is `https://wcastil.github.io/demos/<filename>.html`.

## Change the password

Edit `.password` (local), then re-run `./build.sh` to re-encrypt all pages with the new password.

## How recipients use it

Send them the URL. They see a password prompt, type the password, and the page renders.

If you want a one-click "magic link" that auto-unlocks (so they don't have to type), staticrypt supports it via the `--share` flag — see staticrypt docs.

## Design export page

[Strata product update, October 14](https://wcastil.github.io/demos/strata-update-oct14.html) includes all seven screenshots inside the encrypted page. It requires password entry each time it loads and accepts either case for the password's first letter.

[James Currier's copy](https://wcastil.github.io/demos/strata-update-james-currier.html) contains the same update with a separate password. Rebuild it with its own password and the output filename `strata-update-james-currier.html`.

To rebuild a static design export without publishing its original text or images:

```bash
npm install --no-save --package-lock=false staticrypt@3.5.4
# Set STATICRYPT_PASSWORD in the environment, using a lowercase first letter.
node build-design-page.mjs /path/to/Main.dc.html strata-update-oct14.html
```

The packager keeps the prepared plaintext in gitignored `src/`. Commit only the encrypted output, build helper, and password template; keep original assets local.
