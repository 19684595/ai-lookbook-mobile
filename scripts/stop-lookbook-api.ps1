$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $workspaceRoot "backend"
$runDir = Join-Path $backendDir "run"
$pidFile = Join-Path $runDir "lookbook-api.pid"

function Get-LookBookApiProcesses {
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*dist/server.js*" }
}

$stoppedAny = $false

if (Test-Path $pidFile) {
  $pidValue = (Get-Content $pidFile -Raw).Trim()
  if ($pidValue) {
    $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    if ($process) {
      Stop-Process -Id $pidValue -Force
      Write-Output "API parada. PID: $pidValue"
      $stoppedAny = $true
    } else {
      Write-Output "Processo PID $pidValue nao estava ativo."
    }
  } else {
    Write-Output "Arquivo PID vazio encontrado."
  }

  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

$remaining = Get-LookBookApiProcesses
if ($remaining) {
  $remaining | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force
    Write-Output "API parada por varredura. PID: $($_.ProcessId)"
    $stoppedAny = $true
  }
}

if (!$stoppedAny) {
  Write-Output "Nenhuma instancia automatizada ativa foi encontrada."
}
