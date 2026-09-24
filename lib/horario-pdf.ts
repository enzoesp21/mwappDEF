import { jsPDF } from 'jspdf'
import { autoTable, type CellHookData } from 'jspdf-autotable'
import {
  DIAS,
  esFeriado,
  esNoche,
  etiquetaSemana,
  numeroDeDia,
  pintaComoFinde,
  tipoCelda,
  totalesDelSector,
  type DatosHorario,
} from '@/lib/horarios'

/**
 * Arma el PDF del horario con el mismo formato de la planilla que se manda
 * los domingos al grupo: A4 apaisado, un bloque por sector, fin de semana en
 * verde y los totales abajo de cada sector.
 *
 * Solo usa texto y autoTable: nada de html(), que es lo que en jsPDF pasa por
 * DOMPurify.
 */

type RGB = [number, number, number]

const VERDE_OSCURO: RGB = [31, 45, 39]
const VERDE: RGB = [110, 143, 122]
const FIN_DE_SEMANA: RGB = [214, 231, 207]
const LIBRE: RGB = [236, 232, 222]
const VACACIONES: RGB = [219, 234, 254]
const LICENCIA: RGB = [254, 243, 199]
const MIRADOR_9: RGB = [237, 233, 254]
const NOCHE: RGB = [196, 216, 202]
const BLANCO: RGB = [255, 255, 255]
const TEXTO: RGB = [31, 45, 39]
const GRIS: RGB = [106, 125, 114]

function fondoDeCelda(valor: string, dia: number, finde: boolean): RGB {
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
      if (esNoche(valor, dia)) return NOCHE
      return finde ? FIN_DE_SEMANA : BLANCO
    default:
      return finde ? FIN_DE_SEMANA : BLANCO
  }
}

export function nombreDelArchivo(lunes: string): string {
  return 'Horarios MW ' + etiquetaSemana(lunes) + '.pdf'
}

export function generarPDFHorario(datos: DatosHorario, lunes: string): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const anchoPagina = doc.internal.pageSize.getWidth()
  const altoPagina = doc.internal.pageSize.getHeight()
  const margen = 10
  const titulo = 'HORARIOS DEL ' + etiquetaSemana(lunes).toUpperCase()

  function encabezadoDePagina() {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...VERDE_OSCURO)
    doc.text(titulo, margen, 13)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GRIS)
    doc.text('Mirador Waikiki', anchoPagina - margen, 13, { align: 'right' })
  }

  // Sábado, domingo y feriados van en verde, como en la planilla.
  const findes = DIAS.map((_, i) => pintaComoFinde(datos, i))
  const encabezadoDias = DIAS.map(
    (d, i) => d.toUpperCase() + ' ' + numeroDeDia(lunes, i) + (esFeriado(datos, i) ? '\nFERIADO' : '')
  )
  // Alto real de una fila con letra de 6.8 y 0.5 mm de relleno vertical.
  const altoFila = 3.8
  // Anchos fijos: si no, cada sector se acomoda solo y no se alinean entre sí.
  const anchoNombre = 42
  const anchoDia = (anchoPagina - 2 * margen - anchoNombre) / 7
  let y = 18

  for (const sector of datos.sectores) {
    if (sector.personas.length === 0) continue

    // Un sector no se parte entre dos hojas si entra entero en la siguiente.
    const altoSector = (sector.personas.length + 2) * altoFila + 2.5
    if (y + altoSector > altoPagina - 14 && altoSector < altoPagina - 30) {
      doc.addPage()
      y = 18
    }

    const totales = totalesDelSector(sector)
    autoTable(doc, {
      startY: y,
      // Arriba queda lugar para el título, que se dibuja al final en cada hoja.
      margin: { top: 18, left: margen, right: margen, bottom: 12 },
      theme: 'grid',
      head: [[sector.nombre.toUpperCase(), ...encabezadoDias]],
      body: sector.personas.map((p) => [p.nombre, ...p.dias.map((c) => c || '')]),
      foot: [
        [
          'Total personal',
          ...totales.map((t) => (t.noche > 0 ? t.total + ' (' + t.noche + ' noche)' : String(t.total))),
        ],
      ],
      styles: {
        font: 'helvetica',
        fontSize: 6.8,
        cellPadding: { top: 0.5, bottom: 0.5, left: 1, right: 1 },
        overflow: 'linebreak',
        halign: 'center',
        valign: 'middle',
        textColor: TEXTO,
        lineColor: [202, 184, 146],
        lineWidth: 0.15,
        minCellHeight: altoFila,
      },
      headStyles: {
        fillColor: VERDE_OSCURO,
        textColor: BLANCO,
        fontStyle: 'bold',
        fontSize: 7,
      },
      footStyles: {
        fillColor: [243, 239, 228],
        textColor: GRIS,
        fontStyle: 'bold',
        fontSize: 7,
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
          if (data.section === 'head') data.cell.styles.halign = 'left'
          return
        }
        const dia = col - 1
        if (data.section === 'head' && findes[dia]) {
          data.cell.styles.fillColor = VERDE
        }
        if (data.section === 'body') {
          const valor = String(data.cell.raw ?? '')
          data.cell.styles.fillColor = fondoDeCelda(valor, dia, findes[dia])
          if (tipoCelda(valor) !== 'turno') data.cell.styles.textColor = GRIS
          if (esNoche(valor, dia)) data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    // lastAutoTable lo agrega el plugin al documento.
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2.5
  }

  // Referencias al final, como en la planilla.
  const referencias: [string, RGB][] = [
    ['Turno', BLANCO],
    ['Finde o feriado', FIN_DE_SEMANA],
    ['Hace noche', NOCHE],
    ['Libre (X)', LIBRE],
    ['Vacaciones', VACACIONES],
    ['Licencia', LICENCIA],
    ['Mirador 9', MIRADOR_9],
  ]
  if (y > altoPagina - 16) {
    doc.addPage()
    y = 18
  }
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRIS)
  doc.text('Referencias', margen, y + 3)
  let x = margen + 20
  doc.setFont('helvetica', 'normal')
  for (const [etiqueta, color] of referencias) {
    doc.setFillColor(...color)
    doc.setDrawColor(202, 184, 146)
    doc.rect(x, y + 0.6, 3.2, 3.2, 'FD')
    doc.text(etiqueta, x + 4.5, y + 3)
    x += doc.getTextWidth(etiqueta) + 12
  }

  // Título y numeración en todas las hojas.
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    encabezadoDePagina()
    doc.setFontSize(7)
    doc.setTextColor(...GRIS)
    doc.text('Hoja ' + i + ' de ' + total, anchoPagina - margen, altoPagina - 6, { align: 'right' })
  }

  return doc
}
