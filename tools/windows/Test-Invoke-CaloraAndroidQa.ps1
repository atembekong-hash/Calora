[CmdletBinding()]
param(
    [string]$ToolkitPath = (Join-Path $PSScriptRoot 'Invoke-CaloraAndroidQa.ps1')
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw "ASSERTION_FAILED: $Message" }
}

function Assert-Equal {
    param([object]$Expected, [object]$Actual, [string]$Message)
    if ($Expected -ne $Actual) {
        throw "ASSERTION_FAILED: $Message. Expected [$Expected], got [$Actual]."
    }
}

function Get-ExecutableDestructiveAdbCommands {
    param([string]$Path)

    $tokens = $null
    $parseErrors = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile(
        $Path,
        [ref]$tokens,
        [ref]$parseErrors
    )
    if ($parseErrors.Count -gt 0) {
        throw "SAFETY_PARSE_FAILED: $Path contains PowerShell parse errors."
    }

    $matches = @()
    $commands = $ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.CommandAst] }, $true)
    foreach ($command in $commands) {
        $elements = @($command.CommandElements)
        if ($elements.Count -eq 0) { continue }
        $commandName = $elements[0].Extent.Text.Trim()
        if ($commandName -notmatch '^(?i:adb)(?:\.exe)?$') { continue }

        $commandText = $command.Extent.Text
        if ($commandText -match '(?i)(?:^|\s)(?:install|uninstall|wipe|factory-reset)(?:\s|$)' -or
            $commandText -match '(?i)\b(?:pm\s+clear|shell\s+rm|shell\s+reboot)\b') {
            $matches += $commandText
        }
    }
    return $matches
}

if (-not (Test-Path -LiteralPath $ToolkitPath)) {
    throw "TOOLKIT_NOT_FOUND: $ToolkitPath"
}

. $ToolkitPath -SkipExecution

$sample = @(
    'List of devices attached'
    'R58M123456A device usb:1-1 product:starqlteue model:SM_G991U device:starqlteue transport_id:1'
    'emulator-5554 offline'
    'ZX1G22 unauthorized usb:1-2'
    ''
)
$devices = @(ConvertFrom-AdbDevicesOutput -Lines $sample)
Assert-Equal 3 $devices.Count 'ADB parser should ignore headers and blank lines while retaining device states'
Assert-Equal 'R58M123456A' $devices[0].Serial 'Parser should preserve the device serial'
Assert-Equal 'device' $devices[0].State 'Parser should preserve an authorized device state'
Assert-Equal 'SM_G991U' $devices[0].Model 'Parser should parse the model detail'
Assert-Equal 'starqlteue' $devices[0].Product 'Parser should parse the product detail'
Assert-Equal 'offline' $devices[1].State 'Parser should retain offline records for diagnosis'
Assert-Equal 'unauthorized' $devices[2].State 'Parser should retain unauthorized records for diagnosis'

function Invoke-AdbSafe {
    param([string]$TargetSerial, [string[]]$Arguments)
    $joined = $Arguments -join ' '
    if ($joined -eq 'shell getprop') {
        return @(
            '[ro.product.manufacturer]: [samsung]'
            '[ro.product.model]: [SM-G991U]'
            '[ro.build.version.release]: [14]'
            '[ro.build.version.sdk]: [34]'
            '[ro.product.cpu.abilist]: [arm64-v8a,armeabi-v7a]'
        )
    }
    if ($joined -eq 'shell wm size') { return @('Physical size: 1080x2400') }
    if ($joined -eq 'shell wm density') { return @('Physical density: 421') }
    if ($joined -eq 'shell cat /proc/meminfo') { return @('MemTotal: 8000000 kB', 'MemFree: 1000000 kB', 'MemAvailable: 2000000 kB') }
    if ($joined -eq 'shell df -h /data') { return @('Filesystem Size Used Avail Use% Mounted on', '/dev/block/data 100G 40G 60G 40% /data') }
    throw "UNEXPECTED_ADB_FIXTURE: $joined"
}

$script:Target = $null
$factDevice = [pscustomobject]@{
    Serial = 'R58M123456A'
    RedactedSerial = 'fixturehash12'
    State = 'device'
}
$facts = Get-DeviceFacts $factDevice
Assert-Equal 'device' $facts.state 'Device facts must include the lowercase inventory state field'
Assert-Equal 'samsung' $facts.manufacturer 'Device facts should retain parsed manufacturer metadata'

$inventory = @($facts)
$authorizedCount = @($inventory | Where-Object { $_.state -eq 'device' }).Count
Assert-Equal 1 $authorizedCount 'Strict-mode inventory filtering must not access a missing state property'

$source = Get-Content -LiteralPath $ToolkitPath -Raw
Assert-True ($source -match '\$SkipExecution') 'Toolkit must expose a non-executing test mode for Windows regression tests'
$destructiveCommands = @(Get-ExecutableDestructiveAdbCommands -Path $ToolkitPath)
Assert-Equal 0 $destructiveCommands.Count 'Toolkit must not contain executable destructive ADB operations'

$harmlessFixture = Join-Path $env:TEMP 'calora-qa-harmless-safety-fixture.ps1'
$destructiveFixture = Join-Path $env:TEMP 'calora-qa-destructive-safety-fixture.ps1'
try {
    @"
# adb shell pm clear com.example.app
Write-Output 'ADB_NOT_FOUND: install Android Platform Tools'
`$message = 'adb uninstall com.example.app'
"@ | Set-Content -LiteralPath $harmlessFixture -Encoding UTF8
    @"
& adb shell pm clear com.example.app
"@ | Set-Content -LiteralPath $destructiveFixture -Encoding UTF8

    Assert-Equal 0 @(Get-ExecutableDestructiveAdbCommands -Path $harmlessFixture).Count 'Comments and quoted strings must not be classified as executable destructive ADB commands'
    Assert-Equal 1 @(Get-ExecutableDestructiveAdbCommands -Path $destructiveFixture).Count 'An executable destructive ADB command must be detected'
}
finally {
    Remove-Item -LiteralPath $harmlessFixture, $destructiveFixture -Force -ErrorAction SilentlyContinue
}

Write-Host 'PASS: ADB parsing, state propagation, strict-mode discovery filtering, and safety contracts.'
exit 0
