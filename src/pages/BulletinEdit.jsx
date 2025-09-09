// src/pages/BulletinEdit.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getListing, updateListing } from "../lib/bulletinApi";
import { supabase } from "../lib/supabase";
import ImageUploader from "../components/ImageUploader";

const STATES = [
  "", "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM",
  "NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA",
  "WV","WI","WY"
];

export default function BulletinEdit() {
  const { id } = useParams();
  const nav = useNavigate();

  const [form, setForm] = useState({
    title: "",
    body: "",
    category: "Livestock",
    price: "",
    tags: [],
    city: "",
    state: "",
    zip: ""
  });

  const [existingPhotos, setExistingPhotos] = useState([]); // [{public_id, secure_url, alt, sort_order}]
  const [newPhotos, setNewPhotos] = useState([]); // [{public_id, secure_url, alt}]

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefillMsg, setPrefillMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getListing(id);
        setForm((f) => ({
          ...f,
          title: data.title || "",
          body: data.body || "",
          category: data.category || "Livestock",
          price: data.price ?? "",
          tags: Array.isArray(data.tags) ? data.tags : [],
          city: data.city || "",
          state: data.state || "",
          zip: data.zip || ""
        }));
        const photos = (data.bulletin_photos || []).slice().sort((a, b) => a.sort_order - b.sort_order);
        setExistingPhotos(
          photos.map((p, i) => ({
            public_id: p.public_id,
            secure_url: p.secure_url,
            alt: p.alt || data.title || "",
            sort_order: i
          }))
        );
      } catch (e) {
        console.error(e);
        alert("Could not load listing.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      if (!form.city && !form.state) {
        try {
          const { data: u } = await supabase.auth.getUser();
          const userId = u?.user?.id;
          if (!userId) return;
          const { data, error } = await supabase
            .from("profiles")
            .select("city, state")
            .eq("id", userId)
            .maybeSingle();
          if (!error && data && (data.city || data.state)) {
            setForm((f) => ({
              ...f,
              city: f.city || (data.city ?? ""),
              state: f.state || (data.state ?? "")
            }));
            setPrefillMsg("City/State prefilled from your profile. You can edit below.");
          }
        } catch { /* ignore */ }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const totalPhotos = useMemo(
    () => existingPhotos.length + newPhotos.length,
    [existingPhotos.length, newPhotos.length]
  );

  function removeExistingPhoto(idx) {
    setExistingPhotos((arr) => arr.filter((_, i) => i !== idx));
  }
  function removeNewPhoto(idx) {
    setNewPhotos((arr) => arr.filter((_, i) => i !== idx));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      alert("Title and description are required.");
      return;
    }
    if (totalPhotos > 8) {
      alert("You can have up to 8 photos total.");
      return;
    }

    setSaving(true);
    try {
      const orderedExisting = existingPhotos.map((p, i) => ({
        public_id: p.public_id,
        secure_url: p.secure_url,
        alt: p.alt || form.title || "",
        sort_order: i
      }));
      const orderedNew = newPhotos.map((p, i) => ({
        public_id: p.public_id,
        secure_url: p.secure_url,
        alt: p.alt || form.title || "",
        sort_order: orderedExisting.length + i
      }));

      const payload = {
        ...form,
        price: form.price === "" ? null : Number(form.price),
        tags: form.tags || [],
        photos: [...orderedExisting, ...orderedNew]
      };

      await updateListing(id, payload);
      nav(`/bulletin/${id}`);
    } catch (err) {
      console.error(err);
      alert(err.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-2xl p-4">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Listing</h1>

      {prefillMsg && (
        <div className="mb-3 p-2 text-sm border rounded bg-amber-50">{prefillMsg}</div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input
            className="border px-3 py-2 w-full"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Description</label>
          <textarea
            className="border px-3 py-2 w-full h-40"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Category</label>
            <input
              className="border px-3 py-2 w-full"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Price (optional)</label>
            <input
              type="number"
              className="border px-3 py-2 w-full"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              min="0"
              step="1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-2">Existing Photos</label>
          {existingPhotos.length === 0 ? (
            <div className="text-sm text-gray-600">No photos yet.</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {existingPhotos.map((p, idx) => (
                <div key={p.public_id || p.secure_url || idx} className="relative">
                  <img src={p.secure_url} alt={p.alt || form.title || ""} className="w-full h-28 object-cover rounded" />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-white/90 border text-xs px-2 py-1 rounded"
                    onClick={() => removeExistingPhoto(idx)}
                    title="Remove photo"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm mb-1">Add Photos (up to {Math.max(0, 8 - existingPhotos.length)} more)</label>
          <ImageUploader
            maxFiles={Math.max(0, 8 - existingPhotos.length)}
            onChange={(files) =>
              setNewPhotos(
                files.map((f) => ({
                  public_id: f.public_id,
                  secure_url: f.secure_url,
                  alt: f.original_filename || ""
                }))
              )
            }
          />
          {newPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {newPhotos.map((p, idx) => (
                <div key={p.public_id || p.secure_url || idx} className="relative">
                  <img src={p.secure_url} alt={p.alt || form.title || ""} className="w-full h-28 object-cover rounded" />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-white/90 border text-xs px-2 py-1 rounded"
                    onClick={() => removeNewPhoto(idx)}
                    title="Remove photo"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button disabled={saving} className="border px-4 py-2">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
