$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $workspaceRoot "backend"
$runDir = Join-Path $backendDir "run"
$pidFile = Join-Path $runDir "lookbook-api.pid"
$logFile = Join-Path $runDir "lookbook-api.log"
$port = 8787

function Test-PortInUse {
  param([int]$TargetPort)

  $connections = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue
  return $null -ne $connections
}

function Get-PortOwnerProcessId {
  param([int]$TargetPort)

  $connection = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($connection) {
    return $connection.OwningProcess
  }

  return $null
}

function Test-LookBookApiProcess {
  param([int]$ProcessId)

  if (!$ProcessId) {
    return $false
  }

  $process = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessId -eq $ProcessId }
  if (!$process) {
    return $false
  }

  return $process.CommandLine -like "*dist/server.js*"
}

if (!(Test-Path $backendDir)) {
  throw "Pasta do backend nao encontrada em $backendDir"
}

if (!(Test-Path $runDir)) {
  New-Item -ItemType Directory -Path $runDir | Out-Null
}

if (Test-Path $pidFile) {
  $existingPid = (Get-Content $pidFile -Raw).Trim()
  if ($existingPid) {
    $existingProcess = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
    if ($existingProcess) {
      Write-Output "API ja esta em execucao com PID $existingPid."
      exit 0
    }
  }

  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

if (Test-PortInUse -TargetPort $port) {
  $portOwner = Get-PortOwnerProcessId -TargetPort $port
  if (Test-LookBookApiProcess -ProcessId $portOwner) {
    Set-Content -Path $pidFile -Value $portOwner
    Write-Output "API ja estava ativa na porta $port."
    Write-Output "PID adotado: $portOwner"
    Write-Output "Health: http://127.0.0.1:$port/health"
    exit 0
  }

  throw "A porta $port ja esta em uso por outro processo. Pare o processo atual antes de iniciar a API automatizada."
}

Push-Location $backendDir
try {
  npm run build | Out-Host
} finally {
  Pop-Location
}

if (Test-Path $logFile) {
  Remove-Item $logFile -Force -ErrorAction SilentlyContinue
}

$nodeCommand = "Set-Location '$backendDir'; node dist/server.js *> '$logFile'"
Start-Process -FilePath "powershell.exe" `
  -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-Command", $nodeCommand) `
  -WorkingDirectory $backendDir `
  -WindowStyle Hidden

Start-Sleep -Seconds 3

$portOwner = Get-PortOwnerProcessId -TargetPort $port
if (!(Test-LookBookApiProcess -ProcessId $portOwner)) {
  throw "A API nao permaneceu em execucao. Verifique o log em $logFile"
}

Set-Content -Path $pidFile -Value $portOwner

Write-Output "API iniciada em segundo plano."
Write-Output "PID: $portOwner"
Write-Output "Log: $logFile"
Write-Output "Health: http://127.0.0.1:$port/health"
