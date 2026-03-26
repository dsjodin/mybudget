import { MONTHS_SHORT } from '../utils/format'

export default function MonthPicker({ year, month, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(year - 1, month)}
        className="px-2 py-1 text-gray-500 hover:text-gray-900"
      >
        &laquo;
      </button>

      <select
        value={month}
        onChange={(e) => onChange(year, parseInt(e.target.value))}
        className="border rounded px-2 py-1.5 text-sm"
      >
        {MONTHS_SHORT.map((m, i) => (
          <option key={i + 1} value={i + 1}>{m}</option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => onChange(parseInt(e.target.value), month)}
        className="border rounded px-2 py-1.5 text-sm"
      >
        {Array.from({ length: 10 }, (_, i) => year - 5 + i).map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <button
        onClick={() => onChange(year + 1, month)}
        className="px-2 py-1 text-gray-500 hover:text-gray-900"
      >
        &raquo;
      </button>
    </div>
  )
}
