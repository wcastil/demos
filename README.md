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
