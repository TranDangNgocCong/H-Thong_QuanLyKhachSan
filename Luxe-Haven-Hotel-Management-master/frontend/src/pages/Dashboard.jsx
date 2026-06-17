import { StatCard } from '../components/StatCard'
import { useHealthCheck } from '../hooks/useHealthCheck'
import { useAppContext } from '../context/AppContext'
import { formatCurrency } from '../utils/formatCurrency'

const metrics = [
  { label: 'Available Rooms', value: 42 },
  { label: 'Active Bookings', value: 18 },
  { label: 'Monthly Revenue', value: formatCurrency(24500) },
]

export function Dashboard() {
  const apiStatus = useHealthCheck()
  const { appName } = useAppContext()

  return (
    <main className="dashboard">
      <section className="hero-section">
        <p className="eyebrow">Full-stack monorepo starter</p>
        <h1>{appName}</h1>
        <p>
          Manage rooms, guests, reservations, and revenue from a clean React dashboard backed by an Express API.
        </p>
        <span className="api-status">{apiStatus}</span>
      </section>

      <section className="stats-grid">
        {metrics.map((metric) => (
          <StatCard key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </section>
    </main>
  )
}
