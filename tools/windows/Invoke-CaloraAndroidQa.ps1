[CmdletBinding()]
param(
    [ValidateSet('discover', 'health', 'app', 'screenshot', 'logs', 'crashes', 'performance', 'smoke', 'collect')]
    [string]$Action = 'discover',
    [string]$Serial,
    [ValidateSet('CALORA_PRIMARY_ANDROID', 'CALORA_SECONDARY_ANDROID', 'UNASSIGNED')]
    [string]$DeviceRole = 'UNASSIGNED',
    [string]$PackageName = 'com.etiendem.caloraapp',
    [string]$OutputRoot = '.\calora-android-evidence',
    [switch]$AllowLaunch
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:StartedAt = Get-Date
$script:RunId = $script:StartedAt.ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$script:OutputDir = Join-Path $OutputRoot $script:RunId
$script:InventoryPath = Join-Path $script:OutputDir 'device-inventory.json'
$script:ResultsPath = Join-Path $script:OutputDir 'qa-results.json'

function Ensure-OutputDirectory {
    New-Item -ItemType Directory -Path $script:OutputDir -Force | Out-Null
}

function Require-Adb {
    $command = Get-Command adb -ErrorAction SilentlyContinue
    if ($null -eq $command) {
        throw 'ADB_NOT_FOUND: install Android Platform Tools and add adb.exe to PATH.'
    }
    & adb start-server | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw 'ADB_START_FAILED: adb start-server did not complete successfully.'
    }
}

function Invoke-AdbSafe {
    param([string]$TargetSerial, [string[]]$Arguments)
    $output = & adb -s $TargetSerial @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "ADB_COMMAND_FAILED: adb -s $TargetSerial $($Arguments -join ' ')`n$($output -join [Environment]::NewLine)"
    }
    return @($output)
}

function Get-RedactedId {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return 'unknown' }
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
        return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').Substring(0, 12).ToLowerInvariant()
    } finally {
        $sha.Dispose()
    }
}

function Get-ConnectedDevices {
    $lines = & adb devices -l 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'ADB_DEVICE_LIST_FAILED' }
    $devices = @()
    foreach ($line in $lines) {
        if ($line -match '^([^\s]+)\s+(device|offline|unauthorized)(?:\s+(.*))?$') {
            $serial = $Matches[1]
            $state = $Matches[2]
            $details = if ($Matches[3]) { $Matches[3] } else { '' }
            $model = if ($details -match 'model:([^\s]+)') { $Matches[1] } else { 'unknown' }
            $product = if ($details -match 'product:([^\s]+)') { $Matches[1] } else { 'unknown' }
            $devices += [pscustomobject]@{
                Serial = $serial
                RedactedSerial = Get-RedactedId $serial
                State = $state
                Model = $model
                Product = $product
            }
        }
    }
    return $devices
}

function Resolve-TargetDevice {
    param([object[]]$Devices)
    $ready = @($Devices | Where-Object { $_.State -eq 'device' })
    if ($null -ne $Serial) {
        $match = $ready | Where-Object { $_.Serial -eq $Serial }
        if ($null -eq $match) { throw "TARGET_NOT_READY: requested serial is not connected and authorized." }
        return $match
    }
    if ($ready.Count -eq 1) { return $ready[0] }
    if ($ready.Count -eq 0) { throw 'NO_AUTHORIZED_DEVICE: connect and authorize a disposable Android target.' }
    throw 'AMBIGUOUS_TARGET: multiple devices are connected; pass -Serial with an exact adb serial.'
}

function Get-DeviceFacts {
    param([object]$Device)
    $getprop = Invoke-AdbSafe $Device.Serial @('shell', 'getprop')
    $prop = @{}
    foreach ($line in $getprop) {
        if ($line -match '^\[([^]]+)\]: \[([^]]*)\]$') { $prop[$Matches[1]] = $Matches[2] }
    }
    $wmSize = (Invoke-AdbSafe $Device.Serial @('shell', 'wm', 'size')) -join ' '
    $wmDensity = (Invoke-AdbSafe $Device.Serial @('shell', 'wm', 'density')) -join ' '
    $mem = (Invoke-AdbSafe $Device.Serial @('shell', 'cat', '/proc/meminfo')) -join [Environment]::NewLine
    $storage = (Invoke-AdbSafe $Device.Serial @('shell', 'df', '-h', '/data')) -join [Environment]::NewLine
    return [pscustomobject]@{
        role = $DeviceRole
        serialHash = $Device.RedactedSerial
        manufacturer = $prop['ro.product.manufacturer']
        model = $prop['ro.product.model']
        androidVersion = $prop['ro.build.version.release']
        apiLevel = $prop['ro.build.version.sdk']
        abi = $prop['ro.product.cpu.abilist']
        resolution = $wmSize
        density = $wmDensity
        memorySummary = (($mem -split [Environment]::NewLine | Select-Object -First 3) -join '; ')
        storageSummary = (($storage -split [Environment]::NewLine | Select-Object -Last 2) -join '; ')
        capturedAt = (Get-Date).ToUniversalTime().ToString('o')
    }
}

function Write-Json {
    param([object]$Value, [string]$Path)
    $Value | ConvertTo-Json -Depth 8 | Set-Content -Path $Path -Encoding UTF8
}

function Write-Result {
    param([string]$Name, [ValidateSet('PASS', 'FAIL', 'BLOCKED', 'NOT RUN')][string]$Status, [string]$Detail)
    $entry = [pscustomobject]@{
        name = $Name
        status = $Status
        detail = $Detail
        deviceRole = $DeviceRole
        deviceSerialHash = if ($script:Target) { $script:Target.RedactedSerial } else { $null }
        timestamp = (Get-Date).ToUniversalTime().ToString('o')
    }
    $script:Results += $entry
    Write-Host ("[{0}] {1}: {2}" -f $Status, $Name, $Detail)
}

function Save-Results {
    Write-Json ([pscustomobject]@{
        schemaVersion = 'calora.android-qa-results.v1'
        runId = $script:RunId
        packageName = $PackageName
        results = @($script:Results)
    }) $script:ResultsPath
}

function Invoke-Discovery {
    $devices = @(Get-ConnectedDevices)
    $inventory = @()
    foreach ($device in $devices) {
        if ($device.State -eq 'device') {
            try { $inventory += Get-DeviceFacts $device }
            catch { $inventory += [pscustomobject]@{ role = 'UNASSIGNED'; serialHash = $device.RedactedSerial; state = $device.State; model = $device.Model; error = $_.Exception.Message } }
        } else {
            $inventory += [pscustomobject]@{ role = 'UNASSIGNED'; serialHash = $device.RedactedSerial; state = $device.State; model = $device.Model }
        }
    }
    Write-Json ([pscustomobject]@{
        schemaVersion = 'calora.android-device-inventory.v1'
        runId = $script:RunId
        discoveredAt = (Get-Date).ToUniversalTime().ToString('o')
        deviceCount = $inventory.Count
        authorizedDeviceCount = @($inventory | Where-Object { $_.state -eq 'device' }).Count
        devices = $inventory
    }) $script:InventoryPath
    Write-Result 'ADB discovery' $(if (@($inventory | Where-Object { $_.state -eq 'device' }).Count -gt 0) { 'PASS' } else { 'BLOCKED' }) "$(@($inventory).Count) device record(s); serials are redacted in evidence."
}

function Invoke-TargetAction {
    param([string]$TargetAction)
    $devices = @(Get-ConnectedDevices)
    $script:Target = Resolve-TargetDevice $devices
    $facts = Get-DeviceFacts $script:Target
    Write-Json $facts (Join-Path $script:OutputDir 'target-device.json')

    switch ($TargetAction) {
        'health' {
            $battery = (Invoke-AdbSafe $script:Target.Serial @('shell', 'dumpsys', 'battery')) -join [Environment]::NewLine
            $window = (Invoke-AdbSafe $script:Target.Serial @('shell', 'wm', 'size')) -join ' '
            Set-Content (Join-Path $script:OutputDir 'health.txt') ("Battery`n$battery`nDisplay`n$window") -Encoding UTF8
            Write-Result 'Device health' 'PASS' 'Battery and display facts captured.'
        }
        'app' {
            $package = Invoke-AdbSafe $script:Target.Serial @('shell', 'pm', 'path', $PackageName)
            $details = Invoke-AdbSafe $script:Target.Serial @('shell', 'dumpsys', 'package', $PackageName)
            Set-Content (Join-Path $script:OutputDir 'application.txt') (($package + $details) -join [Environment]::NewLine) -Encoding UTF8
            if ($package.Count -gt 0 -and ($package -join '') -match $PackageName) { Write-Result 'Calora installation inspection' 'PASS' "Package $PackageName is installed." }
            else { Write-Result 'Calora installation inspection' 'FAIL' "Package $PackageName is not installed." }
        }
        'screenshot' {
            $path = Join-Path $script:OutputDir 'screen.png'
            & adb -s $script:Target.Serial exec-out screencap -p > $path
            if ($LASTEXITCODE -ne 0) { throw 'SCREENSHOT_FAILED' }
            Write-Result 'Screenshot capture' 'PASS' 'Captured current device screen.'
        }
        'logs' {
            $logs = Invoke-AdbSafe $script:Target.Serial @('logcat', '-d', '-v', 'threadtime')
            $safe = $logs | ForEach-Object { $_ -replace '(?i)(access[_-]?token|refresh[_-]?token|authorization|bearer)[:=\s]+[^\s,;]+', '$1=[REDACTED]' }
            Set-Content (Join-Path $script:OutputDir 'logcat.txt') $safe -Encoding UTF8
            Write-Result 'Logcat capture' 'PASS' 'Captured and redacted logcat output.'
        }
        'crashes' {
            $logs = Invoke-AdbSafe $script:Target.Serial @('logcat', '-d', '-v', 'brief', '-t', '3000')
            $fatal = @($logs | Select-String -Pattern 'FATAL EXCEPTION|AndroidRuntime|SIGSEGV|ANR in ')
            Set-Content (Join-Path $script:OutputDir 'crash-scan.txt') (($fatal | ForEach-Object { $_.Line }) -join [Environment]::NewLine) -Encoding UTF8
            if ($fatal.Count -eq 0) { Write-Result 'Crash scan' 'PASS' 'No matching fatal crash or ANR markers in the captured window.' }
            else { Write-Result 'Crash scan' 'FAIL' "$($fatal.Count) crash/ANR marker(s) found; inspect crash-scan.txt." }
        }
        'performance' {
            $mem = Invoke-AdbSafe $script:Target.Serial @('shell', 'dumpsys', 'meminfo', $PackageName)
            $cpu = Invoke-AdbSafe $script:Target.Serial @('shell', 'top', '-b', '-n', '1', '-o', 'PID,CPU,RES,ARGS')
            Set-Content (Join-Path $script:OutputDir 'performance.txt') (($mem + @('--- CPU ---') + $cpu) -join [Environment]::NewLine) -Encoding UTF8
            Write-Result 'Performance snapshot' 'PASS' 'Captured package memory and device CPU snapshot.'
        }
        'smoke' {
            if (-not $AllowLaunch) {
                Write-Result 'Application smoke launch' 'NOT RUN' 'Pass -AllowLaunch only after selecting an approved disposable device and test account.'
                return
            }
            Invoke-AdbSafe $script:Target.Serial @('shell', 'monkey', '-p', $PackageName, '1') | Out-Null
            Start-Sleep -Seconds 3
            $focused = (Invoke-AdbSafe $script:Target.Serial @('shell', 'dumpsys', 'activity', 'activities')) -join [Environment]::NewLine
            Set-Content (Join-Path $script:OutputDir 'smoke-launch.txt') $focused -Encoding UTF8
            if ($focused -match [regex]::Escape($PackageName)) { Write-Result 'Application smoke launch' 'PASS' 'Calora launch command completed and package appears in the focused activity report.' }
            else { Write-Result 'Application smoke launch' 'FAIL' 'Launch command completed but Calora was not found in the focused activity report.' }
        }
    }
}

Ensure-OutputDirectory
$script:Results = @()
$script:Target = $null
try {
    Require-Adb
    if ($Action -eq 'discover') { Invoke-Discovery }
    elseif ($Action -eq 'collect') {
        Invoke-TargetAction 'health'
        Invoke-TargetAction 'app'
        Invoke-TargetAction 'screenshot'
        Invoke-TargetAction 'logs'
        Invoke-TargetAction 'crashes'
        Invoke-TargetAction 'performance'
        Invoke-TargetAction 'smoke'
    } else { Invoke-TargetAction $Action }
} catch {
    Write-Result $Action 'BLOCKED' $_.Exception.Message
    exit 2
} finally {
    Save-Results
    Write-Host "Evidence directory: $script:OutputDir"
}

if (@($script:Results | Where-Object { $_.status -eq 'FAIL' }).Count -gt 0) { exit 1 }
if (@($script:Results | Where-Object { $_.status -eq 'BLOCKED' }).Count -gt 0) { exit 2 }
exit 0
