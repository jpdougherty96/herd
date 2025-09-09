import React, { useState } from 'react'

export default function SearchBar({ onSearch }) {
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [date, setDate] = useState('')

  const go = (e) => {
    e?.preventDefault()
    onSearch?.({ q, city, state, date })
  }

  return (
    <form onSubmit={go} className="bg-white rounded-2xl shadow p-3 md:p-4 flex flex-col md:flex-row gap-2 md:gap-3">
      <input className="border rounded p-2 flex-1" placeholder="Keyword (e.g., cheesemaking)" value={q} onChange={e=>setQ(e.target.value)} />
      <input className="border rounded p-2 w-full md:w-44" placeholder="City" value={city} onChange={e=>setCity(e.target.value)} />
      <input className="border rounded p-2 w-full md:w-28" placeholder="State" value={state} onChange={e=>setState(e.target.value)} />
      <input className="border rounded p-2 w-full md:w-44" type="date" value={date} onChange={e=>setDate(e.target.value)} />
      <button className="px-4 py-2 rounded bg-herdGreen text-white">Search</button>
    </form>
  )
}