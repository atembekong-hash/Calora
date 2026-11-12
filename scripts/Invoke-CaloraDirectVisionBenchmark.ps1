[CmdletBinding()]
param(
  [ValidateSet('Validate','Smoke','Nutrition5k','PostCorrection')]
  [string]$Mode = 'Validate'
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$project = Join-Path $repo 'artifacts\api-server'
$vitest = Join-Path $project 'node_modules\.bin\vitest.CMD'
$vitestConfig = Join-Path $project 'vitest.config.ts'
  $smokeTest = 'src/__tests__/directVisionSmoke.test.ts'
  $nutrition5kTest = 'src/__tests__/directVisionNutrition5kBaseline.test.ts'

if (-not (Test-Path -LiteralPath $vitest)) {
  throw "Repository-local Vitest was not found: $vitest"
}

$originalApiKey = [Environment]::GetEnvironmentVariable('AI_INTEGRATIONS_OPENAI_API_KEY', 'Process')
$originalBaseUrl = [Environment]::GetEnvironmentVariable('AI_INTEGRATIONS_OPENAI_BASE_URL', 'Process')
$originalAllow = [Environment]::GetEnvironmentVariable('CALORA_DIRECT_BENCHMARK_ALLOW', 'Process')
$originalVariant = [Environment]::GetEnvironmentVariable('CALORA_DIRECT_BENCHMARK_VARIANT', 'Process')
$secureKey = $null
$plainKey = $null
$bstr = [IntPtr]::Zero
$locationPushed = $false

try {
  Push-Location -LiteralPath $project
  $locationPushed = $true
  $vitestPrefix = @('--root', $project, '--config', $vitestConfig)
  if ($Mode -eq 'Validate') {
    # Validation never imports the provider client and never accepts a key.
    & $vitest @vitestPrefix run src/__tests__/directVisionBenchmarkAdapter.test.ts --maxWorkers=1
    if ($LASTEXITCODE -ne 0) { throw "Launcher validation failed with exit code $LASTEXITCODE" }
    & $vitest @vitestPrefix run src/__tests__/directVisionSmoke.test.ts -t 'resolves the authoritative 68-meal manifest' --maxWorkers=1
    if ($LASTEXITCODE -ne 0) { throw "Smoke path validation failed with exit code $LASTEXITCODE" }
    & $vitest @vitestPrefix run src/__tests__/directVisionNutrition5kBaseline.test.ts -t 'selects all 10 Nutrition5k rows' --maxWorkers=1
    if ($LASTEXITCODE -ne 0) { throw "Nutrition5k integrity validation failed with exit code $LASTEXITCODE" }
    & $vitest @vitestPrefix run src/__tests__/directVisionNutrition5kBaseline.test.ts -t 'selects nine valid Nutrition5k rows' --maxWorkers=1
    if ($LASTEXITCODE -ne 0) { throw "Post-correction selection validation failed with exit code $LASTEXITCODE" }
    exit 0
  }

  $secureKey = Read-Host 'Enter the dedicated OpenAI project API key (input is hidden)' -AsSecureString
  if ($null -eq $secureKey) { throw 'No API key was entered.' }
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
  $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if ([string]::IsNullOrWhiteSpace($plainKey)) { throw 'The API key was empty.' }

  [Environment]::SetEnvironmentVariable('AI_INTEGRATIONS_OPENAI_API_KEY', $plainKey, 'Process')
  [Environment]::SetEnvironmentVariable('AI_INTEGRATIONS_OPENAI_BASE_URL', 'https://api.openai.com/v1', 'Process')
  [Environment]::SetEnvironmentVariable('CALORA_DIRECT_BENCHMARK_ALLOW', '1', 'Process')
  if ($Mode -eq 'PostCorrection') {
    [Environment]::SetEnvironmentVariable('CALORA_DIRECT_BENCHMARK_VARIANT', 'post-correction', 'Process')
  }
  $paidTest = if ($Mode -eq 'Nutrition5k' -or $Mode -eq 'PostCorrection') { $nutrition5kTest } else { $smokeTest }
  $modeLabel = if ($Mode -eq 'Nutrition5k') { 'Nutrition5k benchmark' } elseif ($Mode -eq 'PostCorrection') { 'post-correction Nutrition5k benchmark' } else { 'Smoke benchmark' }
  & $vitest @vitestPrefix run $paidTest -t 'runs each of the 10 Nutrition5k cases once with usage and budget evidence' --maxWorkers=1
  if ($LASTEXITCODE -ne 0) { throw "$modeLabel failed with exit code $LASTEXITCODE" }
  exit 0
}
finally {
  # Clear the plaintext key from the child environment and release the local copy.
  [Environment]::SetEnvironmentVariable('AI_INTEGRATIONS_OPENAI_API_KEY', $originalApiKey, 'Process')
  [Environment]::SetEnvironmentVariable('AI_INTEGRATIONS_OPENAI_BASE_URL', $originalBaseUrl, 'Process')
  [Environment]::SetEnvironmentVariable('CALORA_DIRECT_BENCHMARK_ALLOW', $originalAllow, 'Process')
  [Environment]::SetEnvironmentVariable('CALORA_DIRECT_BENCHMARK_VARIANT', $originalVariant, 'Process')
  if ($plainKey) {
    $plainKey = $null
  }
  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $bstr = [IntPtr]::Zero
  }
  $secureKey = $null
  if ($locationPushed) {
    Pop-Location
  }
}
