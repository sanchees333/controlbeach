@echo off
title Resenha Beach — Sistema de Gestão
color 0A

echo.
echo  ==========================================
echo   RESENHA BEACH — Iniciando sistema...
echo  ==========================================
echo.

:: Verifica se Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] Node.js nao encontrado!
    echo.
    echo  Instale o Node.js em: https://nodejs.org
    echo  Baixe a versao "LTS" e instale normalmente.
    echo.
    pause
    exit /b 1
)

:: Verifica se as dependências estão instaladas
if not exist "node_modules" (
    echo  Instalando dependencias pela primeira vez...
    echo  Aguarde, isso pode levar alguns minutos.
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  [ERRO] Falha ao instalar dependencias.
        echo  Verifique sua conexao com a internet.
        pause
        exit /b 1
    )
    echo.
    echo  Dependencias instaladas com sucesso!
    echo.
)

:: Cria pasta de dados se não existir
if not exist "data" mkdir data

:: Inicia o servidor em segundo plano
echo  Iniciando servidor...
start /B node src/server.js

:: Aguarda o servidor subir
echo  Aguardando servidor iniciar...
timeout /t 2 /nobreak >nul

:: Abre o navegador
echo  Abrindo sistema no navegador...
start http://localhost:3000

echo.
echo  ==========================================
echo   Sistema rodando em http://localhost:3000
echo   Nao feche esta janela!
echo  ==========================================
echo.
echo  Para encerrar o sistema, feche esta janela
echo  ou pressione Ctrl+C
echo.

:: Mantém a janela aberta e o servidor rodando
node src/server.js
