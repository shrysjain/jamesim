[CmdletBinding()]
param(
    [string]$Repository = (Join-Path $env:USERPROFILE 'OneDrive\Documents\GitHub\jamesim'),
    [string]$PreviewFolder = '',
    [ValidateRange(1024, 65535)][int]$Port = 5187
)

$ErrorActionPreference = 'Stop'
$PreviewBranch = 'robot/1114-all-robots-preview'
if (-not $PreviewFolder) {
    $PreviewFolder = Join-Path (Split-Path -Parent $Repository) 'jamesim-new-robots-preview'
}

function Invoke-Checked([scriptblock]$Command) {
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE. Your local files have been preserved."
    }
}

Get-Command git, node, npx.cmd -ErrorAction Stop | Out-Null
$NodeVersion = Invoke-Checked { node --version }
if ($NodeVersion -notmatch '^v26\.') {
    throw "Jamesim requires Node 26. Current version: $NodeVersion"
}
if (-not (Test-Path $Repository -PathType Container)) {
    throw "Clone folder not found: $Repository. Supply the correct path with -Repository."
}
$Remote = Invoke-Checked { git -C $Repository remote get-url origin }
if ($Remote -notmatch '^(https://github\.com/|git@github\.com:)shrysjain/jamesim(\.git)?/?$') {
    throw "This folder's origin is not shrysjain/jamesim: $Remote"
}
if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
    throw "Port $Port is already in use. Stop the old preview or choose another -Port."
}

Invoke-Checked {
    git -C $Repository fetch origin "refs/heads/${PreviewBranch}:refs/remotes/origin/${PreviewBranch}"
}
if (Test-Path $PreviewFolder) {
    $Root = Invoke-Checked { git -C $PreviewFolder rev-parse --show-toplevel }
    if ((Get-Item $Root).FullName -ne (Get-Item $PreviewFolder).FullName) {
        throw "The preview path is not the root of a Git worktree: $PreviewFolder"
    }
    $Changes = Invoke-Checked { git -C $PreviewFolder status --porcelain }
    if ($Changes) { throw 'The preview has local changes. Save them before updating.' }
    $Branch = Invoke-Checked { git -C $PreviewFolder branch --show-current }
    if ($Branch -and $Branch -ne $PreviewBranch) {
        throw "The preview is on another branch: $Branch"
    }
    Invoke-Checked { git -C $PreviewFolder merge --ff-only "origin/$PreviewBranch" }
} else {
    Invoke-Checked { git -C $Repository worktree add --detach $PreviewFolder "origin/$PreviewBranch" }
}

Push-Location $PreviewFolder
try {
    Invoke-Checked { npx.cmd --yes pnpm@10.20.0 install --frozen-lockfile }
    Write-Host "Preview folder: $PreviewFolder"
    Write-Host "Open http://127.0.0.1:$Port/ and keep this PowerShell window open."
    Invoke-Checked { npx.cmd --yes pnpm@10.20.0 dev --host 127.0.0.1 --port $Port --strictPort --open }
} finally {
    Pop-Location
}
