param(
  [string]$HtmlPath = "index.html",
  [string]$OutputDir = "frontend/src/js"
)

$ErrorActionPreference = "Stop"
$html = Get-Content $HtmlPath -Raw

# ---- Directory setup ----
foreach ($d in @("$OutputDir/core", "$OutputDir/modules", "$OutputDir/components")) {
  New-Item -ItemType Directory -Path $d -Force | Out-Null
}

# ---- Find all script blocks with their ids ----
$scriptBlocks = @()
$lines = Get-Content $HtmlPath
$i = 0
while ($i -lt $lines.Length) {
  $line = $lines[$i]
  if ($line -match '<script\s+id="([^"]*)"[^>]*>') {
    $id = $matches[1]
    $startLine = $i + 1
    $j = $i + 1
    while ($j -lt $lines.Length -and $lines[$j] -notmatch '</script>') { $j++ }
    $endLine = $j - 1
    $content = ($lines[$startLine..$endLine] -join "`n").Trim()
    if ($content.Length -gt 0) {
      $scriptBlocks += @{ Id = $id; Lines = $endLine - $startLine + 1; Content = $content; StartHtml = $startLine; EndHtml = $endLine }
    }
    $i = $j + 1
  }
  elseif ($line -match '<script(?!\s+src)(?!\s+id)>(?!\s*</script>)') {
    # Anonymous script block (the main one)
    $startLine = $i + 1
    $j = $i + 1
    while ($j -lt $lines.Length -and $lines[$j] -notmatch '</script>') { $j++ }
    $endLine = $j - 1
    $content = ($lines[$startLine..$endLine] -join "`n").Trim()
    if ($content.Length -gt 0) {
      $scriptBlocks += @{ Id = "main"; Lines = $endLine - $startLine + 1; Content = $content; StartHtml = $startLine; EndHtml = $endLine }
    }
    $i = $j + 1
  }
  elseif ($line -match '<script\s+src=') {
    # External script - skip
    $i++
  }
  else {
    $i++
  }
}

Write-Output "Found $($scriptBlocks.Count) script blocks:"
foreach ($sb in $scriptBlocks) {
  Write-Output "  id='$($sb.Id)' - $($sb.Lines) lines ($($sb.Content.Length) chars)"
}

# ---- Write files ----
foreach ($sb in $scriptBlocks) {
  $id = $sb.Id
  $content = $sb.Content

  # Map ID to filename
  $filename = switch -Wildcard ($id) {
    "main"                { "core/index.js" }
    "phase13TrueDarkRuntime" { "modules/runtime.js" }
    default               { "core/$id.js" }
  }

  $path = "$OutputDir/$filename"
  Set-Content -LiteralPath $path -Value $content -NoNewline
  Write-Output "  -> $filename"
}

Write-Output "`nDone! Script blocks extracted to $OutputDir/"
