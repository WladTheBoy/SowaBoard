export interface ApiRequest {
  url: string
  method: string
  headers: [string, string][]
  body: string | null
}

export interface ApiResponse {
  status: number
  statusText: string
  headers: [string, string][]
  body: string
}
