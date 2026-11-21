import type { CSSProperties } from 'react'
import { RECUADROS_POR_FILA, type HojaArmada, type SeccionArmada } from '@/lib/plazas'

// La hoja de plazas de los mozos, como la de papel (Enzo, 21/11). Todo en
// milímetros: mide 194 × 281 mm, lo que entra en una A4 con 8 mm de margen.
// Las medidas salen de lib/plazas.ts (armarHoja), que hace que siempre entre.

const MARRON = '#9c6b55'
const LINEA = '0.25mm solid #2b2b2b'
const mm = (n: number) => `${n}mm`

function Seccion({ s, filaMm }: { s: SeccionArmada; filaMm: number }) {
  const letra = Math.min(3.2, filaMm * 0.58)
  const columnas = s.conT ? '10mm 1fr 17mm 17mm 8mm' : '1fr 19mm 19mm'
  const celda: CSSProperties = { borderRight: LINEA, display: 'flex', alignItems: 'center', justifyContent: 'center' }
  return (
    <div style={{ border: LINEA, breakInside: 'avoid' }}>
      <div
        style={{
          height: mm(6.5),
          background: MARRON,
          color: '#fff',
          fontWeight: 600,
          fontSize: mm(3.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: LINEA,
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {s.titulo}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: columnas, height: mm(5.5), fontSize: mm(2.3), fontWeight: 700, borderBottom: LINEA }}>
        {s.conT && <div style={celda} />}
        <div style={celda}>Persona</div>
        <div style={celda}>c/ balcón</div>
        <div style={{ ...celda, borderRight: s.conT ? LINEA : 'none' }}>s/balcón</div>
        {s.conT && <div style={{ ...celda, borderRight: 'none' }}>T</div>}
      </div>
      {s.filas.map((nombre, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: columnas,
            height: mm(filaMm),
            fontSize: mm(letra),
            borderBottom: i === s.filas.length - 1 ? 'none' : LINEA,
          }}
        >
          {s.conT && <div style={celda} />}
          <div style={{ ...celda, overflow: 'hidden', whiteSpace: 'nowrap' }}>{nombre}</div>
          <div style={celda} />
          <div style={{ ...celda, borderRight: s.conT ? LINEA : 'none' }} />
          {s.conT && <div style={{ ...celda, borderRight: 'none' }} />}
        </div>
      ))}
    </div>
  )
}

function Recuadro({ nombre }: { nombre: string | null }) {
  return (
    <div style={{ border: '0.45mm solid #1f1f1f', borderRadius: mm(2.5), height: mm(15), display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        style={{
          height: mm(6),
          background: '#d9d9d9',
          borderBottom: '0.45mm solid #1f1f1f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: mm(3),
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          padding: '0 1mm',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {nombre ?? ''}
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: mm(1.6) }}>
        <div style={{ borderRight: '0.3mm solid #1f1f1f', padding: '0.4mm 0.8mm' }}>Horas</div>
        <div style={{ padding: '0.4mm 0.8mm' }}>Firma</div>
      </div>
    </div>
  )
}

/** La hoja tal cual se imprime. `fecha`: el texto de "Fecha de hoy", o null para dejar la línea. */
export default function HojaPlazas({ hoja, fecha }: { hoja: HojaArmada; fecha: string | null }) {
  const columna = (secciones: SeccionArmada[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: mm(5) }}>
      {secciones.map((s) => (
        <Seccion key={s.clave} s={s} filaMm={hoja.filaMm} />
      ))}
    </div>
  )
  return (
    <div
      className="hoja-plazas"
      style={{
        width: mm(194),
        height: mm(281),
        background: '#fff',
        color: '#111',
        fontFamily: 'var(--font-poppins), Poppins, Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        gap: mm(4),
        overflow: 'hidden',
      }}
    >
      {/* Los bordes van adentro del alto de cada fila: si no, las filas suman de más y se corta el final. */}
      <style>{'.hoja-plazas, .hoja-plazas * { box-sizing: border-box; }'}</style>
      <div style={{ height: mm(24), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: mm(2) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/arranque/logo.png" alt="Mirador Waikiki" style={{ height: mm(14), width: 'auto' }} />
        <div style={{ fontSize: mm(3.6), fontWeight: 600 }}>
          Fecha de hoy:{' '}
          {fecha ? (
            <span style={{ fontWeight: 500 }}>{fecha}</span>
          ) : (
            <span style={{ display: 'inline-block', width: mm(45), borderBottom: '0.3mm dashed #111' }} />
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: mm(8), alignItems: 'start' }}>
        {columna(hoja.izquierda)}
        {columna(hoja.derecha)}
      </div>

      {hoja.recuadros.length > 0 && (
        <div style={{ marginTop: 'auto' }}>
          <div style={{ height: mm(7), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: mm(4) }}>
            Horas del día
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${RECUADROS_POR_FILA}, 1fr)`, gap: mm(2.5) }}>
            {hoja.recuadros.map((n, i) => (
              <Recuadro key={i} nombre={n} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
