import React from 'react'

export default function FiltersSidebar({ filters, onChange }) {
  const set = (k, v) => onChange?.({ ...filters, [k]: v })
  return (
    <aside className="w-full md:w-64 shrink-0">
      <div className="bg-white rounded-2xl shadow p-4 space-y-4">
        <div>
          <div className="font-semibold mb-2">Price (per person)</div>
          <div className="flex gap-2">
            <input className="border rounded p-2 w-24" type="number" min="0" step="1"
              value={filters.minPrice ?? ''} placeholder="Min"
              onChange={e=>set('minPrice', e.target.value ? Number(e.target.value) : undefined)} />
            <input className="border rounded p-2 w-24" type="number" min="0" step="1"
              value={filters.maxPrice ?? ''} placeholder="Max"
              onChange={e=>set('maxPrice', e.target.value ? Number(e.target.value) : undefined)} />
          </div>
        </div>
        <div>
          <div className="font-semibold mb-2">Duration</div>
          <select className="border rounded p-2 w-full" value={filters.numDays ?? ''}
            onChange={e=>set('numDays', e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Any</option>
            <option value="1">1 day</option>
            <option value="2">2 days</option>
            <option value="3">3 days</option>
            <option value="4">4+ days</option>
          </select>
        </div>
        <div>
          <div className="font-semibold mb-2">Min Age</div>
          <select className="border rounded p-2 w-full" value={filters.minAge ?? ''}
            onChange={e=>set('minAge', e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Any</option>
            <option value="0">0+</option>
            <option value="8">8+</option>
            <option value="12">12+</option>
            <option value="16">16+</option>
            <option value="18">18+</option>
          </select>
        </div>
      </div>
    </aside>
  )
}