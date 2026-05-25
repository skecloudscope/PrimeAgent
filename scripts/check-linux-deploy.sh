#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"

cd "$ROOT"

required_paths=(
  "docker-compose.prod.yml"
  "Dockerfile.agentos.prod"
  "Dockerfile.frontend.prod"
  "agent-platform/Dockerfile"
  "agent-platform/requirements.txt"
  "agent-platform/app/main.py"
  "frontend/package.json"
  "frontend/package-lock.json"
  "frontend/app"
  "platform/agno/libs/agno/agno/__init__.py"
)

missing=0
for path in "${required_paths[@]}"; do
  if [ ! -e "$path" ]; then
    echo "MISSING: $path"
    missing=1
  else
    echo "OK:      $path"
  fi
done

echo
if [ ! -f ".env" ]; then
  echo "MISSING: .env"
  missing=1
elif ! grep -Eq '^OPENAI_API_KEY=.+$' .env; then
  echo "MISSING: OPENAI_API_KEY in .env"
  missing=1
else
  echo "OK:      .env contains OPENAI_API_KEY"
fi

echo
echo "Build context size:"
du -sh .

echo
echo "Compose build contexts:"
docker compose -f docker-compose.prod.yml config | sed -n '/build:/,/container_name:/p'

if [ "$missing" -ne 0 ]; then
  echo
  echo "PrimeAgent production deployment is incomplete. Copy the full project directory, especially agent-platform/ and platform/agno/."
  exit 1
fi

echo
echo "PrimeAgent production deployment preflight passed."
