# ============================================================
# Instala el programa de fichadas en la PC de la caja
#
# 1. Copia el programa a C:\FicheroWaikiki
# 2. Pide la clave del fichero (la que muestra add_fichadas.sql) y arma config.json
# 3. Lo prueba una vez y muestra el resultado
# 4. Deja una tarea de Windows que lo corre cada minuto, aunque nadie inicie
#    sesión, y que sigue después de reiniciar la PC
#
# Se puede correr de nuevo sin problema: actualiza el programa y la tarea, y
# conserva la configuración.
# ============================================================

$ErrorActionPreference = 'Stop'
$NOMBRE_TAREA = 'Fichadas Mirador Waikiki'
$destino = 'C:\FicheroWaikiki'

# Hace falta ser administrador para crear la tarea de Windows.
$yo = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $yo.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host 'Pidiendo permiso de administrador...'
  Start-Process powershell.exe -Verb RunAs -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-NoExit', '-File', "`"$PSCommandPath`"")
  exit
}

$origen = $PSScriptRoot

# Que la ventana no se cierre sola antes de leer el resultado.
function Terminar([int]$codigo) {
  Write-Host ''
  Read-Host 'Apretá Enter para cerrar'
  exit $codigo
}
Write-Host ''
Write-Host '== Fichadas de CrossChex -> app Mirador Waikiki ==' -ForegroundColor Green

# --- 1. Copiar el programa --------------------------------------------------
New-Item -ItemType Directory -Path $destino -Force | Out-Null
if ($origen -ne $destino) {
  Copy-Item (Join-Path $origen 'sincronizar-fichadas.ps1') $destino -Force
  Copy-Item (Join-Path $origen 'config.ejemplo.json') $destino -Force
}
Get-ChildItem $destino -Filter *.ps1 | Unblock-File
$programa = Join-Path $destino 'sincronizar-fichadas.ps1'

# --- 2. Configuración -------------------------------------------------------
$archivoConfig = Join-Path $destino 'config.json'
if (-not (Test-Path $archivoConfig) -and (Test-Path (Join-Path $origen 'config.json'))) {
  Copy-Item (Join-Path $origen 'config.json') $archivoConfig
}
if (Test-Path $archivoConfig) {
  $config = [IO.File]::ReadAllText($archivoConfig, [Text.Encoding]::UTF8) | ConvertFrom-Json
} else {
  $config = [IO.File]::ReadAllText((Join-Path $destino 'config.ejemplo.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
}
if (-not $config.clave -or $config.clave -match 'PEGAR') {
  Write-Host ''
  Write-Host 'Pegá la clave del fichero (la que mostró el SQL en Supabase) y apretá Enter:'
  $clave = (Read-Host).Trim()
  if ($clave.Length -ne 64) {
    Write-Host "La clave tiene que tener 64 caracteres y esta tiene $($clave.Length). Volvé a correr el instalador." -ForegroundColor Red
    Terminar 1
  }
  $config.clave = $clave
}
if (-not (Test-Path $config.baseCrossChex)) {
  Write-Host "No encuentro la base de CrossChex en: $($config.baseCrossChex)" -ForegroundColor Red
  Write-Host 'Corregí "baseCrossChex" en C:\FicheroWaikiki\config.json y volvé a correr el instalador.'
  Terminar 1
}
[IO.File]::WriteAllText($archivoConfig, ($config | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))

# --- 3. Prueba --------------------------------------------------------------
Write-Host ''
Write-Host 'Probando (la primera vez puede tardar un poco: manda las fichadas del último mes)...'
$ps32 = Join-Path $env:WINDIR 'SysWOW64\WindowsPowerShell\v1.0\powershell.exe'
& $ps32 -NoProfile -ExecutionPolicy Bypass -File $programa
if ($LASTEXITCODE -ne 0) {
  Write-Host ''
  Write-Host 'La prueba falló: arriba está el motivo. No se instaló la tarea.' -ForegroundColor Red
  Terminar 1
}
Write-Host 'Prueba OK.' -ForegroundColor Green

# --- 4. Tarea de Windows ----------------------------------------------------
$accion = New-ScheduledTaskAction -Execute $ps32 `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$programa`"" `
  -WorkingDirectory $destino
$cadaMinuto = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$alPrender = New-ScheduledTaskTrigger -AtStartup
$ajustes = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
$usuario = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $NOMBRE_TAREA -Action $accion -Trigger @($cadaMinuto, $alPrender) `
  -Settings $ajustes -Principal $usuario -Force | Out-Null

Write-Host ''
Write-Host "Listo. La tarea '$NOMBRE_TAREA' manda las fichadas nuevas cada minuto." -ForegroundColor Green
Write-Host 'Si algo falla, el detalle queda en C:\FicheroWaikiki\fichero.log'
Terminar 0
