#!/usr/bin/env -S bash -I

set -e

ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && cd .. && pwd )"

echo "Checking out production branch"
git checkout production

echo "Getting the latest"
git reset --hard && git pull

echo "Install modules"
npm install --production

echo "Updating data"
npm run update-data

TIMESTAMP="$(date +%Y/%m/%d %H:%M:%S)"
echo "Creating a new commit for $TIMESTAMP"
git add .
git commit -m "Data update: ${TIMESTAMP}"

echo "Pushing"
git push origin production

echo "Done"
