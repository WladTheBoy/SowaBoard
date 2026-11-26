import type { ApiResponse } from '../shared/api'
import { isRecord } from '../shared/guards'

export const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3000'

const allowedMethods = new Set(['GET', 'POST', 'PATCH', 'DELETE'])
const allowedHeaders = new Set(['accept', 'authorization', 'content-type'])

export async function forwardApiRequest(input: unknown): Promise<ApiResponse> {
  if (
    !isRecord(input) ||
    typeof input.url !== 'string' ||
    typeof input.method !== 'string' ||
    !allowedMethods.has(input.method) ||
    !Array.isArray(input.headers) ||
    (input.body !== null && typeof input.body !== 'string')
  ) {
    throw new Error('Ungültige API-Anfrage.')
  }

  const url = new URL(input.url)
  const baseUrl = new URL(apiBaseUrl)
  const requestHeaders: [string, string][] = []
  for (const header of input.headers) {
    if (
      !Array.isArray(header) ||
      header.length !== 2 ||
      typeof header[0] !== 'string' ||
      typeof header[1] !== 'string' ||
      !allowedHeaders.has(header[0].toLowerCase())
    ) {
      throw new Error('Die API-Anfrage ist nicht erlaubt.')
    }
    requestHeaders.push([header[0], header[1]])
  }

  if (url.origin !== baseUrl.origin || url.username || url.password) {
    throw new Error('Die API-Anfrage ist nicht erlaubt.')
  }

  const headers = new Headers(requestHeaders)
  const response = await fetch(url, {
    method: input.method,
    headers,
    ...(input.body === null ? {} : { body: input.body })
  })

  return {
    status: response.status,
    statusText: response.statusText,
    headers: Array.from(response.headers.entries()),
    body: await response.text()
  }
}
