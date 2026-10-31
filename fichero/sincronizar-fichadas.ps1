# ============================================================
# Fichadas de CrossChex -> app de Mirador Waikiki
#
# Corre en la PC de la caja. Lee la base de CrossChex (CrossChex.mdb) y manda
# a Supabase las fichadas nuevas. Windows lo corre solo cada minuto (lo deja
# programado instalar.ps1); también se puede correr a mano para probar.
#
# Solo LEE la base de CrossChex: no escribe ni borra nada ahí ni en el reloj.
# La configuración está en config.json, en esta misma carpeta.
#
# Necesita PowerShell de 32 bits (el lector de bases Access que trae Windows,
# "Jet", es de 32 bits). Si se abre con el de 64, se vuelve a lanzar solo.
# ============================================================

$ErrorActionPreference = 'Stop'
$VERSION = '2'
# Ojo: PowerShell no distingue mayúsculas, $TANDA y $tanda son la misma variable.
$TANDA = 500

# --- PowerShell de 32 bits --------------------------------------------------
if ([IntPtr]::Size -ne 4) {
  $ps32 = Join-Path $env:WINDIR 'SysWOW64\WindowsPowerShell\v1.0\powershell.exe'
  & $ps32 -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath
  exit $LASTEXITCODE
}

$carpeta = $PSScriptRoot
$archivoLog = Join-Path $carpeta 'fichero.log'
$archivoPersonas = Join-Path $carpeta 'personas.hash'

function Anotar([string]$texto) {
  $linea = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $texto
  Write-Host $linea
  try {
    if ((Test-Path $archivoLog) -and (Get-Item $archivoLog).Length -gt 1MB) {
      Move-Item $archivoLog "$archivoLog.anterior" -Force
    }
    Add-Content -Path $archivoLog -Value $linea -Encoding UTF8
  } catch { }
}

# --- Configuración ----------------------------------------------------------
$archivoConfig = Join-Path $carpeta 'config.json'
if (-not (Test-Path $archivoConfig)) {
  Anotar "Falta config.json en $carpeta"
  exit 1
}
$config = [IO.File]::ReadAllText($archivoConfig, [Text.Encoding]::UTF8) | ConvertFrom-Json
foreach ($campo in 'supabaseUrl', 'supabaseAnonKey', 'clave', 'baseCrossChex') {
  if (-not $config.$campo -or "$($config.$campo)" -match 'PEGAR') {
    Anotar "Falta completar '$campo' en config.json"
    exit 1
  }
}
$diasHaciaAtras = 35
if ($config.diasHaciaAtras) { $diasHaciaAtras = [int]$config.diasHaciaAtras }

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$urlRpc = $config.supabaseUrl.TrimEnd('/') + '/rest/v1/rpc/registrar_fichadas'
$encabezados = @{
  apikey        = $config.supabaseAnonKey
  Authorization = 'Bearer ' + $config.supabaseAnonKey
}

# Llama a registrar_fichadas. Devuelve la respuesta, o corta con el mensaje
# de la base si algo sale mal (por ejemplo, la clave del fichero).
function Enviar($fichadas, $personas, $info) {
  $cuerpo = @{
    p_token    = $config.clave
    p_fichadas = $fichadas
    p_personas = $personas
    p_info     = $info
  } | ConvertTo-Json -Depth 5 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($cuerpo)
  try {
    return Invoke-RestMethod -Method Post -Uri $urlRpc -Headers $encabezados `
      -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 30
  } catch {
    $detalle = $_.Exception.Message
    $resp = $_.Exception.Response
    if ($resp) {
      try {
        $lector = New-Object IO.StreamReader($resp.GetResponseStream())
        $texto = $lector.ReadToEnd()
        $json = $texto | ConvertFrom-Json
        if ($json.message) { $detalle = $json.message } else { $detalle = $texto }
      } catch { }
    }
    throw "Supabase no aceptó el envío: $detalle"
  }
}

function Texto($valor) {
  if ($valor -is [DBNull] -or $null -eq $valor) { return '' }
  return "$valor".Trim()
}

function Hora([datetime]$fecha) {
  return $fecha.ToString('yyyy-MM-dd HH:mm:ss', [Globalization.CultureInfo]::InvariantCulture)
}

# --- Lectura de CrossChex ---------------------------------------------------
$conexion = $null

function Consultar([string]$sql, [object[]]$parametros = @()) {
  $comando = $conexion.CreateCommand()
  $comando.CommandText = $sql
  foreach ($p in $parametros) { [void]$comando.Parameters.Add($p) }
  $tabla = New-Object Data.DataTable
  (New-Object Data.OleDb.OleDbDataAdapter($comando)).Fill($tabla) | Out-Null
  # La coma evita que PowerShell desarme la tabla en filas sueltas.
  return , $tabla
}

$info = @{ version = $VERSION; equipo = $env:COMPUTERNAME; ultima = $null; error = $null }
$personas = $null
$hashPersonas = $null
$maxLogid = $null

try {
  if (-not (Test-Path $config.baseCrossChex)) {
    throw "No encuentro la base de CrossChex en $($config.baseCrossChex)"
  }
  # Solo lectura y sin trabar a CrossChex, que la tiene abierta. Si ese modo
  # no lo acepta, se abre compartida común (igual solo se hacen SELECT).
  $origen = "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$($config.baseCrossChex);"
  try {
    $conexion = New-Object Data.OleDb.OleDbConnection($origen + 'Mode=Read|Share Deny None;')
    $conexion.Open()
  } catch {
    $conexion = New-Object Data.OleDb.OleDbConnection($origen + 'Mode=Share Deny None;')
    $conexion.Open()
  }

  $resumen = (Consultar 'SELECT MAX(Logid) AS ultimo, MAX(CheckTime) AS hora FROM Checkinout').Rows[0]
  if ($resumen.ultimo -isnot [DBNull]) { $maxLogid = [long]$resumen.ultimo }
  if ($resumen.hora -isnot [DBNull]) { $info.ultima = Hora $resumen.hora }

  # Nombres y sectores. Se mandan solo si cambiaron desde la última vez.
  $filas = Consultar 'SELECT u.userid, u.Name, d.DeptName FROM Userinfo AS u LEFT JOIN Dept AS d ON u.Deptid = d.Deptid'
  $lista = New-Object Collections.ArrayList
  foreach ($f in ($filas.Rows | Sort-Object { Texto $_.userid })) {
    $u = Texto $f.userid
    if ($u) { [void]$lista.Add([ordered]@{ u = $u; n = (Texto $f.Name); s = (Texto $f.DeptName) }) }
  }
  $jsonPersonas = ConvertTo-Json -InputObject $lista -Compress
  $sha = [Security.Cryptography.SHA256]::Create()
  $hashPersonas = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($jsonPersonas)))
  $hashAnterior = ''
  if (Test-Path $archivoPersonas) { $hashAnterior = "$(Get-Content $archivoPersonas -Raw)".Trim() }
  if ($hashPersonas -ne $hashAnterior) { $personas = $lista }
} catch {
  $info.error = "$($_.Exception.Message)"
}

# --- Envío ------------------------------------------------------------------
try {
  # Primero avisa que está vivo (y manda los nombres si cambiaron). La
  # respuesta dice hasta qué fichada ya tiene la app.
  $respuesta = Enviar @() $personas $info
  if ($personas) { Set-Content -Path $archivoPersonas -Value $hashPersonas }
  if ($info.error) { throw $info.error }

  $hasta = [long]$respuesta.ultimo_logid
  if ($null -ne $maxLogid -and $maxLogid -lt $hasta) {
    $info.error = "La base de CrossChex tiene menos fichadas que la app (último $maxLogid, la app va por $hasta). ¿Se cambió o se restauró la base?"
    Enviar @() $null $info | Out-Null
    throw $info.error
  }

  $desde = (Get-Date).Date.AddDays(-$diasHaciaAtras)
  $total = 0
  do {
    $pLogid = New-Object Data.OleDb.OleDbParameter('@logid', [Data.OleDb.OleDbType]::Integer)
    $pLogid.Value = [int]$hasta
    $pDesde = New-Object Data.OleDb.OleDbParameter('@desde', [Data.OleDb.OleDbType]::Date)
    $pDesde.Value = $desde
    $filas = Consultar ("SELECT TOP $TANDA Logid, userid, CheckTime, CheckType, Sensorid FROM Checkinout " +
      'WHERE Logid > ? AND CheckTime >= ? ORDER BY Logid') @($pLogid, $pDesde)
    if ($filas.Rows.Count -eq 0) { break }

    $lote = New-Object Collections.ArrayList
    foreach ($f in $filas.Rows) {
      $tipo = 0; if ($f.CheckType -isnot [DBNull]) { $tipo = [int]$f.CheckType }
      $disp = $null; if ($f.Sensorid -isnot [DBNull]) { $disp = [int]$f.Sensorid }
      [void]$lote.Add([ordered]@{ id = [long]$f.Logid; u = (Texto $f.userid); t = (Hora $f.CheckTime); k = $tipo; d = $disp })
    }
    $respuesta = Enviar $lote $null $info
    $total += [int]$respuesta.nuevas
    $hasta = [long]$respuesta.ultimo_logid
  } while ($filas.Rows.Count -eq $TANDA)

  if ($total -gt 0) { Anotar "Mandadas $total fichadas nuevas (hasta la $hasta)." }
  if ($personas) { Anotar "Actualizados nombres y sectores ($($personas.Count) personas)." }
  exit 0
} catch {
  Anotar "ERROR: $($_.Exception.Message)"
  exit 1
} finally {
  if ($conexion) { $conexion.Close() }
}
