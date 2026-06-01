param(
  [Parameter(Mandatory = $true)]
  [string]$Profile,

  [string]$ProfilesFile = "build-profiles.json"
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$profilesPath = Join-Path $workspaceRoot $ProfilesFile
$buildScript = Join-Path $PSScriptRoot "build-configured-android.ps1"

if (!(Test-Path $profilesPath)) {
  throw "Arquivo de perfis nao encontrado em $profilesPath"
}

if (!(Test-Path $buildScript)) {
  throw "Script base de build nao encontrado em $buildScript"
}

$profiles = Get-Content -Path $profilesPath -Raw | ConvertFrom-Json -AsHashtable
if (!$profiles.ContainsKey($Profile)) {
  $available = ($profiles.Keys | Sort-Object) -join ", "
  throw "Perfil '$Profile' nao encontrado. Perfis disponiveis: $available"
}

$selected = $profiles[$Profile]

if (!$selected.apiUrl) {
  throw "O perfil '$Profile' precisa definir apiUrl."
}

$arguments = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $buildScript,
  "-ApiUrl", $selected.apiUrl
)

if ($selected.buildId) {
  $arguments += @("-BuildId", $selected.buildId)
}

if ($selected.applicationId) {
  $arguments += @("-ApplicationId", $selected.applicationId)
}

if ($selected.displayName) {
  $arguments += @("-DisplayName", $selected.displayName)
}

if ($selected.versionName) {
  $arguments += @("-VersionName", $selected.versionName)
}

if ($selected.versionCode) {
  $arguments += @("-VersionCode", [string]$selected.versionCode)
}

& powershell.exe @arguments
