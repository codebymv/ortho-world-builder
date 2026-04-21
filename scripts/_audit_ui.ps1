param()
$ErrorActionPreference = 'Stop'

$uiFiles = Get-ChildItem -Path src/components/ui -File
$otherFiles = Get-ChildItem -Path src -Recurse -Include *.ts, *.tsx -File |
    Where-Object { $_.FullName -notmatch 'components\\ui\\' }
$otherText = ($otherFiles | ForEach-Object { Get-Content -Raw $_.FullName }) -join "`n"

$results = foreach ($f in $uiFiles) {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
    $pattern = "from\s+['""][^'""]*components/ui/$([Regex]::Escape($base))['""]"
    $used = $otherText -match $pattern
    [PSCustomObject]@{ File = $f.Name; Used = $used }
}

Write-Host "=== USED shadcn primitives ==="
$results | Where-Object { $_.Used } | ForEach-Object { $_.File }
Write-Host ""
Write-Host "=== UNUSED shadcn primitives (candidates for removal) ==="
$results | Where-Object { -not $_.Used } | ForEach-Object { $_.File }

