// src/pages/BulletinList.jsx
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchListings } from "../lib/bulletinApi";

const STATES = [
  ["", "All states"],
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
  ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],
  ["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],
  ["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],
  ["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],
  ["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],
  ["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],
  ["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],
  ["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],
  ["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"]
];

function sellerLine(r) {
  const name = r.poster_name || (r.user_id ? r.user_id.slice(0, 8) + "…" : "Seller");
  const farm = r.poster_farm?.trim();
  return farm ? `Listed by ${name} • ${farm}` : `Listed by ${name}`;
}

export default function BulletinList() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || "");
  const [state, setState] = useState(sp.get("state") || "");
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function run(page = 1) {
    setLoading(true);
    try {
      const { data, count } = await searchListings({ q, state, page });
      setRows(data || []);
      setCount(count || 0);
      setSp(params => {
        const next = new URLSearchParams(params);
        if (q) next.set("q", q); else next.delete("q");
        if (state) next.set("state", state); else next.delete("state");
        return next;
      }, { replace: true });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { run(); /* initial load */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">HERD Bulletin Board</h1>
        <div className="flex gap-4">
          {/* 'My Listings' intentionally removed (it's already in the navbar) */}
          <Link to="/bulletin/new" className="underline">Post a Listing</Link>
        </div>
      </div>

      <form onSubmit={e => { e.preventDefault(); run(1); }} className="flex flex-wrap gap-2 mb-4">
        <input
          className="border px-3 py-2 flex-1 min-w-[220px]"
          placeholder="Search keywords…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <select
          className="border px-3 py-2 w-56"
          value={state}
          onChange={e => setState(e.target.value)}
        >
          {STATES.map(([abbr, name]) => (
            <option key={abbr} value={abbr}>{name}</option>
          ))}
        </select>
        <button className="border px-4 py-2">Search</button>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : rows.length === 0 ? (
        <p>No results.</p>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-2">{count} result{count === 1 ? "" : "s"}</p>
          <ul className="divide-y">
            {rows.map(r => (
              <li key={r.id} className="py-3">
                <Link to={`/bulletin/${r.id}`} className="block">
                  <div className="flex gap-3">
                    {r.bulletin_photos?.[0]?.secure_url ? (
                      <img
                        src={r.bulletin_photos[0].secure_url}
                        alt=""
                        className="w-24 h-24 object-cover rounded"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 rounded" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold uppercase">{r.title}</div>
                      <div className="text-xs text-gray-700 mb-1">{sellerLine(r)}</div>
                      <div className="text-sm text-gray-600 truncate">{r.body}</div>
                      <div className="text-sm">
                        {r.city}, {r.state}
                        {r.price ? ` · $${Number(r.price).toLocaleString()}` : ""}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
