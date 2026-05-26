$ErrorActionPreference = "Stop"

$ruleName = "LookBook API 8787"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if (!$existingRule) {
  Write-Output "A regra de firewall '$ruleName' nao estava criada."
  exit 0
}

Remove-NetFirewallRule -DisplayName $ruleName
Write-Output "Regra de firewall '$ruleName' removida."
