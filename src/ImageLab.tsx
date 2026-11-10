import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle,
  Copy,
  Eye,
  EyeSlash,
  ImageSquare,
  Lightning,
  Plus,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react'

type Target = {
  id: string
  name: string
  endpoint: string
  model: string
  apiKey: string
}

type GeneratedImage = {
  url?: string
  b64Json?: string
  revisedPrompt?: string
}

type DiagnosticLog = {
  offsetMs: number
  level: 'info' | 'success' | 'error'
  stage: string
  message: string
}

type PerformanceTimings = {
  clientUploadMs?: number
  clientUploadBytes?: number
  clientUploadBytesPerSecond?: number
  upstreamProcessingMs?: number
  upstreamDownloadMs?: number
  upstreamResponseBytes?: number
  upstreamDownloadBytesPerSecond?: number
  clientDownloadMs?: number
  clientDownloadBytes?: number
  clientDownloadBytesPerSecond?: number
}

type RunResult = {
  status: 'idle' | 'loading' | 'success' | 'error'
  images: GeneratedImage[]
  durationMs?: number
  error?: string
  responseKeys?: string[]
  startedAt?: number
  requestId?: string
  logs?: DiagnosticLog[]
  timings?: PerformanceTimings
}

const createTarget = (index: number): Target => ({
  id: crypto.randomUUID(),
  name: [
    'XAH Qwen Image 3 Pro',
    'XAH Nano Banana Pro',
    'XAH Nano Banana 2',
    'GPT Image 2.5 · Daongocson',
    'GPT Image 2.5 · Cuzem3',
    'Gemini Image Base',
    'Seedream 4.5',
    'Qwen Image Max · Filter Edit',
    'Nano Banana 2 · Direct',
    'Gemini 3.1 Flash Image · Chat',
    'Gemini Image Pro',
    'Gemini 3.1 Flash Image · Generate',
    'GPT Image 2.5 Flare',
    'GPT Image 1.5',
    'GPT Image 2.5',
  ][index - 1] || `Cấu hình ${index}`,
  endpoint: index === 8
    ? 'https://api.xah.io/v1/images/edits'
    : index === 10
      ? 'https://api.xah.io/v1/chat/completions'
      : index <= 15
      ? 'https://api.xah.io/v1/images/generations'
      : '',
  model: [
    'phuocanh421994/Qwen_Image_3.0_Pro',
    'wowztools/nano-banana-pro',
    'wowztools/Nano-Banana-2',
    'daongocson12022004/gpt-image-2.5-sunburst',
    'cuzem3/gpt-image-2.5-sunburst',
    'hungdt/gemini-image-base',
    'adminsgehdt/seedream-4.5',
    'adminsgehdt/qwen-image-max',
    'Nano-Banana-2',
    'dungcsnd113/gemini-3.1-flash-image',
    'hungdt/gemini-image-pro',
    'daongocson12022004/gemini-3.1-flash-image',
    'daongocson12022004/gpt-image-2.5-flare',
    'daongocson12022004/gpt-image-1.5',
    'daongocson12022004/gpt-image-2.5',
  ][index - 1] || '',
  apiKey: '',
})

const emptyResult: RunResult = { status: 'idle', images: [] }

export default function ImageLab() {
  const [targets, setTargets] = useState<Target[]>(Array.from({ length: 15 }, (_, index) => createTarget(index + 1)))
  const [results, setResults] = useState<Record<string, RunResult>>({})
  const [prompt, setPrompt] = useState('Edit the provided reference image as a strict identity-preserving filter. Make the man completely bald by removing only the hair and realistically reconstructing the visible scalp. Preserve the exact face, identity, facial geometry, expression, skin tone, eyes, eyebrows, nose, mouth, ears and age. Do not alter clothing, body, pose, hands, background, objects, lighting, shadows, colors, camera angle, crop, composition, resolution or image style. The output must look like the same untouched original photo with only the hair changed to a natural bald scalp.')
  const [size, setSize] = useState('1024x1024')
  const [count, setCount] = useState(1)
  const [showKeys, setShowKeys] = useState(false)
  const [referenceImage, setReferenceImage] = useState('')
  const [referenceName, setReferenceName] = useState('')
  const [referenceError, setReferenceError] = useState('')
  const [referenceField, setReferenceField] = useState('image')
  const [referenceEncoding, setReferenceEncoding] = useState('data-url')
  const [clockNow, setClockNow] = useState(Date.now())

  const running = useMemo(
    () => Object.values(results).some((result) => result.status === 'loading'),
    [results],
  )
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setClockNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [running])

  const formatDuration = (milliseconds?: number) =>
    `${((milliseconds || 0) / 1000).toFixed(1)} giây`
  const formatRate = (bytesPerSecond?: number) => {
    if (!bytesPerSecond) return '—'
    if (bytesPerSecond >= 1024 * 1024) return `${(bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  }
  const formatPhase = (milliseconds?: number, bytesPerSecond?: number) =>
    milliseconds === undefined ? '—' : `${(milliseconds / 1000).toFixed(2)}s · ${formatRate(bytesPerSecond)}`

  const speedRanks = useMemo(() => {
    const completed = targets
      .map((target) => ({ id: target.id, duration: results[target.id]?.status === 'success' ? results[target.id].durationMs : undefined }))
      .filter((item): item is { id: string; duration: number } => item.duration !== undefined)
      .sort((a, b) => a.duration - b.duration)
    return new Map(completed.map((item, index) => [item.id, index + 1]))
  }, [results, targets])

  const providerName = (model: string) => model.includes('/') ? model.split('/')[0] : 'XAH Direct'
  const modelName = (model: string) => model.includes('/') ? model.split('/').slice(1).join('/') : model
  const routeName = (endpoint: string) => endpoint.includes('/chat/completions')
    ? 'Chat'
    : endpoint.includes('/images/edits')
      ? 'Edit'
      : 'Generate'
  const statusName = (status: RunResult['status']) => ({
    idle: 'Chưa chạy',
    loading: 'Đang chạy',
    success: 'Thành công',
    error: 'Lỗi',
  })[status]

  const updateTarget = (id: string, field: keyof Target, value: string) => {
    setTargets((current) =>
      current.map((target) => (target.id === id ? { ...target, [field]: value } : target)),
    )
  }

  const addTarget = () => setTargets((current) => [...current, createTarget(current.length + 1)])

  const removeTarget = (id: string) => {
    setTargets((current) => current.filter((target) => target.id !== id))
    setResults((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  const runTarget = async (target: Target) => {
    if (!target.endpoint || !target.model || !prompt.trim() || !referenceImage) {
      const message = 'Cần chọn ảnh tham chiếu và điền đủ endpoint, model, prompt.'
      setResults((current) => ({
        ...current,
        [target.id]: {
          status: 'error',
          images: [],
          durationMs: 0,
          error: message,
          logs: [{ offsetMs: 0, level: 'error', stage: 'client-validation', message }],
        },
      }))
      return
    }
    const startedAt = Date.now()
    setClockNow(startedAt)
    const clientLog: DiagnosticLog = { offsetMs: 0, level: 'info', stage: 'client', message: 'Bắt đầu gửi request từ trình duyệt tới backend.' }
    setResults((current) => ({ ...current, [target.id]: { status: 'loading', images: [], startedAt, logs: [clientLog] } }))
    try {
      const requestPayload = JSON.stringify({
        endpoint: target.endpoint,
        apiKey: target.apiKey,
        model: target.model,
        prompt: prompt.trim(),
        n: count,
        size,
        referenceImage,
        referenceField,
        referenceEncoding,
      })
      const requestBytes = new TextEncoder().encode(requestPayload).length
      const networkResult = await new Promise<{
        status: number
        body: {
          images?: GeneratedImage[]
          durationMs?: number
          responseKeys?: string[]
          message?: string
          requestId?: string
          logs?: DiagnosticLog[]
          timings?: { processingMs?: number; downloadMs?: number; responseBytes?: number; downloadBytesPerSecond?: number }
        }
        clientTimings: PerformanceTimings
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        let uploadStartedAt = performance.now()
        let uploadFinishedAt = uploadStartedAt
        let responseStartedAt = uploadStartedAt
        xhr.open('POST', '/api/image-lab/generate')
        xhr.setRequestHeader('Content-Type', 'application/json')
        xhr.setRequestHeader('Accept', 'application/json')
        xhr.timeout = 130_000
        xhr.upload.onloadstart = () => { uploadStartedAt = performance.now() }
        xhr.upload.onloadend = () => { uploadFinishedAt = performance.now() }
        xhr.onreadystatechange = () => {
          if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) responseStartedAt = performance.now()
        }
        xhr.onerror = () => reject(new Error('Mất kết nối tới backend.'))
        xhr.ontimeout = () => reject(new Error('Request phía trình duyệt quá thời gian 130 giây.'))
        xhr.onload = () => {
          const finishedAt = performance.now()
          const uploadMs = Math.max(0.1, uploadFinishedAt - uploadStartedAt)
          const downloadMs = Math.max(0.1, finishedAt - responseStartedAt)
          const responseBytes = new TextEncoder().encode(xhr.responseText).length
          try {
            resolve({
              status: xhr.status,
              body: JSON.parse(xhr.responseText),
              clientTimings: {
                clientUploadMs: uploadMs,
                clientUploadBytes: requestBytes,
                clientUploadBytesPerSecond: Math.round(requestBytes / (uploadMs / 1000)),
                clientDownloadMs: downloadMs,
                clientDownloadBytes: responseBytes,
                clientDownloadBytesPerSecond: Math.round(responseBytes / (downloadMs / 1000)),
              },
            })
          } catch {
            reject(new Error(`Backend trả về dữ liệu không hợp lệ (HTTP ${xhr.status}).`))
          }
        }
        xhr.send(requestPayload)
      })
      const body = networkResult.body
      const timings: PerformanceTimings = {
        ...networkResult.clientTimings,
        upstreamProcessingMs: body.timings?.processingMs,
        upstreamDownloadMs: body.timings?.downloadMs,
        upstreamResponseBytes: body.timings?.responseBytes,
        upstreamDownloadBytesPerSecond: body.timings?.downloadBytesPerSecond,
      }
      if (networkResult.status < 200 || networkResult.status >= 300) {
        setResults((current) => ({
          ...current,
          [target.id]: {
            status: 'error',
            images: [],
            startedAt,
            durationMs: body.durationMs ?? Date.now() - startedAt,
            error: body.message || `Lỗi ${networkResult.status}`,
            requestId: body.requestId,
            logs: [clientLog, ...(body.logs || [])],
            timings,
          },
        }))
        return
      }
      const successfulBody = body as {
        images?: GeneratedImage[]
        durationMs?: number
        responseKeys?: string[]
        requestId?: string
        logs?: DiagnosticLog[]
      }
      setResults((current) => ({
        ...current,
        [target.id]: {
          status: 'success',
          images: successfulBody.images || [],
          durationMs: successfulBody.durationMs,
          responseKeys: successfulBody.responseKeys,
          startedAt,
          requestId: successfulBody.requestId,
          logs: [clientLog, ...(successfulBody.logs || [])],
          timings,
        },
      }))
    } catch (error) {
      setResults((current) => ({
        ...current,
        [target.id]: {
          status: 'error',
          images: [],
          durationMs: Date.now() - startedAt,
          startedAt,
          error: error instanceof Error ? error.message : 'Không gọi được API.',
          logs: [clientLog, { offsetMs: Date.now() - startedAt, level: 'error', stage: 'client-network', message: error instanceof Error ? error.message : 'Không gọi được API.' }],
        },
      }))
    }
  }

  const runAll = async () => {
    await Promise.all(targets.map(runTarget))
  }

  const selectReference = (file?: File) => {
    setReferenceError('')
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setReferenceError('Chỉ hỗ trợ ảnh PNG, JPEG hoặc WebP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setReferenceError('Ảnh vượt quá giới hạn 10 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setReferenceImage(String(reader.result || ''))
      setReferenceName(file.name)
    }
    reader.onerror = () => setReferenceError('Không đọc được tệp ảnh.')
    reader.readAsDataURL(file)
  }

  return (
    <div className="image-lab view-stack">
      <div className="lab-heading">
        <div>
          <span className="eyebrow">So sánh nhiều model</span>
          <h2>AI Image Lab</h2>
          <p>Một ảnh tham chiếu, một prompt khóa thay đổi, nhiều model để so sánh.</p>
        </div>
        <button className="lab-run-all" onClick={() => void runAll()} disabled={running}>
          <Lightning size={19} weight="fill" />
          {running ? 'Đang chạy...' : `Chạy tất cả (${targets.length})`}
        </button>
      </div>

      <section className="lab-reference-panel">
        <div className="lab-reference-preview">
          {referenceImage
            ? <img src={referenceImage} alt="Ảnh Locket tham chiếu" />
            : <div><ImageSquare size={34} /><strong>Ảnh Locket gốc</strong><span>PNG, JPEG hoặc WebP · tối đa 10 MB</span></div>}
        </div>
        <div className="lab-reference-copy">
          <span className="eyebrow">Ảnh tham chiếu dùng chung</span>
          <h3>{referenceName || 'Chọn ảnh cần áp dụng filter'}</h3>
          <p>Ảnh được gửi tới mọi model. Route edit dùng multipart; route generations dùng trường ảnh được chọn bên phải để kiểm tra khả năng image-to-image riêng của từng gateway.</p>
          <div className="lab-reference-actions">
            <label className="lab-upload-button">
              <Plus size={18} weight="bold" /> {referenceImage ? 'Đổi ảnh' : 'Chọn ảnh'}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectReference(event.target.files?.[0])} />
            </label>
            {referenceImage && <button className="lab-ghost-button" onClick={() => { setReferenceImage(''); setReferenceName('') }}><Trash size={17} /> Bỏ ảnh</button>}
          </div>
          {referenceError && <span className="lab-reference-error"><WarningCircle size={17} />{referenceError}</span>}
        </div>
        <div className="lab-field lab-schema-field">
          <label htmlFor="reference-field">Trường ảnh API</label>
          <select id="reference-field" value={referenceField} onChange={(event) => setReferenceField(event.target.value)}>
            <option value="image">image</option>
            <option value="image_url">image_url</option>
            <option value="reference_image">reference_image</option>
            <option value="images">images[]</option>
            <option value="image_urls">image_urls[]</option>
          </select>
          <label htmlFor="reference-encoding">Encoding</label>
          <select id="reference-encoding" value={referenceEncoding} onChange={(event) => setReferenceEncoding(event.target.value)}>
            <option value="data-url">data:image/...;base64</option>
            <option value="base64">base64 thuần</option>
          </select>
          <small>Nano Banana chạy qua generations nhưng schema ảnh không được công bố. Log sẽ ghi chính xác field và encoding đã gửi.</small>
        </div>
      </section>

      <section className="lab-prompt-panel" aria-labelledby="prompt-title">
        <div className="lab-field lab-prompt-field">
          <label id="prompt-title" htmlFor="image-prompt">Prompt filter khóa thay đổi</label>
          <textarea
            id="image-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            maxLength={4000}
          />
          <small>{prompt.length}/4000 ký tự</small>
        </div>
        <div className="lab-options">
          <div className="lab-field">
            <label htmlFor="image-size">Kích thước</label>
            <select id="image-size" value={size} onChange={(event) => setSize(event.target.value)}>
              <option value="1024x1024">1024 × 1024</option>
              <option value="1024x1536">1024 × 1536</option>
              <option value="1536x1024">1536 × 1024</option>
              <option value="512x512">512 × 512</option>
            </select>
          </div>
          <div className="lab-field">
            <label htmlFor="image-count">Số ảnh</label>
            <select id="image-count" value={count} onChange={(event) => setCount(Number(event.target.value))}>
              {[1, 2, 3, 4].map((value) => <option value={value} key={value}>{value}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="lab-stats-panel" aria-labelledby="speed-table-title">
        <div className="lab-stats-heading">
          <div>
            <span className="eyebrow">Benchmark realtime</span>
            <h3 id="speed-table-title">Thống kê tốc độ theo nhà cung cấp</h3>
          </div>
          <p>Thời gian tính từ lúc trình duyệt gửi request đến khi nhận và parse xong phản hồi.</p>
        </div>
        <div className="lab-stats-scroll">
          <table className="lab-stats-table">
            <thead><tr><th>Hạng</th><th>Nhà cung cấp</th><th>Model</th><th>Route</th><th>Trạng thái</th><th>Upload</th><th>Xử lý</th><th>Trả về</th><th>Tổng</th><th>Ảnh</th></tr></thead>
            <tbody>
              {targets.map((target) => {
                const result = results[target.id] || emptyResult
                const elapsed = result.status === 'loading'
                  ? clockNow - (result.startedAt || clockNow)
                  : result.durationMs
                return <tr key={`stat-${target.id}`}>
                  <td><strong className="lab-rank">{speedRanks.get(target.id) ? `#${speedRanks.get(target.id)}` : '—'}</strong></td>
                  <td><strong>{providerName(target.model)}</strong></td>
                  <td><span title={target.model}>{modelName(target.model)}</span></td>
                  <td><span className={`lab-route-small ${routeName(target.endpoint).toLowerCase()}`}>{routeName(target.endpoint)}</span></td>
                  <td><span className={`lab-stat-status ${result.status}`}>{statusName(result.status)}</span></td>
                  <td className="lab-phase-cell">{formatPhase(result.timings?.clientUploadMs, result.timings?.clientUploadBytesPerSecond)}</td>
                  <td className="lab-phase-cell">{result.status === 'loading' ? formatDuration(elapsed) : formatPhase(result.timings?.upstreamProcessingMs)}</td>
                  <td className="lab-phase-cell">{formatPhase(result.timings?.upstreamDownloadMs, result.timings?.upstreamDownloadBytesPerSecond)}</td>
                  <td className="lab-time-cell">{elapsed === undefined ? '—' : formatDuration(elapsed)}</td>
                  <td>{result.status === 'success' ? result.images.length : '—'}</td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="lab-toolbar">
        <div>
          <h3>Endpoint và model</h3>
          <p>Key chỉ được gửi tới endpoint bạn nhập và không được lưu sau khi tải lại trang.</p>
        </div>
        <div className="lab-toolbar-actions">
          <button className="lab-ghost-button" onClick={() => setShowKeys((value) => !value)}>
            {showKeys ? <EyeSlash size={18} /> : <Eye size={18} />}
            {showKeys ? 'Ẩn key' : 'Hiện key'}
          </button>
          <button className="secondary-button compact" onClick={addTarget}>
            <Plus size={18} weight="bold" /> Thêm cấu hình
          </button>
        </div>
      </div>

      <div className="lab-target-list">
        {targets.map((target, index) => {
          const result = results[target.id] || emptyResult
          return (
            <article className="lab-target" key={target.id}>
              <div className="lab-target-number">{String(index + 1).padStart(2, '0')}</div>
              <div className="lab-target-body">
                <div className="lab-target-topline">
                  <input
                    aria-label={`Tên cấu hình ${index + 1}`}
                    className="lab-name-input"
                    value={target.name}
                    onChange={(event) => updateTarget(target.id, 'name', event.target.value)}
                  />
                  <span className={target.endpoint.replace(/\/$/, '').endsWith('/images/edits') ? 'lab-route-badge edit' : target.endpoint.includes('/chat/completions') ? 'lab-route-badge chat' : 'lab-route-badge generate'}>
                    {target.endpoint.replace(/\/$/, '').endsWith('/images/edits') ? 'FILTER EDIT' : target.endpoint.includes('/chat/completions') ? 'CHAT + REF' : 'GEN + REF'}
                  </span>
                  <button
                    className="lab-delete-button"
                    onClick={() => removeTarget(target.id)}
                    disabled={targets.length === 1}
                    aria-label={`Xóa ${target.name}`}
                  ><Trash size={18} /></button>
                </div>
                <div className="lab-config-grid">
                  <div className="lab-field span-two">
                    <label htmlFor={`endpoint-${target.id}`}>Endpoint URL</label>
                    <input id={`endpoint-${target.id}`} type="url" value={target.endpoint} onChange={(event) => updateTarget(target.id, 'endpoint', event.target.value)} placeholder="https://api.example.com/v1/images/generations" />
                  </div>
                  <div className="lab-field">
                    <label htmlFor={`model-${target.id}`}>Model</label>
                    <input id={`model-${target.id}`} value={target.model} onChange={(event) => updateTarget(target.id, 'model', event.target.value)} placeholder="provider/model-name" />
                  </div>
                  <div className="lab-field">
                    <label htmlFor={`key-${target.id}`}>API key</label>
                    <input id={`key-${target.id}`} type={showKeys ? 'text' : 'password'} value={target.apiKey} onChange={(event) => updateTarget(target.id, 'apiKey', event.target.value)} placeholder="Dùng key server nếu để trống" autoComplete="off" />
                  </div>
                </div>
                <div className="lab-target-actions">
                  <button className="lab-run-button" onClick={() => void runTarget(target)} disabled={result.status === 'loading'}>
                    <Lightning size={17} />{result.status === 'loading' ? `Đang xử lý · ${formatDuration(clockNow - (result.startedAt || clockNow))}` : 'Chạy model này'}
                  </button>
                  {result.status === 'success' && <span className="lab-result-meta success"><CheckCircle size={17} weight="fill" />{formatDuration(result.durationMs)} · {result.images.length} ảnh</span>}
                  {result.status === 'error' && <span className="lab-result-meta error"><WarningCircle size={17} />{result.durationMs !== undefined && `${formatDuration(result.durationMs)} · `}{result.error}</span>}
                </div>
                {result.status === 'loading' && <div className="lab-loading-grid">{Array.from({ length: count }).map((_, item) => <div className="lab-image-skeleton skeleton" key={item} />)}</div>}
                {result.logs?.length ? (
                  <details className="lab-log-panel" open={result.status === 'error'}>
                    <summary>Nhật ký request {result.requestId ? `· ${result.requestId.slice(0, 8)}` : ''}</summary>
                    <div className="lab-log-lines">
                      {result.logs.map((log, logIndex) => (
                        <div className={`lab-log-line ${log.level}`} key={`${log.stage}-${logIndex}`}>
                          <time>+{(log.offsetMs / 1000).toFixed(2)}s</time>
                          <strong>{log.stage}</strong>
                          <span>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
                {result.status === 'success' && (
                  result.images.length ? (
                    <div className="lab-results-grid">
                      {result.images.map((image, item) => {
                        const source = image.url || (image.b64Json ? `data:image/png;base64,${image.b64Json}` : '')
                        return <figure className="lab-result-image" key={`${target.id}-${item}`}>
                          {source ? <img src={source} alt={`Ảnh ${item + 1} tạo bởi ${target.name}`} /> : <div className="lab-no-image"><ImageSquare size={30} /><span>Không tìm thấy dữ liệu ảnh</span></div>}
                          <figcaption>
                            <span>Ảnh {item + 1}</span>
                            {image.url && <button onClick={() => void navigator.clipboard.writeText(image.url!)}><Copy size={16} /> Sao chép URL</button>}
                          </figcaption>
                        </figure>
                      })}
                    </div>
                  ) : (
                    <div className="lab-empty-response"><WarningCircle size={20} /><div><strong>API phản hồi thành công nhưng chưa nhận diện được ảnh.</strong><span>Các trường trả về: {result.responseKeys?.join(', ') || 'không xác định'}</span></div></div>
                  )
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
