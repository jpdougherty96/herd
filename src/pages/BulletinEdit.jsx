// src/pages/BulletinEdit.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getListing, updateListing } from "../lib/bulletinApi";
import ImageUploader from "../components/ImageUploader";

export default function BulletinEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "", body: "", category: "", price: "", tags: [], city: "", state: "", zip: ""
  });
  const [replacePhotos, setReplacePhotos] = useState(false);
  const [photos, setPhotos] = useState([]); // new set to replace with
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const l = await getListing(id);
        setForm({
          title: l.title || "",
          body: l.body || "",
          category: l.category || "",
          price: l.price ?? "",
          tags: l.tags || [],
          city: l.city || "",
          state: l.state || "",
          zip: l.zip || ""
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category || null,
        price: form.price === "" ? null : Number(form.price),
        tags: form.tags,
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        zip: form.zip || null,
      };
      await updateListing(id, payload, replacePhotos ? photos.slice(0,8) : null);
      nav(`/bulletin/${id}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Listing</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="border w-full px-3 py-2" placeholder="Title" value={form.title}
               onChange={e=>setForm(f=>({...f,title:e.target.value}))} required />
        <textarea className="border w-full px-3 py-2 h-40" placeholder="Describe your item or animal"
                  value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} required />
        <div className="flex gap-3">
          <input className="border px-3 py-2 flex-1" placeholder="City" value={form.city}
                 onChange={e=>setForm(f=>({...f,city:e.target.value}))} required />
          <input className="border px-3 py-2 w-24" placeholder="State" value={form.state}
                 onChange={e=>setForm(f=>({...f,state:e.target.value}))} required />
          <input className="border px-3 py-2 w-28" placeholder="Zip (optional)" value={form.zip}
                 onChange={e=>setForm(f=>({...f,zip:e.target.value}))} />
        </div>
        <div className="flex gap-3">
          <input className="border px-3 py-2 flex-1" placeholder="Category (optional)" value={form.category}
                 onChange={e=>setForm(f=>({...f,category:e.target.value}))} />
          <input className="border px-3 py-2 w-40" type="number" step="1" placeholder="Price (optional)" value={form.price}
                 onChange={e=>setForm(f=>({...f,price:e.target.value}))} />
        </div>

        <div className="border p-3 rounded">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={replacePhotos} onChange={e=>setReplacePhotos(e.target.checked)} />
            Replace photos (optional)
          </label>
          {replacePhotos && (
            <div className="mt-2">
              <ImageUploader maxFiles={8} onChange={(files)=>
                setPhotos(files.map(f=>({ public_id: f.public_id, secure_url: f.secure_url, alt: f.alt || "" })))
              }/>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button disabled={saving} className="border px-4 py-2">
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button type="button" className="border px-4 py-2" onClick={()=>nav(`/bulletin/${id}`)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
