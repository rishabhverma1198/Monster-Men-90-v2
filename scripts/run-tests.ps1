param(
  [switch]$SkipE2E,
  [switch]$IncludeFrontend
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$msg) {
  Write-Host ""
  Write-Host "==> $msg"
}

function Invoke-Npm([string]$workingDir, [string[]]$npmArgs) {
  Push-Location $workingDir
  try {
    & npm @npmArgs
    if ($LASTEXITCODE -ne 0) { throw "npm $($npmArgs -join ' ') failed with exit code $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
}

function Test-UrlOk([string]$url, [int]$timeoutSec = 2) {
  try {
    Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec $timeoutSec | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Test-AdminLoginOk([string]$baseUrl, [string]$email, [string]$password) {
  try {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    $resp = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/auth/login" -ContentType "application/json" -Body $body -TimeoutSec 10
    # Expect { success: true, data: { token, user, ... } } or similar
    if ($null -eq $resp) { return $false }
    if ($resp.success -eq $true) { return $true }
    return $false
  } catch {
    return $false
  }
}

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendDir = Join-Path $root "backend"
$adminDir = Join-Path $root "admin-panel"
$frontendDir = Join-Path $root "frontend"

Write-Step "Backend unit tests"
Invoke-Npm $backendDir @("run", "test")

Write-Step "Admin-panel unit tests"
# Use vitest run (non-watch) for automation.
Invoke-Npm $adminDir @("run", "test:run")

if (-not $SkipE2E) {
  Write-Step "Admin-panel E2E (Playwright)"

  $backendHealth = "http://localhost:5000/health"
  if (-not (Test-UrlOk $backendHealth 2)) {
    Write-Host "SKIP: Backend not reachable at $backendHealth"
    Write-Host "      Start it first: cd backend; npm run dev"
  } else {
    # Do NOT skip E2E. We still run a precheck to print a useful warning.
    $adminEmail = $env:PLAYWRIGHT_ADMIN_EMAIL
    if ([string]::IsNullOrWhiteSpace($adminEmail)) { $adminEmail = "monstermen900@gmail.com" }

    $adminPassword = $env:PLAYWRIGHT_ADMIN_PASSWORD
    if ([string]::IsNullOrWhiteSpace($adminPassword)) { $adminPassword = "Monster@900" }

    if (-not (Test-AdminLoginOk "http://localhost:5000" $adminEmail $adminPassword)) {
      Write-Host "WARN: Admin login precheck failed (email=$adminEmail). E2E will likely fail at login."
      Write-Host "      If your password is different, set env var PLAYWRIGHT_ADMIN_PASSWORD and rerun."
    }

    # Make E2E stable on Windows:
    # - Force single worker (avoids backend rate-limit bursts and flakiness)
    # - Use line reporter (avoids playwright-report file lock)
    $prevCI = $env:CI
    $env:CI = "1"
    try {
      Invoke-Npm $adminDir @("run", "test:e2e:ci")
    } finally {
      $env:CI = $prevCI
    }
  }
}

if ($IncludeFrontend) {
  Write-Step "Frontend unit tests"
  Write-Host "NOTE: Frontend tests are currently blocked by a Rolldown/Vite SSR transform error:"
  Write-Host "      ReferenceError: __vite_ssr_exportName__ is not defined"
  Invoke-Npm $frontendDir @("run", "test")
} else {
  Write-Step "Frontend unit tests"
  Write-Host "SKIP: Not run by default (known issue: __vite_ssr_exportName__ / rolldown-vite)."
  Write-Host "      Run with: powershell -ExecutionPolicy Bypass -File scripts\\run-tests.ps1 -IncludeFrontend"
}

Write-Host ""
Write-Host "✅ Test automation run completed."

