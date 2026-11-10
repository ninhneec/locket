import { readFileSync } from 'node:fs'
import path from 'node:path'

export type TelegramConfig = {
  enabled: boolean
  botToken: string
  chatId: string
  parseMode: 'HTML' | 'MarkdownV2' | ''
}

const defaults: TelegramConfig = {
  enabled: false,
  botToken: '',
  chatId: '',
  parseMode: 'HTML',
}

function readLocalConfig(): Partial<TelegramConfig> {
  const configPath = path.resolve(process.cwd(), 'config', 'telegram.local.json')

  try {
    return JSON.parse(readFileSync(configPath, 'utf8')) as Partial<TelegramConfig>
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
    if (code !== 'ENOENT') console.warn('[telegram] Không đọc được config/telegram.local.json:', error)
    return {}
  }
}

const localConfig = readLocalConfig()

export const telegramConfig: TelegramConfig = {
  ...defaults,
  ...localConfig,
  enabled: process.env.TELEGRAM_ENABLED
    ? process.env.TELEGRAM_ENABLED === 'true'
    : Boolean(localConfig.enabled),
  botToken: process.env.TELEGRAM_BOT_TOKEN || localConfig.botToken || '',
  chatId: process.env.TELEGRAM_CHAT_ID || localConfig.chatId || '',
}

export function telegramStatus() {
  const configured = Boolean(telegramConfig.botToken && telegramConfig.chatId)
  return {
    enabled: telegramConfig.enabled,
    configured,
    ready: telegramConfig.enabled && configured,
    chatIdHint: telegramConfig.chatId
      ? `${telegramConfig.chatId.slice(0, 3)}***${telegramConfig.chatId.slice(-2)}`
      : '',
  }
}

export async function sendTelegramMessage(text: string) {
  const status = telegramStatus()
  if (!status.ready) throw new Error('Telegram bot chưa được bật hoặc thiếu botToken/chatId.')

  const response = await fetch(
    `https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramConfig.chatId,
        text: text.slice(0, 4096),
        ...(telegramConfig.parseMode ? { parse_mode: telegramConfig.parseMode } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    },
  )

  const body = await response.json().catch(() => null) as { ok?: boolean; description?: string } | null
  if (!response.ok || !body?.ok) {
    throw new Error(body?.description || `Telegram API trả về lỗi ${response.status}.`)
  }

  return { ok: true }
}
