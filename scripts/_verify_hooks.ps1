$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$files = Get-ChildItem -Path src -Recurse -File -Include *.ts,*.tsx
$patterns = @('use-mobile', 'hooks/use-toast', 'components/ui/use-toast', 'components/NavLink')
foreach ($p in $patterns) {
  Write-Host ('--- ' + $p + ' ---')
  $hits = $files | Select-String -Pattern $p -SimpleMatch
  if (-not $hits) { Write-Host '  (none)'; continue }
  foreach ($h in $hits) {
    $rel = $h.Path.Substring($root.Length + 1)
    Write-Host ('  ' + $rel + ':' + $h.LineNumber + '  ' + $h.Line.Trim())
  }
}

