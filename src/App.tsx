import { useEffect, useMemo, useState } from 'react'
import {
  ArrowClockwise,
  Check,
  CheckCircle,
  ClipboardText,
  Copy,
  Gauge,
  Headset,
  House,
  ImageSquare,
  MagnifyingGlass,
  PlusCircle,
  ShieldCheck,
  Sparkle,
  UsersThree,
  WarningCircle,
} from '@phosphor-icons/react'
import ImageLab from './ImageLab'
import {
  activateCustomer,
  loadDashboard,
  lookupUsername,
  type ActivationResult,
  type DashboardData,
} from './api'

type View = 'overview' | 'activate' | 'customers' | 'messages' | 'image-lab' | 'support'

const initialData: DashboardData = {
  partnerName: 'Đang tải dữ liệu',
  credits: 0,
  totalPurchased: 0,
  totalUsed: 0,
  activeCustomers: 0,
  customers: [],
  demoMode: true,
}

const navigation = [
  { id: 'overview' as const, label: 'Tổng quan', icon: House },
  { id: 'activate' as const, label: 'Kích hoạt mới', icon: PlusCircle },
  { id: 'customers' as const, label: 'Khách hàng', icon: UsersThree },
  { id: 'messages' as const, label: 'Tin nhắn nhanh', icon: ClipboardText },
  { id: 'image-lab' as const, label: 'AI Image Lab', icon: ImageSquare },
  { id: 'support' as const, label: 'Hỗ trợ', icon: Headset },
]

function App() {
  const [view, setView] = useState<View>('overview')
  const [dashboard, setDashboard] = useState(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      setDashboard(await loadDashboard())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Sparkle weight="fill" /></div>
          <div><strong>JayDev</strong><span>CTV Portal</span></div>
        </div>

        <nav aria-label="Điều hướng chính">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={view === item.id ? 'nav-item active' : 'nav-item'}
                key={item.id}
                onClick={() => setView(item.id)}
              >
                <Icon size={20} weight={view === item.id ? 'fill' : 'regular'} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <ShieldCheck size={20} />
          <div><strong>Kết nối bảo mật</strong><span>{dashboard.demoMode ? 'Chế độ demo' : 'API đã cấu hình'}</span></div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p>Xin chào</p>
            <h1>{dashboard.partnerName}</h1>
          </div>
          <div className="topbar-actions">
            {dashboard.demoMode && <span className="demo-badge">Dữ liệu mẫu</span>}
            <button className="icon-button" onClick={() => void refresh()} aria-label="Làm mới dữ liệu">
              <ArrowClockwise size={20} className={loading ? 'spin' : ''} />
            </button>
            <div className="avatar">JD</div>
          </div>
        </header>

        {error && (
          <div className="alert error"><WarningCircle size={21} /><span>{error}</span></div>
        )}

        <section className="page-content">
          {view === 'overview' && <Overview data={dashboard} loading={loading} onActivate={() => setView('activate')} />}
          {view === 'activate' && <ActivateView onActivated={(credits) => setDashboard((current) => ({ ...current, credits }))} />}
          {view === 'customers' && <CustomersView data={dashboard} loading={loading} />}
          {view === 'messages' && <MessagesView />}
          {view === 'image-lab' && <ImageLab />}
          {view === 'support' && <SupportView />}
        </section>
      </main>
    </div>
  )
}

function Overview({ data, loading, onActivate }: { data: DashboardData; loading: boolean; onActivate: () => void }) {
  const usedPercent = data.totalPurchased ? Math.round((data.totalUsed / data.totalPurchased) * 100) : 0
  return (
    <div className="view-stack">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Trung tâm vận hành</span>
          <h2>Quản lý lượt kích hoạt thật gọn.</h2>
          <p>Kiểm tra số dư, theo dõi khách hàng và tạo cấu hình từ một nơi duy nhất.</p>
          <button className="primary-button" onClick={onActivate}><PlusCircle size={20} weight="bold" />Kích hoạt khách mới</button>
        </div>
        <div className="credit-orbit" aria-label={`${data.credits} lượt còn lại`}>
          <div><span>{loading ? '...' : data.credits}</span><small>lượt còn lại</small></div>
        </div>
      </div>

      <div className="metrics-grid">
        <Metric icon={Gauge} label="Tổng lượt đã nạp" value={data.totalPurchased} detail={`${usedPercent}% đã sử dụng`} loading={loading} />
        <Metric icon={CheckCircle} label="Đã kích hoạt" value={data.totalUsed} detail="Cộng dồn toàn thời gian" loading={loading} />
        <Metric icon={UsersThree} label="Khách đang hoạt động" value={data.activeCustomers} detail="Cấu hình đang bật" loading={loading} />
      </div>

      <div className="section-heading"><div><h3>Khách hàng gần đây</h3><p>Các lượt kích hoạt mới nhất của tài khoản.</p></div></div>
      <CustomerTable customers={data.customers.slice(0, 5)} loading={loading} />
    </div>
  )
}

function Metric({ icon: Icon, label, value, detail, loading }: { icon: typeof Gauge; label: string; value: number; detail: string; loading: boolean }) {
  return (
    <article className="metric">
      <div className="metric-icon"><Icon size={22} /></div>
      <p>{label}</p>
      {loading ? <div className="skeleton metric-skeleton" /> : <strong>{value.toLocaleString('vi-VN')}</strong>}
      <span>{detail}</span>
    </article>
  )
}

function ActivateView({ onActivated }: { onActivated: (credits: number) => void }) {
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState<'idle' | 'looking' | 'ready' | 'activating' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [result, setResult] = useState<ActivationResult | null>(null)

  const cleanUsername = username.trim().replace(/^@/, '')

  const lookup = async () => {
    if (cleanUsername.length < 3) {
      setStatus('error'); setMessage('Username cần có ít nhất 3 ký tự.'); return
    }
    setStatus('looking'); setMessage('')
    try {
      const person = await lookupUsername(cleanUsername)
      setDisplayName(person.displayName)
      setStatus('ready')
    } catch (reason) {
      setStatus('error'); setMessage(reason instanceof Error ? reason.message : 'Không tra cứu được tài khoản.')
    }
  }

  const activate = async () => {
    setStatus('activating'); setMessage('')
    try {
      const activation = await activateCustomer(cleanUsername)
      setResult(activation); setStatus('done')
      if (activation.remainingCredits !== undefined) onActivated(activation.remainingCredits)
    } catch (reason) {
      setStatus('error'); setMessage(reason instanceof Error ? reason.message : 'Kích hoạt thất bại.')
    }
  }

  if (status === 'done' && result) {
    return (
      <div className="success-state">
        <div className="success-icon"><Check size={32} weight="bold" /></div>
        <h2>Kích hoạt thành công</h2>
        <p>Cấu hình cho <strong>@{result.username}</strong> đã sẵn sàng để gửi cho khách.</p>
        <div className="result-box"><span>Link cài đặt</span><code>{result.downloadUrl}</code></div>
        <button className="primary-button" onClick={() => void navigator.clipboard.writeText(result.downloadUrl)}><Copy size={19} />Sao chép link</button>
        <button className="text-button" onClick={() => { setStatus('idle'); setUsername(''); setResult(null) }}>Kích hoạt tài khoản khác</button>
      </div>
    )
  }

  return (
    <div className="form-layout">
      <div className="form-intro">
        <span className="eyebrow">Kích hoạt mới</span>
        <h2>Xác nhận đúng người trước khi trừ lượt.</h2>
        <p>Nhập username Locket của khách. Hệ thống sẽ tra cứu trước khi cho phép kích hoạt.</p>
        <div className="notice"><ShieldCheck size={21} /><span>Mỗi lần kích hoạt thành công sẽ trừ 1 credit.</span></div>
      </div>
      <div className="form-card">
        <label htmlFor="username">Username Locket</label>
        <div className="input-wrap"><span>@</span><input id="username" value={username} onChange={(event) => { setUsername(event.target.value); setStatus('idle') }} placeholder="linh_dan_2005" autoComplete="off" /></div>
        <button className="secondary-button" onClick={() => void lookup()} disabled={status === 'looking' || !cleanUsername}><MagnifyingGlass size={19} />{status === 'looking' ? 'Đang tra cứu...' : 'Tra cứu tài khoản'}</button>
        {status === 'ready' && (
          <div className="profile-confirm"><div className="avatar large">{displayName.slice(0, 2).toUpperCase()}</div><div><span>Tài khoản tìm thấy</span><strong>{displayName}</strong><small>@{cleanUsername}</small></div><CheckCircle size={24} weight="fill" /></div>
        )}
        {status === 'error' && <div className="inline-error"><WarningCircle size={19} />{message}</div>}
        <div className="package-row"><div><span>Gói cài đặt</span><strong>Locket Gold Vĩnh Viễn VIP</strong></div><span className="package-badge">9999 ngày</span></div>
        <button className="primary-button full" onClick={() => void activate()} disabled={status !== 'ready'}>{status === 'activating' ? 'Đang kích hoạt...' : 'Xác nhận và kích hoạt'}</button>
      </div>
    </div>
  )
}

function CustomersView({ data, loading }: { data: DashboardData; loading: boolean }) {
  const [query, setQuery] = useState('')
  const customers = useMemo(() => data.customers.filter((customer) => `${customer.username} ${customer.displayName}`.toLowerCase().includes(query.toLowerCase())), [data.customers, query])
  return (
    <div className="view-stack">
      <div className="section-heading wide"><div><span className="eyebrow">Danh sách khách</span><h2>Khách hàng</h2><p>Tìm kiếm và kiểm tra trạng thái cấu hình.</p></div><div className="search-box"><MagnifyingGlass size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm username..." /></div></div>
      <CustomerTable customers={customers} loading={loading} />
    </div>
  )
}

function CustomerTable({ customers, loading }: { customers: DashboardData['customers']; loading: boolean }) {
  if (loading) return <div className="table-shell">{[1, 2, 3].map((item) => <div className="table-skeleton skeleton" key={item} />)}</div>
  if (!customers.length) return <div className="empty-state"><UsersThree size={34} /><h3>Chưa có khách hàng</h3><p>Khách mới sẽ xuất hiện tại đây sau khi kích hoạt.</p></div>
  return (
    <div className="table-shell"><table><thead><tr><th>Khách hàng</th><th>Gói</th><th>Ngày tạo</th><th>Trạng thái</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td><strong>{customer.displayName}</strong><span>@{customer.username}</span></td><td>{customer.packageName}</td><td>{customer.createdAt}</td><td><span className={`status ${customer.status.toLowerCase()}`}>{customer.status === 'ACTIVE' ? 'Đang bật' : customer.status === 'DISABLED' ? 'Đã tắt' : 'Hết hạn'}</span></td></tr>)}</tbody></table></div>
  )
}

const messages = [
  { title: 'Cài đặt Locket Gold', body: 'Chúc mừng bạn đã kích hoạt Locket Gold VIP! Mở link {DOWNLOAD_URL} bằng Safari, cho phép tải hồ sơ, sau đó vào Cài đặt > Đã tải về hồ sơ để cài đặt. Cuối cùng, bật tin cậy chứng nhận và mở lại Locket nhé.' },
  { title: 'Khung Photobooth và Filter AI', body: 'Sau khi cài DNS Gold, mở camera Locket và vuốt thanh chọn dưới nút chụp để xem các khung Photobooth. Nhấn biểu tượng ngôi sao để chọn thêm Filter AI.' },
  { title: 'Đổi máy hoặc cập nhật iOS', body: 'Bạn chỉ cần mở lại link cũ {DOWNLOAD_URL} bằng Safari, cài lại hồ sơ DNS và bật tin cậy chứng chỉ. Gói của bạn sẽ được nhận lại.' },
]

function MessagesView() {
  const [copied, setCopied] = useState<number | null>(null)
  const copy = async (body: string, index: number) => { await navigator.clipboard.writeText(body); setCopied(index); window.setTimeout(() => setCopied(null), 1600) }
  return <div className="view-stack"><div className="section-heading"><div><span className="eyebrow">Phản hồi nhanh</span><h2>Tin nhắn mẫu</h2><p>Sao chép, thay link cài đặt rồi gửi cho khách.</p></div></div><div className="message-list">{messages.map((message, index) => <article className="message-card" key={message.title}><div><span>Mẫu {index + 1}</span><h3>{message.title}</h3></div><p>{message.body}</p><button className="secondary-button compact" onClick={() => void copy(message.body, index)}>{copied === index ? <Check size={18} /> : <Copy size={18} />}{copied === index ? 'Đã sao chép' : 'Sao chép'}</button></article>)}</div></div>
}

function SupportView() {
  const contacts = [
    { channel: 'Facebook Admin', name: 'Jay Trần', url: 'https://web.facebook.com/jaytran0522' },
    { channel: 'TikTok Support', name: '@itlamtruyenthong0', url: 'https://www.tiktok.com/@itlamtruyenthong0' },
  ]
  return <div className="support-layout"><div className="form-intro"><span className="eyebrow">Hỗ trợ kỹ thuật</span><h2>Kết nối với đội ngũ JayDev.</h2><p>Quét QR bằng điện thoại hoặc mở liên kết trực tiếp để được hỗ trợ.</p></div><div className="support-grid">{contacts.map((contact) => { const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=12&data=${encodeURIComponent(contact.url)}`; return <article className="support-card" key={contact.channel}><img src={qr} alt={`QR ${contact.channel}`} width="190" height="190" /><span>{contact.channel}</span><h3>{contact.name}</h3><a href={contact.url} target="_blank" rel="noreferrer">Mở liên kết</a></article> })}</div></div>
}

export default App

