$ErrorActionPreference = 'Stop'

Write-Host '=== Cai dat JayDev Portal tren Windows ===' -ForegroundColor Cyan

if (-not (Test-Path 'package.json')) {
  $installRoot = Join-Path (Get-Location) 'locket'
  if (Test-Path $installRoot) {
    throw "Thu muc $installRoot da ton tai. Hay xoa/doi ten thu muc hoac chay script ben trong source."
  }

  $archive = Join-Path ([System.IO.Path]::GetTempPath()) 'locket-main.zip'
  $extractRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('locket-' + [guid]::NewGuid())
  Write-Host 'Dang tai source tu GitHub...'
  Invoke-WebRequest 'https://github.com/ninhneec/locket/archive/refs/heads/main.zip' -OutFile $archive
  Expand-Archive $archive -DestinationPath $extractRoot -Force
  Move-Item (Join-Path $extractRoot 'locket-main') $installRoot
  Remove-Item $archive -Force
  Remove-Item $extractRoot -Recurse -Force
  Set-Location $installRoot
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw 'Chua co Node.js va winget. Hay cai Node.js LTS tai https://nodejs.org, sau do chay lai script.'
  }

  Write-Host 'Dang cai Node.js LTS...'
  winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')
}

$nodeMajor = [int]((node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 20) { throw 'Can Node.js 20 tro len. Hay cap nhat Node.js LTS roi chay lai.' }

if (-not (Test-Path '.env.local')) {
  Copy-Item '.env.example' '.env.local'
  Write-Host 'Da tao .env.local tu file mau.' -ForegroundColor Green
}

if (-not (Test-Path 'config\telegram.local.json')) {
  Copy-Item 'config\telegram.example.json' 'config\telegram.local.json'
  Write-Host 'Da tao config\telegram.local.json tu file mau.' -ForegroundColor Green
}

npm install
npm run typecheck
npm run build

Write-Host ''
Write-Host 'Cai dat thanh cong.' -ForegroundColor Green
Write-Host '1. Sua .env.local de nhap API key.'
Write-Host '2. Sua config\telegram.local.json de nhap Telegram bot token va chat ID.'
Write-Host '3. Chay: npm run dev'
Write-Host '4. Mo: http://localhost:5173'
