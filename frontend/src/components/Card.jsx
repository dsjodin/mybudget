export default function Card({ title, value, subtitle, color = 'blue', children }) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    red: 'border-red-200 bg-red-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    purple: 'border-purple-200 bg-purple-50',
  }

  const valueColors = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    red: 'text-red-700',
    yellow: 'text-yellow-700',
    purple: 'text-purple-700',
  }

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color] || colorClasses.blue}`}>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      {value !== undefined && (
        <p className={`text-2xl font-bold mt-1 ${valueColors[color] || valueColors.blue}`}>
          {value}
        </p>
      )}
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      {children}
    </div>
  )
}
