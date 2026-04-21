param()
$ErrorActionPreference = 'Stop'

$files = Get-ChildItem -Path src -Recurse -Include *.ts, *.tsx -File

function Count-Regex($pattern, $files) {
    $total = 0
    foreach ($f in $files) {
        $text = Get-Content -Raw $f.FullName
        $matches = [Regex]::Matches($text, $pattern)
        $total += $matches.Count
    }
    return $total
}

$anyCount = 0
$nonNullCount = 0
$tsIgnoreCount = 0
$anyByFile = @()
$nonNullByFile = @()

foreach ($f in $files) {
    $text = Get-Content -Raw $f.FullName
    $a = [Regex]::Matches($text, ':\s*any\b|<any>|as\s+any\b|any\[\]').Count
    $n = [Regex]::Matches($text, '\.current!\.|\w+!\.|!\s*;|!\s*\)|!\s*,').Count
    $ti = [Regex]::Matches($text, '@ts-ignore|@ts-expect-error').Count
    $anyCount += $a
    $nonNullCount += $n
    $tsIgnoreCount += $ti
    if ($a -ge 3) { $anyByFile += [PSCustomObject]@{ File = $f.FullName.Substring((Get-Location).Path.Length + 1); Count = $a } }
    if ($n -ge 10) { $nonNullByFile += [PSCustomObject]@{ File = $f.FullName.Substring((Get-Location).Path.Length + 1); Count = $n } }
}

Write-Host "Totals (src/ only):"
Write-Host "  explicit 'any' usages: $anyCount"
Write-Host "  non-null assertions (!.):  $nonNullCount"
Write-Host "  ts-ignore/expect-error:    $tsIgnoreCount"
Write-Host ""
Write-Host "Files with >=3 'any' usages:"
$anyByFile | Sort-Object Count -Descending | Select-Object -First 20 | Format-Table -AutoSize
Write-Host ""
Write-Host "Files with >=10 non-null assertions:"
$nonNullByFile | Sort-Object Count -Descending | Select-Object -First 20 | Format-Table -AutoSize

