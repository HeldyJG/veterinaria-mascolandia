$viewsDir = Join-Path $PSScriptRoot "..\src\views"
$files = Get-ChildItem $viewsDir -Recurse -Filter "*.ejs" | Where-Object { $_.FullName -notmatch "partials" }

foreach ($f in $files) {
  $c = Get-Content $f.FullName -Raw
  if ($c -notmatch "app-wrapper") { continue }

  $n = $c -replace '<div class="app-wrapper">\r?\n', ''
  $n = $n -replace "`r?`n</div>`r?`n(\s*<script|\s*<%- include\([^)]*footer)", "`n`$1"
  $n = $n -replace '(<%- include\([^)]*footer[^)]*\) %>)\s*\r?\n</div>\s*$', '$1'

  if ($n -ne $c) {
    Set-Content $f.FullName $n -NoNewline
    Write-Host "Fixed: $($f.Name)"
  }
}

Write-Host "Done."
