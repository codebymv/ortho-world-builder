$files = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx -File
$result = foreach ($f in $files) {
  $n = (Get-Content -LiteralPath $f.FullName).Count
  [PSCustomObject]@{ Lines = $n; Path = $f.FullName.Substring((Get-Location).Path.Length + 1) }
}
$result | Sort-Object Lines -Descending | Select-Object -First 50 | Format-Table -AutoSize
Write-Host "---"
Write-Host ("Total files: {0}" -f $result.Count)
Write-Host ("Total lines: {0}" -f (($result | Measure-Object Lines -Sum).Sum))

