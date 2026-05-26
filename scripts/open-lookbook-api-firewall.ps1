$ErrorActionPreference = "Stop"

$ruleName = "LookBook API 8787"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existingRule) {
  Write-Output "A regra de firewall '$ruleName' ja existe."
  exit 0
}

New-NetFirewallRule `
  -DisplayName $ruleName `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort 8787 `
  -Profile Private | Out-Null

Write-Output "Regra de firewall criada para a porta 8787 no perfil Private."
