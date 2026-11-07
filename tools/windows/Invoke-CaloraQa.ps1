[CmdletBinding()]
param(
    [ValidateSet('QuickSmoke', 'FeatureRegression', 'FullCertification')]
    [string]$Level = 'QuickSmoke',
    [string]$Serial,
    [ValidateSet('CALORA_PRIMARY_ANDROID', 'CALORA_SECONDARY_ANDROID', 'UNASSIGNED')]
    [string]$DeviceRole = 'UNASSIGNED',
    [ValidateSet('nutrition-goals', 'meal-images', 'plus-recipes', 'encrypted-recovery')]
    [string]$Feature,
    [string]$PackageName = 'com.etiendem.caloraapp',
    [string]$OutputRoot = 'C:\CaloraEvidence',
    [switch]$AllowLaunch,
    [switch]$RunMaestro
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$startedAt = Get-Date
$runId = $startedAt.ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$runDir = Join-Path $OutputRoot ("qa-{0}-{1}" -f $runId, $Level.ToLowerInvariant())
$toolkit = Join-Path $PSScriptRoot 'Invoke-CaloraAndroidQa.ps1'
$caloraRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..\artifacts\calora')

function Write-JsonFile {
    param([object]$Value, [string]$Path)
    $Value | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Write-Checklist {
    param([string]$Path, [string]$Title, [string[]]$Items)
    $lines = @("# $Title", '', "Run: $runId", "Level: $Level", "Device role: $DeviceRole", '')
    foreach ($item in $Items) { $lines += "- [ ] $item" }
    $lines | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Invoke-LowLevelCollection {
    if ([string]::IsNullOrWhiteSpace($Serial)) {
        throw 'SERIAL_REQUIRED: pass the exact adb serial to prevent targeting the wrong device.'
    }

    $args = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', $toolkit,
        '-Action', 'collect',
        '-Serial', $Serial,
        '-DeviceRole', $DeviceRole,
        '-PackageName', $PackageName,
        '-OutputRoot', $runDir
    )
    if ($AllowLaunch) { $args += '-AllowLaunch' }

    & powershell.exe @args
    return $LASTEXITCODE
}

function Invoke-FeatureFlow {
    if ([string]::IsNullOrWhiteSpace($Feature)) {
        throw 'FEATURE_REQUIRED: pass -Feature for FeatureRegression.'
    }
    if (-not $RunMaestro) {
        return [pscustomobject]@{ status = 'NOT RUN'; detail = 'Feature checklist prepared; pass -RunMaestro to execute the selected flow on an approved disposable device.' }
    }
    if ([string]::IsNullOrWhiteSpace($Serial)) {
        throw 'SERIAL_REQUIRED: pass the exact adb serial before running a feature flow.'
    }

    $previousDevice = $env:CALORA_ANDROID_DEVICE
    try {
        $env:CALORA_ANDROID_DEVICE = $Serial
        Push-Location $caloraRoot
        try {
            & pnpm ("test:device:{0}" -f $Feature)
            $exitCode = $LASTEXITCODE
        } finally {
            Pop-Location
        }
    } finally {
        $env:CALORA_ANDROID_DEVICE = $previousDevice
    }
    $flowStatus = if ($exitCode -eq 0) { 'PASS' } else { 'FAIL' }
    return [pscustomobject]@{ status = $flowStatus; detail = "Maestro flow test:device:$Feature exited with code $exitCode." }
}

New-Item -ItemType Directory -Path $runDir -Force | Out-Null
$results = @()
$checklist = @()
$collectionExit = $null

try {
    switch ($Level) {
        'QuickSmoke' {
            $checklist = @(
                'ADB connectivity and authorized device state',
                'Calora installation and version inspection',
                'Screenshot and redacted log capture',
                'Crash and ANR scan',
                'Performance snapshot',
                'Foreground smoke launch (requires -AllowLaunch and a controlled test account)'
            )
            Write-Checklist (Join-Path $runDir 'quick-smoke-checklist.md') 'Calora Level 1 Quick Smoke' $checklist
            $collectionExit = Invoke-LowLevelCollection
            $collectionStatus = if ($collectionExit -eq 0) { 'PASS' } else { 'BLOCKED' }
            $results += [pscustomobject]@{ name = 'Quick smoke collection'; status = $collectionStatus; detail = "Low-level collector exit code $collectionExit." }
        }
        'FeatureRegression' {
            $checklist = @(
                "Run the selected $Feature flow with a controlled disposable account",
                'Verify changed-screen navigation and interactions',
                'Verify persistence after navigation and app restart',
                'Capture visual checkpoints and inspect clipping/overflow',
                'Review error handling, crash scan, and performance evidence'
            )
            Write-Checklist (Join-Path $runDir 'feature-regression-checklist.md') ("Calora Level 2 Feature Regression: $Feature") $checklist
            $featureResult = Invoke-FeatureFlow
            $results += $featureResult
        }
        'FullCertification' {
            $checklist = @(
                'Complete Level 1 quick smoke on every approved device',
                'Exercise authentication and session restoration',
                'Exercise Today, Recipes, Scan, Plan, More, Progress, Insights, Learning, Settings, and Coach',
                'Verify light/dark visual checkpoints and safe areas',
                'Verify background/foreground restoration and network recovery',
                'Review memory, startup, duplicate-request, crash, and ANR evidence',
                'Record PASS, FAIL, BLOCKED, or NOT RUN for every feature row'
            )
            Write-Checklist (Join-Path $runDir 'full-certification-checklist.md') 'Calora Level 3 Full Android Certification' $checklist
            if ([string]::IsNullOrWhiteSpace($Serial)) {
                $results += [pscustomobject]@{ name = 'Full certification'; status = 'NOT RUN'; detail = 'Checklist prepared; no physical device serial was supplied.' }
            } else {
                $collectionExit = Invoke-LowLevelCollection
                $collectionStatus = if ($collectionExit -eq 0) { 'PASS' } else { 'BLOCKED' }
                $results += [pscustomobject]@{ name = 'Full certification baseline collection'; status = $collectionStatus; detail = "Level 1 baseline exit code $collectionExit; feature certification remains checklist-driven." }
            }
        }
    }

    $overall = if (@($results | Where-Object { $_.status -eq 'FAIL' }).Count -gt 0) { 'FAIL' }
               elseif (@($results | Where-Object { $_.status -eq 'BLOCKED' }).Count -gt 0) { 'BLOCKED' }
               elseif (@($results | Where-Object { $_.status -eq 'NOT RUN' }).Count -gt 0) { 'NOT RUN' }
               else { 'PASS' }
    Write-JsonFile ([pscustomobject]@{
        schemaVersion = 'calora.android-qa-level-run.v1'
        runId = $runId
        level = $Level
        packageName = $PackageName
        deviceRole = $DeviceRole
        serialProvided = (-not [string]::IsNullOrWhiteSpace($Serial))
        results = @($results)
        overall = $overall
        startedAt = $startedAt.ToUniversalTime().ToString('o')
        completedAt = (Get-Date).ToUniversalTime().ToString('o')
    }) (Join-Path $runDir 'qa-level-results.json')
    Write-Host "Overall: $overall"
    Write-Host "Evidence directory: $runDir"
    if ($overall -eq 'FAIL') { exit 1 }
    if ($overall -eq 'BLOCKED') { exit 2 }
    exit 0
} catch {
    Write-JsonFile ([pscustomobject]@{
        schemaVersion = 'calora.android-qa-level-run.v1'
        runId = $runId
        level = $Level
        overall = 'BLOCKED'
        error = $_.Exception.Message
        completedAt = (Get-Date).ToUniversalTime().ToString('o')
    }) (Join-Path $runDir 'qa-level-results.json')
    Write-Host "[BLOCKED] $($_.Exception.Message)"
    Write-Host "Evidence directory: $runDir"
    exit 2
}
