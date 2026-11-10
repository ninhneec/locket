export type Customer = {
  id: number
  username: string
  displayName: string
  packageName: string
  createdAt: string
  status: 'ACTIVE' | 'DISABLED' | 'EXPIRED'
  downloadUrl?: string
}

export type DashboardData = {
  partnerName: string
  credits: number
  totalPurchased: number
  totalUsed: number
  activeCustomers: number
  customers: Customer[]
  demoMode: boolean
}

export type ActivationResult = {
  username: string
  displayName?: string
  packageName: string
  downloadUrl: string
  remainingCredits?: number
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/portal${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = (await response.json().catch(() => null)) as
    | (Record<string, unknown> & { message?: string })
    | null
  if (!response.ok) throw new Error(body?.message || `Máy chủ trả về lỗi ${response.status}.`)
  return body as T
}

export const loadDashboard = () => request<DashboardData>('/dashboard')

export const lookupUsername = (username: string) =>
  request<{ username: string; displayName: string; isGold: boolean }>(
    `/lookup?username=${encodeURIComponent(username)}`,
  )

export const activateCustomer = (username: string) =>
  request<ActivationResult>('/activate', {
    method: 'POST',
    body: JSON.stringify({ username }),
  })
