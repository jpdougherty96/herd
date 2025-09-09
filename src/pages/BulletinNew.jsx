import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createListing } from "../lib/bulletinApi";
// Reuse your existing Cloudinary uploader if present; otherwise a minimal stub:
import ImageUploader from "../components/ImageUploader"; // same widget you used for classes

export default function BulletinNew() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "", body: "", category: "Livestock", price: "", tags: [],
    city: "", state: "", zip: ""
  });
  const [photos, setPhotos] = useState([]); // [{public_id, secure_url, alt}]
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category || null,
        price: form.price ? Number(form.price) : null,
        tags: form.tags,
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        zip: form.zip || null
      };
      const listing = await createListing(payload, photos.slice(0,8));
      nav(`/bulletin/${listing.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold mb-4">Post a Listing</h1>
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

        <ImageUploader
          maxFiles={8}
          onChange={(files)=> setPhotos(files.map(f=>({
            public_id: f.public_id, secure_url: f.secure_url, alt: f.original_filename || ""
          })))}
        />

        <button disabled={saving} className="border px-4 py-2">
          {saving ? "Saving…" : "Publish"}
        </button>
      </form>
    </div>
  );
}
