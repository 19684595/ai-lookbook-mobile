$ErrorActionPreference = "Stop"

$startupDir = [Environment]::GetFolderPath("Startup")
$startupFile = Join-Path $startupDir "LookBook API.cmd"

if (!(Test-Path $startupFile)) {
  Write-Output "O atalho de inicializacao nao estava presente."
  exit 0
}

Remove-Item -Path $startupFile -Force
Write-Output "Atalho de inicializacao removido."
