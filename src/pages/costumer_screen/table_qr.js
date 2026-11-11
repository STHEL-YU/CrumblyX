export function getTableDestination(value) {
  const qrValue = value.trim()
  if (!qrValue) return null

  try {
    const url = new URL(qrValue)
    if (url.pathname === '/book-table') {
      const id = url.searchParams.get('id')
      if (id) return { type: 'booking', id }
    }

    const table = url.searchParams.get('table')
      || url.searchParams.get('tableNumber')
      || url.searchParams.get('table_number')
    if (table) return { type: 'table', tableName: table.trim() }

    const pathMatch = url.pathname.match(/\/table\/([a-z0-9-]+)\/?$/i)
    if (pathMatch) return { type: 'table', tableName: pathMatch[1] }
  } catch {
  }

  const match = qrValue.match(/^(?:table\s*)?(?:#|:|-)?\s*([a-z0-9 -]{1,50})$/i)
  return match?.[1] ? { type: 'table', tableName: match[1].trim() } : null
}
