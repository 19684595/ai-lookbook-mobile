$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)]
  [string]$ApiUrl,

  [string]$BuildId,
  [string]$ApplicationId,
  [string]$DisplayName,
  [string]$VersionName = "1.0.0",
  [int]$VersionCode = 0
)

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$androidDir = Join-Path $workspaceRoot "android"
$releaseDir = Join-Path $androidDir "app\build\outputs\apk\release"

if (!$BuildId) {
  $BuildId = "b" + (Get-Date -Format "yyMMddHHmmss")
}

if (!$ApplicationId) {
  $ApplicationId = "com.alessandro.ailookbook.$BuildId".ToLower()
}

if (!$DisplayName) {
  $DisplayName = "AI Lookbook $BuildId"
}

if ($VersionCode -le 0) {
  $VersionCode = [int](Get-Date -Format "yyMMddHHmm")
}

$env:EXPO_PUBLIC_STYLING_API_URL = $ApiUrl.TrimEnd("/")
$env:APP_BUILD_VARIANT = $BuildId
$env:APP_APPLICATION_ID = $ApplicationId
$env:APP_DISPLAY_NAME = $DisplayName
$env:APP_VERSION_NAME = $VersionName
$env:APP_VERSION_CODE = "$VersionCode"

Write-Output "Build variant: $BuildId"
Write-Output "API URL: $($env:EXPO_PUBLIC_STYLING_API_URL)"
Write-Output "Application ID: $ApplicationId"
Write-Output "Display name: $DisplayName"
Write-Output "Version: $VersionName ($VersionCode)"

Push-Location $androidDir
try {
  ./gradlew clean assembleRelease | Out-Host
} finally {
  Pop-Location
}

$sourceApk = Join-Path $releaseDir "app-release.apk"
if (!(Test-Path $sourceApk)) {
  throw "APK final nao encontrada em $sourceApk"
}

$safeBuildId = ($BuildId -replace "[^a-zA-Z0-9._-]", "-")
$targetApk = Join-Path $releaseDir "ai-lookbook-$safeBuildId.apk"
Copy-Item -Path $sourceApk -Destination $targetApk -Force

Write-Output "APK configurada gerada:"
Write-Output $targetApk
