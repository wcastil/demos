#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Password sources, in order of preference:
#   1. $STATICRYPT_PASSWORD env var
#   2. ./.password file (gitignored)
#   3. Prompt
if [[ -z "${STATICRYPT_PASSWORD:-}" ]]; then
  if [[ -f .password ]]; then
    STATICRYPT_PASSWORD=$(cat .password)
  else
    read -rsp "Password: " STATICRYPT_PASSWORD
    echo
  fi
  export STATICRYPT_PASSWORD
fi

shopt -s nullglob
files=(src/*.html)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "No HTML files found in src/" >&2
  exit 1
fi

npx -y staticrypt "${files[@]}" -d . --short \
  --template-title "Protected" \
  --template-instructions "Enter the password to view." \
  --template-button "Open" \
  --template-color-primary "#C1121F" \
  --template-color-secondary "#FAF9F7"

echo
echo "Encrypted ${#files[@]} file(s)."
echo "Next: git add . && git commit -m 'update' && git push"
