$ErrorActionPreference = "Stop"

$launcher = Join-Path $PSScriptRoot "lookbook-api-startup.cmd"
$startupDir = [Environment]::GetFolderPath("Startup")
$startupFile = Join-Path $startupDir "LookBook API.cmd"

if (!(Test-Path $launcher)) {
  throw "Launcher de inicializacao nao encontrado em $launcher"
}

Copy-Item -Path $launcher -Destination $startupFile -Force

Write-Output "Atalho de inicializacao copiado para:"
Write-Output $startupFile
Write-Output "No proximo logon do Windows, a API sera iniciada automaticamente."
