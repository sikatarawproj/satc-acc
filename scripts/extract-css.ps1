param(
  [string]$HtmlPath = "index.html",
  [string]$OutputDir = "frontend/src/css"
)

$ErrorActionPreference = "Stop"
$content = Get-Content $HtmlPath -Raw
$text = $content

# ---- Helper: extract style block by ID or position ----
function Extract-StyleBlock {
  param([string]$Id)
  if ($Id) {
    $m = [regex]::Match($text, "<style\s+id=`"$Id`">(.*?)</style>", [System.Text.RegularExpressions.RegexOptions]::Singleline)
  } else {
    $m = [regex]::Match($text, "<style>(.*?)</style>", [System.Text.RegularExpressions.RegexOptions]::Singleline)
  }
  if ($m.Success) { return $m.Groups[1].Value } else { return "" }
}

# ---- Ensure output directory exists ----
$modDir = "$OutputDir/modules"
$patchDir = "$OutputDir/patches"
foreach ($d in @($OutputDir, $modDir, $patchDir)) {
  New-Item -ItemType Directory -Path $d -Force | Out-Null
}

# ---- Extract Main CSS Block (lines 11-8481) ----
$mainCss = Extract-StyleBlock -Id $null
$lines = $mainCss -split "`n"

Write-Output "Main CSS: $($lines.Length) lines"

# ---- Split into files by line ranges (based on comment markers) ----
$sections = @(
  @{ Name = "tokens";    StartLine = 0;  EndLine = 66;  File = "tokens.css";    Desc = ":root design tokens" },
  @{ Name = "theme";     StartLine = 68; EndLine = 147; File = "theme.css";     Desc = "[data-theme=dark] overrides" },
  @{ Name = "base";      StartLine = 148; EndLine = 162; File = "base.css";     Desc = "reset, html, body" },
  @{ Name = "components"; StartLine = 163; EndLine = 399; File = "components.css"; Desc = "SaaS component library" }
)

# Find all remaining section boundaries
$sectionBoundaries = @()
for ($i = 400; $i -lt $lines.Length; $i++) {
  $line = $lines[$i]
  if ($line -match '/\* ===== (.+) ===== \*/') {
    $sectionBoundaries += @{ Line = $i; Name = $matches[1] }
  }
  elseif ($line -match '/\* =+ (PHASE .+) =+ \*/') {
    $sectionBoundaries += @{ Line = $i; Name = $matches[1] }
  }
  elseif ($line -match '^@media') {
    $sectionBoundaries += @{ Line = $i; Name = "MEDIA_QUERY" }
  }
}

# Group into file assignments
$fileMap = @()
$currentStart = 400
$currentFile = "layout.css"

foreach ($sb in $sectionBoundaries) {
  $endBefore = $sb.Line - 1
  if ($endBefore -gt $currentStart) {
    $fileMap += @{ File = $currentFile; StartLine = $currentStart; EndLine = $endBefore }
  }
  $currentStart = $sb.Line
  $name = $sb.Name
  if ($name -match 'SIDEBAR|TOPBAR|MAIN CONTENT') { $currentFile = "layout.css" }
  elseif ($name -match 'CARDS|METRIC CARDS|PROGRESS CARDS') { $currentFile = "modules/cards.css" }
  elseif ($name -match 'FILTER BAR') { $currentFile = "modules/filters.css" }
  elseif ($name -match 'TABLE CARD') { $currentFile = "modules/tables.css" }
  elseif ($name -match 'BUTTONS') { $currentFile = "modules/buttons.css" }
  elseif ($name -match 'BADGES|STATUS BADGES|AGING STATUS') { $currentFile = "modules/badges.css" }
  elseif ($name -match 'ENCODING|TRANSACTION SUMMARY') { $currentFile = "modules/encode.css" }
  elseif ($name -match 'SOA') { $currentFile = "modules/soa.css" }
  elseif ($name -match 'LOGIN') { $currentFile = "modules/login.css" }
  elseif ($name -match 'TABS') { $currentFile = "modules/tabs.css" }
  elseif ($name -match 'INFO ALERT|STATUS FILTER') { $currentFile = "modules/misc.css" }
  elseif ($name -match 'MEDIA_QUERY') { $currentFile = "responsive.css" }
  elseif ($name -match 'PHASE 2') { $currentFile = "modules/dashboard.css" }
  elseif ($name -match 'PHASE 3') { $currentFile = "modules/encode-deep.css" }
  elseif ($name -match 'PHASE 4') { $currentFile = "modules/soa-deep.css" }
  elseif ($name -match 'RESPONSIVE') { $currentFile = "responsive.css" }
  elseif ($name -match 'DARK MODE') { $currentFile = "theme.css" }
  elseif ($name -match 'Modern UX polish|print') { $currentFile = "print.css" }
  else { $currentFile = "layout.css" }
}

# Last section
if ($currentStart -lt ($lines.Length - 1)) {
  $fileMap += @{ File = $currentFile; StartLine = $currentStart; EndLine = $lines.Length - 1 }
}

# Write files
$fileContents = @{}
foreach ($fm in $fileMap) {
  $contentLines = $lines[$fm.StartLine..$fm.EndLine] | Where-Object { $_ -ne $null }
  $joined = $contentLines -join "`n"
  $file = $fm.File
  if (-not $fileContents.ContainsKey($file)) { $fileContents[$file] = @() }
  $fileContents[$file] += $joined
}

$fileOrder = @()
foreach ($kv in $fileContents.GetEnumerator()) {
  $path = "$OutputDir/$($kv.Key)"
  $parent = Split-Path $path -Parent
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  $combined = ($kv.Value -join "`n`n")
  Set-Content -LiteralPath $path -Value $combined -NoNewline
  Write-Output "  Wrote $path ($($combined.Length) chars)"
  $fileOrder += $kv.Key
}

# ---- Extract Additional Style Blocks ----
$patches = @(
  @{ Id = "modern-2026-final-polish";        File = "patches/final-polish.css" },
  @{ Id = "modern-2026-phase6-qa-polish";    File = "patches/phase6-qa-polish.css" },
  @{ Id = "phase10DarkUIPatch";              File = "patches/phase10-dark-ui.css" },
  @{ Id = "phase11UIRefinementPatch";        File = "patches/phase11-refinement.css" },
  @{ Id = "phase12HardStructurePatch";        File = "patches/phase12-structure.css" },
  @{ Id = "phase8-audit-accountability-style"; File = "patches/audit-accountability.css" },
  @{ Id = "phase13TrueDarkIntegrationPatch";  File = "patches/phase13-dark-integration.css" },
  @{ Id = "finalLightThemeOverride";          File = "patches/final-light-theme.css" }
)

foreach ($p in $patches) {
  $css = Extract-StyleBlock -Id $p.Id
  if ($css) {
    $path = "$OutputDir/$($p.File)"
    Set-Content -LiteralPath $path -Value $css -NoNewline
    Write-Output "  Wrote $path ($($css.Length) chars)"
  }
}

Write-Output "`nDone! $($fileContents.Count + $patches.Count) files written to $OutputDir/"
