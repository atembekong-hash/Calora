[CmdletBinding()]
param(
    [string]$ToolkitPath = (Join-Path $PSScriptRoot 'Invoke-CaloraQa.ps1')
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw "ASSERTION_FAILED: $Message" }
}

if (-not (Test-Path -LiteralPath $ToolkitPath)) { throw "TOOLKIT_NOT_FOUND: $ToolkitPath" }
$source = Get-Content -LiteralPath $ToolkitPath -Raw

Assert-True ($source -match "ValidateSet\('QuickSmoke', 'FeatureRegression', 'FullCertification'\)") 'Level 1, Level 2, and Level 3 must be explicit choices'
Assert-True ($source -match "ValidateSet\('nutrition-goals', 'meal-images', 'plus-recipes', 'encrypted-recovery'\)") 'Feature flows must be limited to existing approved Maestro flows'
Assert-True ($source -match 'SERIAL_REQUIRED') 'The wrapper must require an exact device serial before device execution'
Assert-True ($source -match 'CALORA_ANDROID_DEVICE') 'Feature execution must target the explicitly selected device serial'
Assert-True ($source -match 'RunMaestro') 'Feature flows must require explicit execution opt-in'
Assert-True ($source -match 'quick-smoke-checklist\.md') 'Quick Smoke must write a repeatable checklist'
Assert-True ($source -match 'feature-regression-checklist\.md') 'Feature Regression must write a repeatable checklist'
Assert-True ($source -match 'full-certification-checklist\.md') 'Full Certification must write a repeatable checklist'
Assert-True ($source -match "status = 'NOT RUN'") 'The wrapper must preserve NOT RUN as a distinct outcome'
Assert-True ($source -match "status = 'BLOCKED'") 'The wrapper must preserve BLOCKED as a distinct outcome'
Assert-True ($source -notmatch '(?i)adb[^\r\n]*(install|uninstall|pm\s+clear|wipe|factory-reset|shell\s+rm|shell\s+reboot)') 'The wrapper must not contain destructive ADB operations'
Assert-True ($source -notmatch '(?i)eas\s+(build|submit)|expo\s+(build|submit)') 'The wrapper must not trigger native builds or submissions'

Write-Host 'PASS: QA level selection, serial targeting, explicit Maestro opt-in, evidence outcomes, and safety boundaries.'
exit 0
