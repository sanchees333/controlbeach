# CRIAR_ATALHO.ps1 - Resenha Beach

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

$iconePath  = Join-Path $scriptDir "public\img\logo.ico"
$iniciarBat = Join-Path $scriptDir "INICIAR.bat"
$desktop    = [Environment]::GetFolderPath("Desktop")
$atalhoPath = Join-Path $desktop "Resenha Beach.lnk"

$shell  = New-Object -ComObject WScript.Shell
$atalho = $shell.CreateShortcut($atalhoPath)

$atalho.TargetPath       = $iniciarBat
$atalho.WorkingDirectory = $scriptDir
$atalho.Description      = "Resenha Beach - Sistema de Gestao"
$atalho.WindowStyle      = 1

if (Test-Path $iconePath) {
    $atalho.IconLocation = "$iconePath,0"
    Write-Host "Icone encontrado!" -ForegroundColor Green
} else {
    Write-Warning "Icone nao encontrado em: $iconePath"
}

$atalho.Save()

Write-Host ""
Write-Host "Atalho criado com sucesso!" -ForegroundColor Green
Write-Host "Local : $atalhoPath"        -ForegroundColor Cyan
Write-Host "Icone : $iconePath"         -ForegroundColor Cyan
Write-Host ""
Write-Host "Clique duas vezes no atalho para iniciar o sistema." -ForegroundColor Yellow
Write-Host ""