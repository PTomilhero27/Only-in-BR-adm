// src/modules/excel/utils/download.ts
/**
 * Helper para download de Blob no navegador.
 * Responsabilidade:
 * - Criar URL temporária
 * - Disparar <a download>
 * - Liberar recursos com URL.revokeObjectURL
 */
export function downloadBlobAsFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()

  a.remove()
  URL.revokeObjectURL(url)
}
