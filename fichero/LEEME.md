# Programa del fichero (PC de la caja)

Manda a la app las fichadas del reloj EP300 Pro. CrossChex las baja del reloj
(con "Control en tiempo real" en Activar y la descarga programada de las 12:30)
y este programa las lee de `CrossChex.mdb` cada minuto y las sube a Supabase.
En la app se ven en el panel de admin → **Fichadas**.

Solo lee la base de CrossChex: no escribe ni borra nada ahí ni en el reloj.

## Archivos

- `sincronizar-fichadas.ps1`: el programa. Windows lo corre cada minuto.
- `instalar.ps1`: lo copia a `C:\FicheroWaikiki`, pide la clave y deja la tarea de Windows.
- `config.ejemplo.json`: la configuración. El instalador arma `config.json` a partir de este.

## Instalar (una sola vez)

1. Correr `supabase/add_fichadas.sql` en Supabase → SQL Editor y copiar la
   **clave del fichero** que aparece al final.
2. En la PC de la caja, copiar esta carpeta `fichero` a cualquier lado (por
   ejemplo, el Escritorio).
3. Clic derecho en `instalar.ps1` → **Ejecutar con PowerShell**. Pide permiso de
   administrador: aceptar.
4. Pegar la clave cuando la pida y apretar Enter.
5. Hace una prueba (la primera vez manda las fichadas del último mes) y, si sale
   bien, deja la tarea **"Fichadas Mirador Waikiki"** en Windows.

Si Windows no deja correrlo ("la ejecución de scripts está deshabilitada"), abrir
PowerShell como administrador y correr:

```
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Desktop\fichero\instalar.ps1"
```

## Si algo falla

- El detalle queda en `C:\FicheroWaikiki\fichero.log`.
- La pantalla Fichadas de la app avisa si la caja dejó de mandar datos o si
  CrossChex no bajó fichadas en horas.
- Para actualizar el programa: volver a correr `instalar.ps1` (conserva la configuración).
- Para sacarlo: `Unregister-ScheduledTask -TaskName "Fichadas Mirador Waikiki"` en
  PowerShell como administrador, y borrar `C:\FicheroWaikiki`.
