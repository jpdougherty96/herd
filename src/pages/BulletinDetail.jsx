// src/pages/BulletinDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getListing, sendMessage, deleteListing } from "../lib/bulletinApi";
import { supabase } from "../lib/supabase";

function displayName(profile, fallbackId) {
  return (profile?.full_name || profile?.name || (fallbackId?.slice(0,8)+"…"));
}

export default function BulletinDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [listing, setListing] = useState(null);
  const [poster, setPoster] = useState(null);
  const [me, setMe] = useState(null);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [hasThread, setHasThread] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setMe(u?.user?.id || null);
      const data = await getListing(id);
      setListing(data);
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      if (!listing?.user_id) return;
      const { data } = await supabase
        .from("profiles").select("id, full_name, name").eq("id", listing.user_id).single();
      if (data) setPoster(data);
    })();
  }, [listing?.user_id]);

  useEffect(() => {
    (async () => {
      if (!listing?.id || !listing?.user_id || !me || me === listing.user_id) {
        setHasThread(false); return;
      }
      const { data } = await supabase
        .from("bulletin_messages")
        .select("id", { count: "exact" })
        .eq("listing_id", listing.id)
        .or(`and(sender_id.eq.${me},recipient_id.eq.${listing.user_id}),and(sender_id.eq.${listing.user_id},recipient_id.eq.${me})`)
        .limit(1);
      setHasThread((data?.length || 0) > 0);
    })();
  }, [listing?.id, listing?.user_id, me]);

  if (!listing) return <div className="p-4">Loading…</div>;

  const isOwner = me && listing.user_id === me;
  const posterName = displayName(poster, listing.user_id);
  const threadLink = `/messages?listing=${listing.id}&user=${listing.user_id}`;
  const photos = (listing.bulletin_photos || []).sort((a,b)=>a.sort_order-b.sort_order);

  async function onSend(e) {
    e.preventDefault();
    const body = message.trim();
    if (!body) return;
    setSending(true);
    try {
      await sendMessage({ listing_id: listing.id, recipient_id: listing.user_id, body });
      setMessage(""); setMessageSent(true); setHasThread(true);
    } finally {
      setSending(false);
    }
  }

  async function onDelete() {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    await deleteListing(listing.id);
    nav("/bulletin/mine");
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold mb-2 uppercase">{listing.title}</h1>
      <div className="text-sm mb-2">{listing.city}, {listing.state} {listing.price ? `· $${Number(listing.price).toLocaleString()}` : ""}</div>

      {isOwner && (
        <div className="flex gap-2 mb-4">
          <button className="border px-3 py-1" onClick={()=>nav(`/bulletin/${listing.id}/edit`)}>Edit</button>
          <button className="border px-3 py-1 text-red-600" onClick={onDelete}>Delete</button>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {photos.map(p => <img key={p.secure_url} src={p.secure_url} alt={p.alt || ""} className="w-full h-44 object-cover" />)}
        </div>
      )}

      <div className="prose mb-6 whitespace-pre-wrap">{listing.body}</div>

      {/* Contact area */}
      {!isOwner && (
        <>
          {!me ? (
            <div className="p-3 border rounded bg-amber-50">
              To contact <strong>{posterName}</strong>, please{" "}
              <Link className="underline" to={`/login?redirect=/bulletin/${listing.id}`}>log in</Link>.
            </div>
          ) : (hasThread || messageSent) ? (
            <div className="p-3 border rounded bg-green-50">
              You already have a conversation with <strong>{posterName}</strong>.{" "}
              <Link className="underline" to={threadLink}>Go to Messages</Link>
            </div>
          ) : (
            <form onSubmit={onSend} className="space-y-2">
              <div className="text-sm text-gray-600 mb-1">Messaging <strong>{posterName}</strong> (private)</div>
              <textarea className="border w-full px-3 py-2 h-28" value={message}
                        onChange={e=>setMessage(e.target.value)} placeholder={`Ask ${posterName} a question…`} required />
              <button disabled={sending} className="border px-4 py-2">{sending ? "Sending…" : "Send Message"}</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
