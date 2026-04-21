param()
$ErrorActionPreference = 'Stop'

$pkg = Get-Content -Raw package.json | ConvertFrom-Json
$allDeps = @()
$allDeps += ($pkg.dependencies.PSObject.Properties | ForEach-Object { $_.Name })
$allDeps += ($pkg.devDependencies.PSObject.Properties | ForEach-Object { $_.Name })

$srcFiles = Get-ChildItem -Path src -Recurse -Include *.ts, *.tsx -File
$allText = ($srcFiles | ForEach-Object { Get-Content -Raw $_.FullName }) -join "`n"

$results = foreach ($dep in $allDeps | Sort-Object -Unique) {
    $escaped = [Regex]::Escape($dep)
    $patterns = @(
        "from\s+['""]$escaped['""]",
        "from\s+['""]$escaped/",
        "import\s+['""]$escaped['""]",
        "require\(['""]$escaped['""]"
    )
    $found = $false
    foreach ($p in $patterns) {
        if ($allText -match $p) { $found = $true; break }
    }
    [PSCustomObject]@{ Dep = $dep; Used = $found }
}

Write-Host "=== USED ==="
$results | Where-Object { $_.Used } | ForEach-Object { $_.Dep }
Write-Host ""
Write-Host "=== UNUSED (candidates for removal) ==="
$results | Where-Object { -not $_.Used } | ForEach-Object { $_.Dep }

