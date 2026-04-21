$ErrorActionPreference = 'Stop'
$data = Get-Content -Raw .\_lint.json | ConvertFrom-Json
Write-Host '=== rules-of-hooks occurrences ==='
foreach ($file in $data) {
  foreach ($msg in $file.messages) {
    if ($msg.ruleId -eq 'react-hooks/rules-of-hooks') {
      $rel = $file.filePath -replace '^.*ortho-world-builder\\', ''
      Write-Host ("{0}:{1}:{2}  {3}" -f $rel, $msg.line, $msg.column, $msg.message)
    }
  }
}
Write-Host ''
Write-Host '=== error counts by rule ==='
$byRule = @{}
foreach ($file in $data) {
  foreach ($msg in $file.messages) {
    if ($msg.severity -ne 2) { continue }
    $r = $msg.ruleId
    if (-not $r) { $r = '(parse)' }
    if (-not $byRule.ContainsKey($r)) { $byRule[$r] = 0 }
    $byRule[$r] = $byRule[$r] + 1
  }
}
$byRule.GetEnumerator() | Sort-Object { -[int]$_.Value } | ForEach-Object {
  Write-Host ("{0,4}  {1}" -f $_.Value, $_.Key)
}
Write-Host ''
Write-Host '=== total ==='
$totErr = 0; $totWarn = 0
foreach ($file in $data) {
  $totErr += $file.errorCount
  $totWarn += $file.warningCount
}
Write-Host ("{0} errors, {1} warnings" -f $totErr, $totWarn)

