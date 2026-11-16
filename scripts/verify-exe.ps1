# Copyright (c) dendr000. MIT License.
# 패키징된 exe 의 파일 정보와 아이콘을 확인한다. ProductName 이 Electron 이면 실패한다.
$root = Split-Path $PSScriptRoot -Parent
$exe = Join-Path $root 'release-packager\Puliteo-win32-x64\Puliteo.exe'
if (-not (Test-Path $exe)) { Write-Host "exe 가 없습니다: $exe" -ForegroundColor Red; exit 1 }

$info = (Get-Item $exe).VersionInfo
$info | Format-List ProductName, FileDescription, CompanyName, OriginalFilename, InternalName, FileVersion
$ok = ($info.ProductName -eq 'Puliteo') -and ($info.FileDescription -eq 'Puliteo')

Add-Type -AssemblyName System.Drawing
$png = Join-Path $env:TEMP 'puliteo-exe-icon.png'
[System.Drawing.Icon]::ExtractAssociatedIcon($exe).ToBitmap().Save($png)
Write-Host "추출한 아이콘: $png"
Write-Host ("exe 수정 시각: " + (Get-Item $exe).LastWriteTime)

if (-not $ok) { Write-Host '파일 정보가 기본값(Electron)으로 남았습니다.' -ForegroundColor Red; exit 1 }
Write-Host '파일 정보 확인 통과' -ForegroundColor Green
