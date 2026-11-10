#!/usr/bin/env bash
set -euo pipefail

printf '\n=== Cai dat JayDev Portal tren Linux/VPS ===\n'

if [ ! -f package.json ]; then
  if ! command -v git >/dev/null 2>&1; then
    if command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update
      sudo apt-get install -y git
    else
      printf 'Can git de tai source. Hay cai git roi chay lai.\n' >&2
      exit 1
    fi
  fi
  if [ -e locket ]; then
    printf 'Thu muc locket da ton tai. Hay xoa/doi ten thu muc hoac chay script ben trong source.\n' >&2
    exit 1
  fi
  git clone https://github.com/ninhneec/locket.git locket
  cd locket
fi

if ! command -v node >/dev/null 2>&1; then
  printf 'Chua co Node.js. Dang cai Node.js 22 LTS...\n'
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    printf 'VPS nay khong dung apt. Hay cai Node.js 20+ roi chay lai script.\n' >&2
    exit 1
  fi
fi

node_major="$(node --version | sed 's/^v//' | cut -d. -f1)"
if [ "$node_major" -lt 20 ]; then
  printf 'Can Node.js 20 tro len. Hay cap nhat Node.js roi chay lai.\n' >&2
  exit 1
fi

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  printf 'Da tao .env.local tu file mau.\n'
fi

if [ ! -f config/telegram.local.json ]; then
  cp config/telegram.example.json config/telegram.local.json
  printf 'Da tao config/telegram.local.json tu file mau.\n'
fi

npm install
npm run typecheck
npm run build

printf '\nCai dat thanh cong.\n'
printf '1. Sua .env.local de nhap API key.\n'
printf '2. Sua config/telegram.local.json de nhap Telegram bot token va chat ID.\n'
printf '3. Chay thu: npm start\n'
printf '4. Mo cong 8787 tren firewall/reverse proxy neu can.\n'
