param(
  [string]$RootWorkspace = $env:MONYVI_ROOT_WORKSPACE,
  [switch]$ReplaceExisting
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-ExistingPath {
  param([Parameter(Mandatory = $true)][string]$Path)

  return [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $Path).Path)
}

function Resolve-GitRoot {
  $root = (& git rev-parse --show-toplevel 2>$null)
  if (-not $root) {
    throw "This script must be run from inside a git worktree."
  }

  return [System.IO.Path]::GetFullPath($root)
}

$currentWorkspace = Resolve-GitRoot

if (-not $RootWorkspace) {
  $siblingMainWorkspace = Join-Path (Split-Path -Parent $currentWorkspace) "Monyvi"
  if (
    (Test-Path -LiteralPath $siblingMainWorkspace) -and
    ((Resolve-ExistingPath $siblingMainWorkspace) -ne $currentWorkspace)
  ) {
    $RootWorkspace = $siblingMainWorkspace
  }
}

if (-not $RootWorkspace) {
  throw "Pass -RootWorkspace or set MONYVI_ROOT_WORKSPACE to the main checkout path."
}

$resolvedRootWorkspace = Resolve-ExistingPath $RootWorkspace

if ($resolvedRootWorkspace -eq $currentWorkspace) {
  Write-Output "Current workspace is the main checkout; no node_modules junction is needed."
  exit 0
}

$sourceNodeModules = Join-Path $resolvedRootWorkspace "node_modules"
$sourceJest = Join-Path $sourceNodeModules ".bin\jest.cmd"

if (-not (Test-Path -LiteralPath $sourceJest)) {
  throw "Main checkout node_modules is not ready: $sourceJest was not found."
}

$targetNodeModules = Join-Path $currentWorkspace "node_modules"

if (Test-Path -LiteralPath $targetNodeModules) {
  $existingItem = Get-Item -LiteralPath $targetNodeModules -Force
  $targetValue = if ($existingItem.Target) { $existingItem.Target } else { "" }

  if ($existingItem.LinkType -eq "Junction" -and $targetValue -eq $sourceNodeModules) {
    Write-Output "node_modules already points to $sourceNodeModules"
    exit 0
  }

  if (-not $ReplaceExisting) {
    throw "A node_modules directory already exists at $targetNodeModules. Rerun with -ReplaceExisting only after confirming it is safe to replace."
  }

  $resolvedTargetParent = [System.IO.Path]::GetFullPath((Split-Path -Parent $targetNodeModules))
  if ($resolvedTargetParent -ne $currentWorkspace) {
    throw "Refusing to replace node_modules outside the current worktree."
  }

  Remove-Item -LiteralPath $targetNodeModules -Recurse -Force
}

New-Item -ItemType Junction -Path $targetNodeModules -Target $sourceNodeModules | Out-Null
Write-Output "Created node_modules junction: $targetNodeModules -> $sourceNodeModules"
