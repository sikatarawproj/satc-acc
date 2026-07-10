param(
  [string]$JsPath = "frontend/src/js/core/index.js",
  [string]$OutputDir = "frontend/src/js"
)
$ErrorActionPreference = "Stop"
$lines = Get-Content $JsPath
$total = $lines.Length
Write-Output "Splitting $JsPath ($total lines)..."
Write-Output ""
foreach ($d in @("$OutputDir/core","$OutputDir/modules","$OutputDir/components")) {
  New-Item -ItemType Directory -Path $d -Force | Out-Null
}
$extractions = @(
  @{File="core/state.js";      Start=0;   End=20;   Desc="constants"},
  @{File="core/permissions.js";Start=21;  End=113;  Desc="permissions"},
  @{File="core/sample-data.js";Start=114; End=144;  Desc="sample data"},
  @{File="core/state.js";      Start=145; End=188;  Desc="state object"},
  @{File="core/dom-refs.js";   Start=189; End=627;  Desc="DOM refs"},
  @{File="core/utils.js";      Start=628; End=791;  Desc="utilities"}
)
Write-Output "Extracting core modules:"
foreach ($ex in $extractions) {
  $content = ($lines[$ex.Start..$ex.End] -join "`n")
  $path = "$OutputDir/$($ex.File)"
  if (Test-Path $path) {
    $existing = Get-Content $path -Raw
    Set-Content -LiteralPath $path -Value "$existing`n$content" -NoNewline
  } else {
    Set-Content -LiteralPath $path -Value $content -NoNewline
  }
  Write-Output "  $($ex.File)"
}
$appContent = ($lines[792..($total-1)] -join "`n")
$appPath = "$OutputDir/modules/app.js"
Set-Content -LiteralPath $appPath -Value $appContent -NoNewline
Write-Output ""
Write-Output "  modules/app.js ($($appContent.Length) chars)"
Write-Output ""
Write-Output "Done!"