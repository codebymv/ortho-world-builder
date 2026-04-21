$ErrorActionPreference = 'Stop'
$rules = @(
  '@typescript-eslint/no-explicit-any',
  '@typescript-eslint/no-unused-vars',
  '@typescript-eslint/no-require-imports',
  'react-hooks/rules-of-hooks',
  'react-hooks/exhaustive-deps',
  'react-refresh/only-export-components',
  'prefer-const',
  'no-constant-condition',
  'no-extra-boolean-cast'
)
$content = Get-Content .\_lint.log -Raw
foreach ($r in $rules) {
  $count = ([regex]::Matches($content, [regex]::Escape($r))).Count
  Write-Host ("{0,4}  {1}" -f $count, $r)
}
Write-Host ''
Write-Host '--- top files by error count ---'
$byFile = @{}
$current = $null
Get-Content .\_lint.log | ForEach-Object {
  $line = $_
  if ($line -match '^[A-Z]:\\') { $current = $line.Trim(); return }
  if ($line -match '^\s+\d+:\d+\s+(error|warning)\s' -and $current) {
    if (-not $byFile.ContainsKey($current)) { $byFile[$current] = 0 }
    $byFile[$current] = $byFile[$current] + 1
  }
}
$byFile.GetEnumerator() | Sort-Object { -[int]$_.Value } | Select-Object -First 15 | ForEach-Object {
  Write-Host ("{0,4}  {1}" -f $_.Value, ($_.Key -replace '^.*ortho-world-builder\\', ''))
}

