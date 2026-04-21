$ErrorActionPreference = 'Stop'
$pkgs = @(
  '@tanstack/react-query', 'next-themes', 'react-router-dom', 'zod',
  'sonner', 'lovable-tagger', '@vitejs/plugin-react-swc', '@vitejs/plugin-react',
  '@hookform/resolvers', 'date-fns', 'recharts'
)
$root = (Get-Location).Path
$files = Get-ChildItem -Path . -Recurse -File -Include *.ts,*.tsx,*.js,*.mjs,*.cjs |
  Where-Object { $_.FullName -notmatch '\\node_modules\\|\\dist\\' }
foreach ($pkg in $pkgs) {
  Write-Host ('--- ' + $pkg + ' ---')
  $hits = $files | Select-String -Pattern ([regex]::Escape($pkg)) -SimpleMatch | Select-Object -First 4
  if ($hits) {
    foreach ($h in $hits) {
      $rel = $h.Path.Substring($root.Length + 1)
      Write-Host ('  ' + $rel + ':' + $h.LineNumber + '  ' + $h.Line.Trim())
    }
  } else {
    Write-Host '  (no hits)'
  }
}

