// src/pages/BulletinMine.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchMyListings, deleteListing } from "../lib/bulletinApi";

export default function BulletinMine() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchMyListings();
      setRows(data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onDelete(id) {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    await deleteListing(id);
    await load();
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My Listings</h1>
        <Link to="/bulletin/new" className="underline">Post a Listing</Link>
      </div>

      {loading ? <p>Loading…</p> : rows.length === 0 ? (
        <div className="text-sm text-gray-600">
          You don’t have any listings yet. <Link className="underline" to="/bulletin/new">Create one</Link>.
        </div>
      ) : (
        <ul className="divide-y">
          {rows.map(r => {
            const first = (r.bulletin_photos || []).slice().sort((a,b)=>a.sort_order-b.sort_order)[0];
            return (
              <li key={r.id} className="py-3">
                <div className="flex gap-3 items-start">
                  {first
                    ? <img src={first.secure_url} alt={first.alt || r.title || ""} className="w-24 h-24 object-cover" />
                    : <div className="w-24 h-24 bg-gray-100" />
                  }
                  <div className="flex-1">
                    <Link to={`/bulletin/${r.id}`} className="font-semibold uppercase">{r.title}</Link>
                    <div className="text-sm">{r.city}, {r.state} {r.price ? `· $${Number(r.price).toLocaleString()}` : ""}</div>
                    <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="border px-3 py-1" onClick={() => nav(`/bulletin/${r.id}/edit`)}>Edit</button>
                    <button className="border px-3 py-1 text-red-600" onClick={() => onDelete(r.id)}>Delete</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
