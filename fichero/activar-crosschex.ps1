# ============================================================
# Activa solo el "Control en tiempo real" de CrossChex al prender la PC
#
# La PC de la caja se apaga a la noche y CrossChex no recuerda el "Activar":
# sin esto, alguien tiene que abrirlo y apretarlo todos los días. Este
# programa hace lo mismo que la persona:
#   1. abre CrossChex (si no está abierto)
#   2. aprieta OK en el inicio de sesión (ADMIN, contraseña vacía)
#   3. maximiza la ventana (achicada, la barra esconde "Activar")
#   4. hace clic en la pestaña Dispositivos
#   5. busca el grupo "Control en tiempo real" y hace clic en Activar
#   6. minimiza CrossChex
#
# Las pestañas y el botón de la barra de CrossChex no se pueden "apretar"
# desde otro programa, así que se hace clic con el mouse donde están. Dónde
# están se anota una sola vez con la calibración.
#
# Uso (PowerShell como administrador, en esta carpeta):
#   .\activar-crosschex.ps1 -Calibrar   abre CrossChex; hacé clic en Dispositivos y en Activar
#   .\activar-crosschex.ps1             prueba: hace todo solo
#   .\activar-crosschex.ps1 -Instalar   lo deja corriendo solo cada vez que se entra a Windows
#
# Tiene que correr como administrador porque CrossChex corre como
# administrador (Windows no deja que un programa común le haga clic).
# ============================================================

param([switch]$Calibrar, [switch]$Instalar)

$ErrorActionPreference = 'Stop'
$NOMBRE_TAREA = 'Activar CrossChex'
$CARPETA = 'C:\FicheroWaikiki'
$CROSSCHEX = 'C:\Program Files (x86)\Anviz\CrossChex Standard\CrossChex Standard.exe'
$NOMBRE_GRUPO = 'Control en tiempo real'
$archivoCalibracion = Join-Path $CARPETA 'calibracion-crosschex.json'
$archivoLog = Join-Path $CARPETA 'activador.log'

New-Item -ItemType Directory -Path $CARPETA -Force | Out-Null

function Anotar([string]$texto) {
  $linea = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $texto
  Write-Host $linea
  try { Add-Content -Path $archivoLog -Value $linea -Encoding UTF8 } catch { }
}

$yo = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $yo.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host 'Abrí PowerShell como administrador (clic derecho -> Ejecutar como administrador).' -ForegroundColor Red
  exit 1
}

Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class Raton {
  public struct PUNTO { public int X; public int Y; }
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out PUNTO p);
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int tecla);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, UIntPtr e);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int modo);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
'@
# Mismas coordenadas que la automatización de Windows, aunque la pantalla tenga zoom.
[Raton]::SetProcessDPIAware() | Out-Null

$UIA = [System.Windows.Automation.AutomationElement]
$Arbol = [System.Windows.Automation.TreeScope]

function Clic([double]$x, [double]$y) {
  [Raton]::SetCursorPos([int]$x, [int]$y) | Out-Null
  Start-Sleep -Milliseconds 150
  [Raton]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)  # botón izquierdo abajo
  Start-Sleep -Milliseconds 80
  [Raton]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)  # arriba
}

# Pone CrossChex maximizado y al frente. Windows a veces no deja que un programa
# de fondo traiga otra ventana adelante; minimizar y volver a maximizar sí.
function AlFrente([IntPtr]$hwnd) {
  for ($i = 0; $i -lt 3; $i++) {
    [Raton]::ShowWindow($hwnd, 6) | Out-Null  # minimizar
    Start-Sleep -Milliseconds 400
    [Raton]::ShowWindow($hwnd, 3) | Out-Null  # maximizar
    [Raton]::SetForegroundWindow($hwnd) | Out-Null
    Start-Sleep -Seconds 1
    if ([Raton]::GetForegroundWindow() -eq $hwnd) { return }
  }
  Anotar 'Aviso: no pude confirmar que CrossChex quedó al frente; sigo igual.'
}

function ProcesoCrossChex {
  Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $CROSSCHEX } | Select-Object -First 1
}

function VentanasDe([int]$id) {
  $cond = New-Object System.Windows.Automation.PropertyCondition($UIA::ProcessIdProperty, $id)
  @($UIA::RootElement.FindAll($Arbol::Children, $cond))
}

function Buscar($raiz, [string]$clase, [string]$nombre = $null) {
  $cond = New-Object System.Windows.Automation.PropertyCondition($UIA::ClassNameProperty, $clase)
  if ($nombre) {
    $porNombre = New-Object System.Windows.Automation.PropertyCondition($UIA::NameProperty, $nombre)
    $cond = New-Object System.Windows.Automation.AndCondition($cond, $porNombre)
  }
  $encontrado = $raiz.FindFirst($Arbol::Descendants, $cond)
  if ($encontrado -and $encontrado.Current.BoundingRectangle.Width -gt 0) { return $encontrado }
  return $null
}

# La ventana principal ya lista (con la barra de arriba a la vista), o null.
function VentanaPrincipal([int]$id) {
  foreach ($v in VentanasDe $id) {
    if ($v.Current.ClassName -eq 'TFrmMain' -and (Buscar $v 'TdxRibbon')) { return $v }
  }
  return $null
}

# Abre CrossChex si hace falta, pasa el inicio de sesión y lo deja maximizado.
function PrepararCrossChex {
  $p = ProcesoCrossChex
  if (-not $p) {
    Anotar 'Abriendo CrossChex...'
    Start-Process -FilePath $CROSSCHEX -WorkingDirectory (Split-Path $CROSSCHEX)
    for ($i = 0; $i -lt 120 -and -not $p; $i++) { Start-Sleep -Milliseconds 500; $p = ProcesoCrossChex }
    if (-not $p) { throw 'CrossChex no arrancó.' }
  }

  $principal = $null
  $intentos = 0
  $desde = Get-Date
  while (((Get-Date) - $desde).TotalSeconds -lt 120) {
    # Primero el inicio de sesión (ventana TFrmLogin): la principal puede existir
    # atrás mientras está abierto. Su botón OK no se ve desde afuera, solo los dos
    # campos; se hace como una persona: clic en la contraseña (vacía) y Enter.
    $login = VentanasDe $p.Id | Where-Object { $_.Current.ClassName -eq 'TFrmLogin' -and $_.Current.BoundingRectangle.Width -gt 0 } | Select-Object -First 1
    if ($login) {
      if ($intentos -ge 6) { throw 'No pude pasar el inicio de sesión de CrossChex.' }
      $intentos++
      $porClase = New-Object System.Windows.Automation.PropertyCondition($UIA::ClassNameProperty, 'TEdit')
      $clave = @($login.FindAll($Arbol::Descendants, $porClase)) | Where-Object { $_.Current.Name -ne 'ADMIN' } | Select-Object -First 1
      [Raton]::SetForegroundWindow([IntPtr]$login.Current.NativeWindowHandle) | Out-Null
      Start-Sleep -Milliseconds 300
      if ($clave) {
        $r = $clave.Current.BoundingRectangle
        if ($intentos % 2 -eq 1) {
          Clic ($r.X + $r.Width / 2) ($r.Y + $r.Height / 2)
          Start-Sleep -Milliseconds 400
          [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
          Anotar "Inicio de sesión: Enter (intento $intentos)."
        } else {
          # Si con Enter no alcanzó: el OK está a la derecha del campo de contraseña.
          Clic ($r.Right + $r.Width * 0.33) ($r.Y + $r.Height / 2)
          Anotar "Inicio de sesión: clic en OK (intento $intentos)."
        }
      } else {
        [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
        Anotar "Inicio de sesión: Enter sin campo (intento $intentos)."
      }
      Start-Sleep -Seconds 2
      continue
    }
    $principal = VentanaPrincipal $p.Id
    if ($principal) { break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $principal) { throw 'No apareció la ventana principal de CrossChex.' }

  AlFrente ([IntPtr]$principal.Current.NativeWindowHandle)
  return $principal
}

function EsperarGrupo($principal, [int]$segundos) {
  for ($i = 0; $i -lt $segundos * 2; $i++) {
    $g = Buscar $principal 'TdxRibbonGroupBarControl' $NOMBRE_GRUPO
    if ($g) { return $g }
    Start-Sleep -Milliseconds 500
  }
  return $null
}

# Espera un clic del botón izquierdo y devuelve dónde fue.
function EsperarClic {
  while (([Raton]::GetAsyncKeyState(0x01) -band 0x8000) -ne 0) { Start-Sleep -Milliseconds 20 }
  while (([Raton]::GetAsyncKeyState(0x01) -band 0x8000) -eq 0) { Start-Sleep -Milliseconds 20 }
  $punto = New-Object Raton+PUNTO
  [Raton]::GetCursorPos([ref]$punto) | Out-Null
  return $punto
}

# --- Instalar -----------------------------------------------------------------
if ($Instalar) {
  if (-not (Test-Path $archivoCalibracion)) {
    Write-Host 'Primero calibrá: .\activar-crosschex.ps1 -Calibrar' -ForegroundColor Red
    exit 1
  }
  $destino = Join-Path $CARPETA 'activar-crosschex.ps1'
  if ($PSCommandPath -ne $destino) { Copy-Item $PSCommandPath $destino -Force }
  Unblock-File $destino

  # Si CrossChex estaba en el Inicio de Windows, se saca: lo abre este programa
  # (si no, se abrirían dos y pediría permiso de administrador al entrar).
  $inicio = [Environment]::GetFolderPath('Startup')
  Get-ChildItem $inicio -Filter '*CrossChex*' -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "Saqué del Inicio de Windows: $($_.Name) (ahora lo abre este programa)."
  }

  $usuario = "$env:USERDOMAIN\$env:USERNAME"
  $accion = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$destino`"" -WorkingDirectory $CARPETA
  $alEntrar = New-ScheduledTaskTrigger -AtLogOn -User $usuario
  $alEntrar.Delay = 'PT10S'  # que Windows abra lo suyo antes de los clics (Enzo: que no tarde)
  $ajustes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew
  $quien = New-ScheduledTaskPrincipal -UserId $usuario -LogonType Interactive -RunLevel Highest
  Register-ScheduledTask -TaskName $NOMBRE_TAREA -Action $accion -Trigger $alEntrar -Settings $ajustes `
    -Principal $quien -Force | Out-Null
  Write-Host ''
  Write-Host "Listo. Cada vez que $env:USERNAME entre a Windows, en unos segundos se abre CrossChex y se activa solo." -ForegroundColor Green
  Write-Host "Lo que hace queda anotado en $archivoLog"
  exit 0
}

# --- Calibrar -----------------------------------------------------------------
if ($Calibrar) {
  Write-Host ''
  Write-Host 'Calibración: voy a abrir CrossChex maximizado. Cuando aparezca:' -ForegroundColor Green
  Write-Host '  1. hacé clic en la pestaña "Dispositivos"'
  Write-Host '  2. hacé clic en el botón "Activar"'
  Write-Host 'Suena un pitido después de cada clic. Apretá Enter para empezar.'
  Read-Host | Out-Null

  $principal = PrepararCrossChex
  $barra = Buscar $principal 'TdxRibbon'
  $rb = $barra.Current.BoundingRectangle

  Write-Host 'Hacé clic en la pestaña "Dispositivos".'
  $pestana = EsperarClic
  [console]::Beep(880, 150)
  if ($pestana.X -lt $rb.Left -or $pestana.X -gt $rb.Right -or $pestana.Y -lt $rb.Top -or $pestana.Y -gt $rb.Bottom) {
    Write-Host 'Ese clic no fue en la barra de arriba de CrossChex. Volvé a correr la calibración.' -ForegroundColor Red
    exit 1
  }

  # Un doble clic en la pestaña no tiene que contar como el clic en Activar.
  Start-Sleep -Milliseconds 900
  if (-not (EsperarGrupo $principal 5)) {
    Write-Host "No aparece el grupo '$NOMBRE_GRUPO': ¿hiciste clic en Dispositivos? Volvé a correr la calibración." -ForegroundColor Red
    exit 1
  }
  Write-Host 'Pestaña anotada. Ahora hacé clic en "Activar".'

  $activar = EsperarClic
  [console]::Beep(1175, 150)
  # El lugar del grupo se lee recién ahora, con la barra ya acomodada.
  $grupo = EsperarGrupo $principal 3
  $rg = $grupo.Current.BoundingRectangle
  if ($activar.X -lt $rg.Left -or $activar.X -gt $rg.Right -or $activar.Y -lt $rg.Top -or $activar.Y -gt $rg.Bottom) {
    Write-Host "Ese clic no fue dentro de '$NOMBRE_GRUPO'. Volvé a correr la calibración." -ForegroundColor Red
    Write-Host ("Detalle: clic en {0},{1}; el grupo está entre {2},{3} y {4},{5}; la barra entre {6},{7} y {8},{9}." -f `
      $activar.X, $activar.Y, [int]$rg.Left, [int]$rg.Top, [int]$rg.Right, [int]$rg.Bottom, `
      [int]$rb.Left, [int]$rb.Top, [int]$rb.Right, [int]$rb.Bottom)
    exit 1
  }

  # La pestaña, en píxeles desde la esquina de la barra; Activar, como
  # proporción del grupo (así sirve aunque el grupo cambie un poco de tamaño).
  $calibracion = [ordered]@{
    pestanaX = [int]($pestana.X - $rb.Left)
    pestanaY = [int]($pestana.Y - $rb.Top)
    activarX = [math]::Round(($activar.X - $rg.Left) / $rg.Width, 3)
    activarY = [math]::Round(($activar.Y - $rg.Top) / $rg.Height, 3)
  }
  $calibracion | ConvertTo-Json | Set-Content $archivoCalibracion -Encoding UTF8
  Write-Host ''
  Write-Host "Calibrado ($($calibracion | ConvertTo-Json -Compress))." -ForegroundColor Green
  Write-Host 'Ahora probalo: cerrá CrossChex del todo (al lado del reloj, clic derecho -> Salir) y corré .\activar-crosschex.ps1'
  exit 0
}

# --- Activar (lo normal) --------------------------------------------------------
try {
  if (-not (Test-Path $archivoCalibracion)) { throw 'Falta calibrar: .\activar-crosschex.ps1 -Calibrar' }
  $cal = Get-Content $archivoCalibracion -Raw | ConvertFrom-Json

  $principal = PrepararCrossChex
  $grupo = $null
  for ($intento = 1; $intento -le 3 -and -not $grupo; $intento++) {
    $rb = (Buscar $principal 'TdxRibbon').Current.BoundingRectangle
    Clic ($rb.Left + $cal.pestanaX) ($rb.Top + $cal.pestanaY)
    $grupo = EsperarGrupo $principal 5
  }
  if (-not $grupo) { throw "No se pudo abrir la pestaña Dispositivos (no aparece '$NOMBRE_GRUPO')." }

  $rg = $grupo.Current.BoundingRectangle
  Clic ($rg.Left + $cal.activarX * $rg.Width) ($rg.Top + $cal.activarY * $rg.Height)
  Anotar 'Control en tiempo real: Activar.'
  Start-Sleep -Seconds 2

  [Raton]::ShowWindow([IntPtr]$principal.Current.NativeWindowHandle, 6) | Out-Null  # minimizar
  exit 0
} catch {
  Anotar "ERROR: $($_.Exception.Message)"
  exit 1
}
