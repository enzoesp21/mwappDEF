import { jsPDF } from 'jspdf'
import { autoTable, type CellHookData } from 'jspdf-autotable'
import {
  DIAS,
  esFeriado,
  esNoche,
  etiquetaSemana,
  numeroDeDia,
  diasConNoche,
  pintaComoFinde,
  tipoCelda,
  totalesDelSector,
  type DatosHorario,
} from '@/lib/horarios'

/**
 * Arma el PDF del horario para mandar al grupo: A4 apaisado, con una franja
 * arriba en el color del logo y el logo en blanco, un bloque por sector y los
 * totales abajo de cada uno. Los colores de las celdas son los mismos de la
 * app (fin de semana en verde, libres, vacaciones, noche...).
 *
 * Solo usa texto, rectángulos, una imagen y autoTable: nada de html(), que es
 * lo que en jsPDF pasa por DOMPurify.
 */

type RGB = [number, number, number]

// El verde azulado del logo.
const LOGO: RGB = [93, 136, 139]
const LOGO_OSCURO: RGB = [52, 86, 89]
const VERDE: RGB = [110, 143, 122]
const FIN_DE_SEMANA: RGB = [214, 231, 207]
const LIBRE: RGB = [236, 232, 222]
const VACACIONES: RGB = [219, 234, 254]
const LICENCIA: RGB = [254, 243, 199]
const MIRADOR_9: RGB = [237, 233, 254]
const NOCHE: RGB = [196, 216, 202]
const BLANCO: RGB = [255, 255, 255]
const CREMA: RGB = [245, 241, 231]
const LINEA: RGB = [226, 218, 200]
const TEXTO: RGB = [31, 45, 39]
const GRIS: RGB = [106, 125, 114]

/** Proporción del logo recortado (public/logo-blanco.png): 340 × 270. */
const LOGO_ANCHO_SOBRE_ALTO = 340 / 270

function fondoDeCelda(valor: string, finde: boolean, hayNoche: boolean): RGB {
  switch (tipoCelda(valor)) {
    case 'libre':
      return LIBRE
    case 'vacaciones':
      return VACACIONES
    case 'licencia':
      return LICENCIA
    case 'otro_lugar':
      return MIRADOR_9
    case 'turno':
      if (esNoche(valor, hayNoche)) return NOCHE
      return finde ? FIN_DE_SEMANA : BLANCO
    default:
      return finde ? FIN_DE_SEMANA : BLANCO
  }
}

export function nombreDelArchivo(lunes: string): string {
  return 'Horarios MW ' + etiquetaSemana(lunes) + '.pdf'
}

/**
 * El logo en blanco, como data URL, para la franja de arriba. Si no se puede
 * leer, el PDF sale igual sin logo: no vale la pena frenar la descarga.
 */
export async function cargarLogo(): Promise<string | null> {
  try {
    const res = await fetch('/logo-blanco.png')
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const lector = new FileReader()
      lector.onload = () => resolve(typeof lector.result === 'string' ? lector.result : null)
      lector.onerror = () => resolve(null)
      lector.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

const REFERENCIAS: [string, RGB][] = [
  ['Turno', BLANCO],
  ['Finde o feriado', FIN_DE_SEMANA],
  ['Hace noche', NOCHE],
  ['Libre (X)', LIBRE],
  ['Vacaciones', VACACIONES],
  ['Licencia', LICENCIA],
  ['Mirador 9', MIRADOR_9],
]

export function generarPDFHorario(datos: DatosHorario, lunes: string, logo: string | null = null): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const anchoPagina = doc.internal.pageSize.getWidth()
  const altoPagina = doc.internal.pageSize.getHeight()
  const margen = 10
  const semana = 'Semana del ' + etiquetaSemana(lunes)

  // La primera hoja lleva la franja grande; las demás, una más finita.
  const altoFranja = 27
  const altoFranjaChica = 13
  const inicioPrimera = altoFranja + 7
  const inicioResto = altoFranjaChica + 6
  const limiteAbajo = altoPagina - 13

  function franjaGrande() {
    doc.setFillColor(...LOGO)
    doc.rect(0, 0, anchoPagina, altoFranja, 'F')
    let x = margen
    if (logo) {
      const alto = 20
      doc.addImage(logo, 'PNG', margen, (altoFranja - alto) / 2, alto * LOGO_ANCHO_SOBRE_ALTO, alto, 'logo', 'SLOW')
      x += alto * LOGO_ANCHO_SOBRE_ALTO + 6
      // Separador fino entre el logo y el título.
      doc.setDrawColor(...BLANCO)
      doc.setLineWidth(0.3)
      doc.line(x - 3, 7, x - 3, altoFranja - 7)
    }
    doc.setTextColor(...BLANCO)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.text('HORARIOS', x, 14.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(semana, x, 21)

    // Referencias a la derecha, dentro de la franja.
    doc.setFontSize(7.5)
    const anchos = REFERENCIAS.map(([t]) => doc.getTextWidth(t))
    const total = anchos.reduce((a, b) => a + b, 0) + REFERENCIAS.length * 4.2 + (REFERENCIAS.length - 1) * 4
    let rx = anchoPagina - margen - total
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.text('REFERENCIAS', rx, 13)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setDrawColor(...BLANCO)
    doc.setLineWidth(0.25)
    REFERENCIAS.forEach(([t, color], i) => {
      doc.setFillColor(...color)
      doc.rect(rx, 16.4, 3.2, 3.2, 'FD')
      doc.text(t, rx + 4.2, 19)
      rx += 4.2 + anchos[i] + 4
    })
  }

  function franjaChica() {
    doc.setFillColor(...LOGO)
    doc.rect(0, 0, anchoPagina, altoFranjaChica, 'F')
    let x = margen
    if (logo) {
      const alto = 9
      doc.addImage(logo, 'PNG', margen, (altoFranjaChica - alto) / 2, alto * LOGO_ANCHO_SOBRE_ALTO, alto, 'logo', 'SLOW')
      x += alto * LOGO_ANCHO_SOBRE_ALTO + 4
    }
    doc.setTextColor(...BLANCO)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('HORARIOS', x, 8.3)
    const anchoTitulo = doc.getTextWidth('HORARIOS')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(semana, x + anchoTitulo + 4, 8.3)
  }

  // Sábado, domingo y feriados van en verde, como en la planilla.
  const findes = DIAS.map((_, i) => pintaComoFinde(datos, i))
  // Días con servicio de noche: quien cierra esos días, hace noche.
  const noches = diasConNoche(datos)
  const encabezadoDias = DIAS.map(
    (d, i) => d.toUpperCase() + ' ' + numeroDeDia(lunes, i) + (esFeriado(datos, i) ? ' · FERIADO' : '')
  )
  // Alto real de una fila: letra de 7.4 pt (2.6 mm × 1.15 de interlineado)
  // más 0.8 mm de relleno arriba y abajo. El encabezado y el total, con letra
  // de 7.8, dan un poco más.
  const altoFila = 4.6
  const altoEncabezado = 4.8
  // Anchos fijos: si no, cada sector se acomoda solo y no se alinean entre sí.
  const anchoNombre = 44
  const anchoDia = (anchoPagina - 2 * margen - anchoNombre) / 7
  let y = inicioPrimera

  for (const sector of datos.sectores) {
    const personas = sector.personas.filter((p) => p.nombre.trim() || p.dias.some((d) => d.trim()))
    if (personas.length === 0) continue

    // Un sector no se parte entre dos hojas: si no entra en lo que queda,
    // arranca en la siguiente. Solo se parte si ni siquiera entra en una hoja.
    const altoSector = personas.length * altoFila + 2 * altoEncabezado + 1
    if (y + altoSector > limiteAbajo && altoSector <= limiteAbajo - inicioResto) {
      doc.addPage()
      y = inicioResto
    }

    const totales = totalesDelSector({ ...sector, personas }, noches)
    autoTable(doc, {
      startY: y,
      margin: { top: inicioResto, left: margen, right: margen, bottom: 13 },
      theme: 'grid',
      // El nombre del sector va en la primera celda, sobre el color del logo.
      head: [[sector.nombre.toUpperCase(), ...encabezadoDias]],
      body: personas.map((p) => [p.nombre, ...p.dias.map((c) => c || '')]),
      foot: [
        [
          'Trabajan',
          ...totales.map((t) => (t.noche > 0 ? t.total + '  (' + t.noche + ' noche)' : String(t.total))),
        ],
      ],
      styles: {
        font: 'helvetica',
        fontSize: 7.4,
        cellPadding: { top: 0.8, bottom: 0.8, left: 2, right: 2 },
        overflow: 'linebreak',
        halign: 'center',
        valign: 'middle',
        textColor: TEXTO,
        lineColor: LINEA,
        lineWidth: 0.1,
        minCellHeight: altoFila,
      },
      headStyles: {
        fillColor: CREMA,
        textColor: LOGO_OSCURO,
        fontStyle: 'bold',
        fontSize: 7.8,
      },
      footStyles: {
        fillColor: CREMA,
        textColor: LOGO_OSCURO,
        fontStyle: 'bold',
        fontSize: 7.8,
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: anchoNombre, fontStyle: 'bold' },
        ...Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i + 1, { cellWidth: anchoDia }])),
      },
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      didParseCell: (data: CellHookData) => {
        const col = data.column.index
        if (col === 0) {
          if (data.section === 'head') {
            data.cell.styles.halign = 'left'
            data.cell.styles.fillColor = LOGO
            data.cell.styles.textColor = BLANCO
            data.cell.styles.fontSize = 8.8
          }
          if (data.section === 'foot') data.cell.styles.textColor = GRIS
          return
        }
        const dia = col - 1
        if (data.section === 'head' && findes[dia]) {
          data.cell.styles.fillColor = VERDE
          data.cell.styles.textColor = BLANCO
        }
        if (data.section === 'body') {
          const valor = String(data.cell.raw ?? '')
          data.cell.styles.fillColor = fondoDeCelda(valor, findes[dia], noches[dia])
          if (tipoCelda(valor) !== 'turno') data.cell.styles.textColor = GRIS
          if (esNoche(valor, noches[dia])) data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    // lastAutoTable lo agrega el plugin al documento.
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5.5
  }

  // Franja y pie en todas las hojas.
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    if (i === 1) franjaGrande()
    else franjaChica()
    doc.setDrawColor(...LOGO)
    doc.setLineWidth(0.3)
    doc.line(margen, altoPagina - 9, anchoPagina - margen, altoPagina - 9)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...GRIS)
    doc.text('Mirador Waikiki · ' + semana, margen, altoPagina - 5)
    doc.text('Hoja ' + i + ' de ' + total, anchoPagina - margen, altoPagina - 5, { align: 'right' })
  }

  return doc
}
