import dotenv from 'dotenv'
import express from 'express'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sendTelegramMessage, telegramStatus } from './telegram.js'

type JsonObject = Record<string, unknown>

dotenv.config({ path: ['.env.local', '.env'] })

const app = express()
const port = Number(process.env.PORT || 8787)
const config = {
  baseUrl: process.env.JAYDEV_API_BASE_URL || 'https://locket.jayteam.click',
  apiKey: process.env.JAYDEV_API_KEY || '',
  authMode: process.env.JAYDEV_AUTH_MODE || 'x-api-key',
  statsPath: process.env.JAYDEV_STATS_PATH || '/api/v1/credits',
  customersPath: process.env.JAYDEV_CUSTOMERS_PATH || '/api/v1/ctv/customers',
  activatePath: process.env.JAYDEV_ACTIVATE_PATH || '/api/v1/dns/export',
  lookupPath: process.env.JAYDEV_LOOKUP_PATH || '/api/v1/dns/lookup',
  xahApiKey: process.env.XAH_API_KEY || '',
}

app.use(express.json({ limit: '15mb' }))

const demoCustomers = [
  { id: 1082, username: 'linh_dan_2005', displayName: 'Linh Đan', packageName: 'Locket Gold Vĩnh Viễn', createdAt: '04/11/2026, 17:30', status: 'ACTIVE' },
  { id: 1081, username: 'hoang_nam_kpop', displayName: 'Hoàng Nam', packageName: 'Locket Gold 1 Năm', createdAt: '04/11/2026, 16:15', status: 'ACTIVE' },
  { id: 1074, username: 'minhthu.photo', displayName: 'Minh Thư', packageName: 'Locket Gold Vĩnh Viễn', createdAt: '02/11/2026, 09:42', status: 'DISABLED' },
]

function authHeaders() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(config.authMode === 'bearer'
      ? { Authorization: `Bearer ${config.apiKey}` }
      : { 'X-API-Key': config.apiKey }),
  }
}

async function upstream(pathname: string, init?: RequestInit): Promise<JsonObject> {
  if (!config.apiKey) throw new Error('Chưa cấu hình API key.')
  const response = await fetch(`${config.baseUrl}${pathname}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
    signal: AbortSignal.timeout(15_000),
  })
  const body = (await response.json().catch(() => null)) as (JsonObject & { message?: string }) | null
  if (!response.ok) throw new Error(body?.message || `API JayDev trả về lỗi ${response.status}.`)
  if (!body) throw new Error('API JayDev không trả về JSON hợp lệ.')
  return body
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' ? (value as JsonObject) : {}
}

function number(value: unknown): number {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

function normalizeCustomer(rawValue: unknown, index: number) {
  const raw = object(rawValue)
  return {
    id: number(raw.id) || index + 1,
    username: String(raw.locket_username || raw.username || 'unknown'),
    displayName: String(raw.display_name || raw.locket_username || raw.username || 'Khách hàng'),
    packageName: String(raw.package_name || 'Locket Gold VIP'),
    createdAt: String(raw.created_at || ''),
    status: String(raw.status || 'ACTIVE'),
    downloadUrl: raw.download_url ? String(raw.download_url) : undefined,
  }
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const octets = address.split('.').map(Number)
    return octets[0] === 10
      || octets[0] === 127
      || (octets[0] === 169 && octets[1] === 254)
      || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
      || (octets[0] === 192 && octets[1] === 168)
      || octets[0] === 0
  }
  const normalized = address.toLowerCase()
  return normalized === '::1'
    || normalized === '::'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe80:')
}

async function validatePublicEndpoint(value: string): Promise<URL> {
  let endpoint: URL
  try {
    endpoint = new URL(value)
  } catch {
    throw new Error('Endpoint URL không hợp lệ.')
  }
  if (endpoint.protocol !== 'https:') throw new Error('Endpoint phải sử dụng HTTPS.')
  if (endpoint.username || endpoint.password) throw new Error('Endpoint không được chứa thông tin đăng nhập trong URL.')
  if (endpoint.hostname === 'localhost') throw new Error('Không cho phép endpoint nội bộ.')
  const addresses = await lookup(endpoint.hostname, { all: true })
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Endpoint trỏ tới địa chỉ mạng nội bộ và đã bị chặn.')
  }
  return endpoint
}

app.post('/api/image-lab/generate', async (request, response) => {
  const requestId = crypto.randomUUID()
  const requestStartedAt = Date.now()
  let upstreamTimings: JsonObject | undefined
  const logs: Array<{ offsetMs: number; level: 'info' | 'success' | 'error'; stage: string; message: string }> = []
  const addLog = (stage: string, message: string, level: 'info' | 'success' | 'error' = 'info') => {
    const entry = { offsetMs: Date.now() - requestStartedAt, level, stage, message }
    logs.push(entry)
    console.log(`[image-lab][${requestId}][${stage}][${level}] ${message}`)
  }
  const fail = (status: number, message: string, stage: string) => {
    addLog(stage, message, 'error')
    response.status(status).json({ message, requestId, logs, durationMs: Date.now() - requestStartedAt, timings: upstreamTimings })
  }
  const endpointValue = String(request.body?.endpoint || '').trim()
  const model = String(request.body?.model || '').trim()
  const prompt = String(request.body?.prompt || '').trim()
  const size = String(request.body?.size || '1024x1024').trim()
  const n = Math.min(4, Math.max(1, number(request.body?.n) || 1))
  const referenceImage = String(request.body?.referenceImage || '')
  const requestedReferenceField = String(request.body?.referenceField || 'image')
  const referenceEncoding = String(request.body?.referenceEncoding || 'data-url') === 'base64' ? 'base64' : 'data-url'
  const referenceField = ['image', 'image_url', 'reference_image', 'images', 'image_urls'].includes(requestedReferenceField)
    ? requestedReferenceField
    : 'image'
  addLog('client-input', `Đã nhận model ${model || '(trống)'}, prompt ${prompt.length} ký tự, ảnh tham chiếu ${referenceImage ? 'có' : 'không'}.`)

  if (!model || model.length > 300) {
    fail(400, 'Tên model không hợp lệ.', 'validation')
    return
  }
  if (!prompt || prompt.length > 4000) {
    fail(400, 'Prompt phải có từ 1 đến 4000 ký tự.', 'validation')
    return
  }
  if (!/^\d{2,4}x\d{2,4}$/.test(size)) {
    fail(400, 'Kích thước ảnh không hợp lệ.', 'validation')
    return
  }
  if (referenceImage && !/^data:image\/(png|jpe?g|webp);base64,/i.test(referenceImage)) {
    fail(400, 'Ảnh tham chiếu phải là PNG, JPEG hoặc WebP hợp lệ.', 'validation')
    return
  }
  if (referenceImage.length > 14_000_000) {
    fail(413, 'Ảnh tham chiếu vượt quá giới hạn 10 MB.', 'validation')
    return
  }
  addLog('validation', 'Dữ liệu đầu vào hợp lệ.', 'success')

  try {
    const endpoint = await validatePublicEndpoint(endpointValue)
    addLog('endpoint', `Endpoint hợp lệ: ${endpoint.origin}${endpoint.pathname}` , 'success')
    const suppliedKey = String(request.body?.apiKey || '').trim()
    const apiKey = suppliedKey || (endpoint.hostname === 'api.xah.io' ? config.xahApiKey : '')
    if (!apiKey) {
      fail(400, 'Chưa có API key cho endpoint này.', 'authentication')
      return
    }
    addLog('authentication', `Đã tìm thấy API key từ ${suppliedKey ? 'phiên nhập' : 'backend'}; giá trị đã được che.`, 'success')

    const isEditRoute = endpoint.pathname.replace(/\/$/, '').endsWith('/images/edits')
    const isChatRoute = endpoint.pathname.replace(/\/$/, '').endsWith('/chat/completions')
    let requestBody: BodyInit
    let requestHeaders: HeadersInit

    if (isEditRoute) {
      if (!referenceImage) {
        fail(400, 'Route image edit bắt buộc phải có ảnh tham chiếu.', 'image-decode')
        return
      }
      const imageMatch = /^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/is.exec(referenceImage)
      if (!imageMatch) {
        fail(400, 'Không giải mã được ảnh tham chiếu.', 'image-decode')
        return
      }
      const imageBuffer = Buffer.from(imageMatch[2], 'base64')
      if (!imageBuffer.length || imageBuffer.length > 10 * 1024 * 1024) {
        fail(413, 'Ảnh tham chiếu rỗng hoặc vượt quá giới hạn 10 MB.', 'image-decode')
        return
      }
      addLog('image-decode', `Đã giải mã ảnh ${imageMatch[1]}, ${Math.round(imageBuffer.length / 1024)} KB.`, 'success')
      const extension = imageMatch[1].includes('png') ? 'png' : imageMatch[1].includes('webp') ? 'webp' : 'jpg'
      const form = new FormData()
      form.append('model', model)
      form.append('prompt', prompt)
      form.append('n', String(n))
      form.append('size', size)
      form.append('image', new Blob([imageBuffer], { type: imageMatch[1] }), `reference.${extension}`)
      requestBody = form
      requestHeaders = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }
      addLog('request-build', 'Đã tạo multipart/form-data cho route images/edits.', 'success')
    } else if (isChatRoute) {
      const content = referenceImage
        ? [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: referenceImage } },
          ]
        : prompt
      requestBody = JSON.stringify({
        model,
        messages: [{ role: 'user', content }],
        stream: false,
      })
      requestHeaders = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }
      addLog('request-build', 'Đã tạo messages đa phương thức cho route chat/completions với text + image_url.', 'success')
    } else {
      const payload: JsonObject = { model, prompt, n, size }
      const encodedReference = referenceEncoding === 'base64'
        ? referenceImage.replace(/^data:image\/(?:png|jpe?g|webp);base64,/i, '')
        : referenceImage
      if (referenceImage) payload[referenceField] = ['images', 'image_urls'].includes(referenceField) ? [encodedReference] : encodedReference
      requestBody = JSON.stringify(payload)
      requestHeaders = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }
      addLog('request-build', `Đã tạo JSON cho route images/generations${referenceImage ? ` với trường ${referenceField}, encoding ${referenceEncoding}` : ''}.`, 'success')
    }

    addLog('upstream', `Bắt đầu gửi request tới ${endpoint.hostname}.`)
    const upstreamStartedAt = Date.now()
    const upstreamResponse = await fetch(endpoint, {
      method: 'POST',
      headers: requestHeaders,
      body: requestBody,
      signal: AbortSignal.timeout(120_000),
    })
    const upstreamHeadersAt = Date.now()
    addLog('upstream', `Nhận HTTP ${upstreamResponse.status} sau ${upstreamHeadersAt - upstreamStartedAt} ms xử lý.`, upstreamResponse.ok ? 'success' : 'error')
    const contentLength = number(upstreamResponse.headers.get('content-length'))
    if (contentLength > 25 * 1024 * 1024) throw new Error('Phản hồi API vượt quá giới hạn 25 MB.')
    const upstreamBodyStartedAt = Date.now()
    const upstreamText = await upstreamResponse.text()
    const upstreamBodyFinishedAt = Date.now()
    const upstreamBytes = Buffer.byteLength(upstreamText)
    const upstreamDownloadMs = upstreamBodyFinishedAt - upstreamBodyStartedAt
    upstreamTimings = {
      processingMs: upstreamHeadersAt - upstreamStartedAt,
      downloadMs: upstreamDownloadMs,
      responseBytes: upstreamBytes,
      downloadBytesPerSecond: Math.round(upstreamBytes / (Math.max(1, upstreamDownloadMs) / 1000)),
    }
    addLog('upstream-download', `Đã tải ${upstreamBytes} byte trong ${upstreamDownloadMs} ms.`, 'success')
    let result: (JsonObject & { message?: string; error?: unknown }) | null = null
    try {
      result = JSON.parse(upstreamText) as JsonObject & { message?: string; error?: unknown }
    } catch {
      result = null
    }
    if (!upstreamResponse.ok) {
      const errorObject = object(result?.error)
      const message = String(errorObject.message || result?.message || `API ảnh trả về lỗi ${upstreamResponse.status}.`)
      fail(502, message, 'upstream-response')
      return
    }
    if (!result) throw new Error('API ảnh không trả về JSON hợp lệ.')

    const rawImages: unknown[] = []
    if (Array.isArray(result.data)) rawImages.push(...result.data)
    if (Array.isArray(result.images)) rawImages.push(...result.images)
    if (Array.isArray(result.choices)) {
      for (const choiceValue of result.choices) {
        const choice = object(choiceValue)
        const message = object(choice.message)
        if (Array.isArray(message.images)) rawImages.push(...message.images)
        if (Array.isArray(message.content)) {
          for (const partValue of message.content) {
            const part = object(partValue)
            if (part.type === 'image_url' || part.type === 'image' || part.image_url || part.url || part.b64_json) {
              rawImages.push(part)
            }
          }
        } else if (typeof message.content === 'string') {
          const dataImages = message.content.match(/data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/=]+/gi) || []
          const remoteImages = message.content.match(/https?:\/\/[^\s)"']+/g) || []
          rawImages.push(...dataImages, ...remoteImages)
        }
      }
    }
    const images = rawImages.map((item) => {
      if (typeof item === 'string') {
        return item.startsWith('data:image/')
          ? { b64Json: item.slice(item.indexOf(',') + 1) }
          : { url: item }
      }
      const image = object(item)
      const nestedImageUrl = object(image.image_url)
      return {
        url: image.url || (typeof image.image_url === 'string' ? image.image_url : nestedImageUrl.url)
          ? String(image.url || (typeof image.image_url === 'string' ? image.image_url : nestedImageUrl.url))
          : undefined,
        b64Json: image.b64_json || image.base64 ? String(image.b64_json || image.base64) : undefined,
        revisedPrompt: image.revised_prompt ? String(image.revised_prompt) : undefined,
      }
    })
    addLog('response-parse', `Parse thành công ${images.length} ảnh; trường gốc: ${Object.keys(result).join(', ')}.`, 'success')
    response.json({
      images,
      durationMs: Date.now() - requestStartedAt,
      responseKeys: Object.keys(result),
      requestId,
      logs,
      timings: upstreamTimings,
    })
  } catch (error) {
    fail(502, error instanceof Error ? error.message : 'Không gọi được API ảnh.', 'proxy-exception')
  }
})

app.get('/api/portal/dashboard', async (_request, response) => {
  if (!config.apiKey) {
    response.json({ partnerName: 'CTV Demo JayDev', credits: 45, totalPurchased: 200, totalUsed: 155, activeCustomers: 148, customers: demoCustomers, demoMode: true })
    return
  }
  try {
    const statsResult = await upstream(config.statsPath)
    let customersResult: JsonObject = {}
    try {
      customersResult = await upstream(config.customersPath)
    } catch {
      // The current Partner API does not expose a customer-list endpoint.
      // Credit data should remain available even when this optional route is absent.
    }
    const statsData = object(statsResult.data)
    const user = object(statsResult.user)
    const summary = object(customersResult.summary)
    const customersData = object(customersResult.data)
    const rawCustomers = Array.isArray(customersResult.recent_clients)
      ? customersResult.recent_clients
      : Array.isArray(customersData.users)
        ? customersData.users
        : []
    response.json({
      partnerName: String(user.name || statsData.partner_name || statsResult.partner_name || 'CTV JayDev'),
      credits: number(statsResult.credits ?? statsData.remaining_credits ?? summary.remaining_credits),
      totalPurchased: number(summary.total_purchased ?? statsData.allocated_credits ?? statsResult.allocated),
      totalUsed: number(summary.total_used ?? statsData.used_credits ?? statsResult.used),
      activeCustomers: number(summary.active_clients ?? user.active_customers ?? statsData.active_users),
      customers: rawCustomers.map(normalizeCustomer),
      demoMode: false,
    })
  } catch (error) {
    response.status(502).json({ message: error instanceof Error ? error.message : 'Không tải được dữ liệu JayDev.' })
  }
})

app.get('/api/portal/lookup', async (request, response) => {
  const username = String(request.query.username || '').trim().replace(/^@/, '')
  if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username)) {
    response.status(400).json({ message: 'Username không hợp lệ.' })
    return
  }
  if (!config.apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 350))
    response.json({ username, displayName: username.replace(/[._-]/g, ' '), isGold: false })
    return
  }
  try {
    const result = await upstream(`${config.lookupPath}?username=${encodeURIComponent(username)}`)
    response.json({ username: String(result.username || username), displayName: String(result.display_name || result.username || username), isGold: Boolean(result.is_gold) })
  } catch (error) {
    response.status(502).json({ message: error instanceof Error ? error.message : 'Không tra cứu được tài khoản.' })
  }
})

app.post('/api/portal/activate', async (request, response) => {
  const username = String(request.body?.username || '').trim().replace(/^@/, '')
  if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username)) {
    response.status(400).json({ message: 'Username không hợp lệ.' })
    return
  }
  if (!config.apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    response.json({ username, displayName: username.replace(/[._-]/g, ' '), packageName: 'Locket Gold Vĩnh Viễn', downloadUrl: `https://locket.jayteam.click/demo/${encodeURIComponent(username)}`, remainingCredits: 44 })
    return
  }
  try {
    const result = await upstream(config.activatePath, {
      method: 'POST',
      body: JSON.stringify({ locket_username: username }),
    })
    const data = object(result.data)
    response.json({
      username: String(data.username || username),
      displayName: data.display_name ? String(data.display_name) : undefined,
      packageName: String(data.package_name || 'Locket Gold Vĩnh Viễn VIP'),
      downloadUrl: String(data.download_url || ''),
      remainingCredits: number(data.remaining_credits ?? result.remaining_credits),
    })
  } catch (error) {
    response.status(502).json({ message: error instanceof Error ? error.message : 'Kích hoạt thất bại.' })
  }
})

let lastTelegramTestAt = 0

app.get('/api/telegram/status', (_request, response) => {
  response.json(telegramStatus())
})

app.post('/api/telegram/test', async (_request, response) => {
  const now = Date.now()
  if (now - lastTelegramTestAt < 10_000) {
    response.status(429).json({ message: 'Vui lòng chờ 10 giây trước khi gửi thử lại.' })
    return
  }
  lastTelegramTestAt = now

  try {
    await sendTelegramMessage('✅ <b>JayDev Portal</b>\nTelegram bot đã kết nối thành công.')
    response.json({ ok: true, message: 'Đã gửi tin nhắn thử tới Telegram.' })
  } catch (error) {
    response.status(502).json({
      message: error instanceof Error ? error.message : 'Không gửi được tin nhắn Telegram.',
    })
  }
})

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const clientDirectory = path.resolve(currentDirectory, '../dist')
app.use(express.static(clientDirectory))
app.get('/{*path}', (_request, response) => response.sendFile(path.join(clientDirectory, 'index.html')))

app.listen(port, () => {
  console.log(`JayDev portal API đang chạy tại http://localhost:${port}`)
})
