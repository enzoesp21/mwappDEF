# Mirador Waikiki App — Guía de Instalación

## Stack

- **Next.js 14** (App Router)
- **Supabase** (Auth + PostgreSQL + Storage)
- **Tailwind CSS**
- **Vercel**

---

## 1. Configurar Supabase

1. Crear una cuenta en [supabase.com](https://supabase.com)
2. Hacer clic en **New project** y elegir la región más cercana (**South America — São Paulo**)
3. Esperar a que el proyecto se aprovisione (~2 minutos)
4. Anotar los siguientes datos (están en **Settings → API**):
   - **Project URL** — `https://xxxx.supabase.co`
   - **anon/public key** — `eyJxxxx...`

---

## 2. Crear la base de datos

1. En el panel de Supabase, ir a **SQL Editor** (ícono de terminal en el menú lateral)
2. Hacer clic en **New query**
3. Copiar y pegar el contenido completo de `supabase/schema.sql`
4. Ejecutar con **Run** (o `Ctrl+Enter`)
5. Verificar que las tablas se crearon correctamente en **Table Editor**:
   - `profiles`
   - `guides`
   - `exams`
   - `exam_questions`
   - `exam_results`
6. Volver al SQL Editor, crear una nueva query
7. Copiar y pegar el contenido de `supabase/seed.sql`
8. Ejecutar para cargar las 4 guías precargadas con sus exámenes

> El seed es idempotente: se puede ejecutar múltiples veces sin generar duplicados.

---

## 3. Configurar variables de entorno

Crear el archivo `.env.local` en la raíz del proyecto:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
ADMIN_SECRET_KEY=tu-codigo-secreto-admin
```

- `NEXT_PUBLIC_SUPABASE_URL` — la URL del proyecto copiada en el paso 1
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — la clave anon/public copiada en el paso 1
- `ADMIN_SECRET_KEY` — un código secreto que vos elegís (ej.: `mirador-admin-2025`). Lo usarán los administradores al registrarse para obtener rol admin

> `.env.local` está incluido en `.gitignore` y nunca se sube al repositorio.

---

## 4. Instalar dependencias y correr en local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 5. Deploy en Vercel

1. Hacer push del código al repositorio de GitHub
2. Ir a [vercel.com](https://vercel.com) → **New Project** → importar el repositorio
3. Configurar las variables de entorno en Vercel:
   - Ir a **Settings → Environment Variables**
   - Agregar las mismas 3 variables de `.env.local`
4. Hacer clic en **Deploy**

Los deploys subsiguientes son automáticos con cada `git push` a la rama principal.

---

## 6. Crear el primer administrador

1. Navegar a `/register` en la app
2. Completar los datos: nombre, puesto y contraseña
3. Ingresar el **código de administrador** (`ADMIN_SECRET_KEY`) en el campo correspondiente
4. La cuenta queda registrada con `role = 'admin'`

> Los usuarios que se registren sin el código de administrador quedan con `role = 'staff'` por defecto.

---

## Estructura del proyecto

```
├── app/
│   ├── (dashboard)/       # Area del personal (staff)
│   │   ├── guides/        # Listado y lectura de guías
│   │   └── exams/         # Toma de exámenes y resultados
│   ├── admin/             # Panel de administración
│   │   ├── guides/        # CRUD de guías
│   │   ├── exams/         # CRUD de exámenes y preguntas
│   │   └── results/       # Ver resultados de todo el personal
│   ├── login/             # Página de inicio de sesión
│   └── register/          # Página de registro
├── components/
│   ├── admin/             # Componentes del panel admin
│   └── exam/              # Componentes del flujo de examen
├── lib/
│   ├── supabase/          # Clientes de Supabase (server y browser)
│   ├── types.ts           # Tipos TypeScript
│   └── utils.ts           # Funciones utilitarias
├── supabase/
│   ├── schema.sql         # Schema de la BD + RLS + trigger
│   └── seed.sql           # Datos iniciales (guías y exámenes)
└── middleware.ts           # Auth + protección de rutas
```

---

## Notas importantes

- **Seguridad:** el `ADMIN_SECRET_KEY` solo se valida en el servidor (API Route). Nunca se expone al cliente.
- **RLS:** las políticas de Row Level Security garantizan que cada miembro del personal solo puede ver las guías correspondientes a su puesto.
- **Guías universales:** las guías con `puestos: ['todos']` son visibles para todos los empleados sin importar su puesto.
- **Firma digital:** al completar un examen, el empleado firma con el dedo/mouse. La firma se guarda como imagen PNG en base64 en la columna `signature_data` de `exam_results`.
- **Exámenes:** el puntaje de aprobación por defecto es 70%. Cada examen puede tener su propio umbral configurado en la columna `passing_score`.
- **Trigger automático:** cuando un usuario se registra en Supabase Auth, se crea automáticamente su perfil en la tabla `profiles` con los datos ingresados en el formulario de registro.
