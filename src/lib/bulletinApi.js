// src/lib/bulletinApi.js
import { supabase } from "./supabase";

/** ---------- LISTINGS ---------- */
export async function searchListings({ q = "", state = "", page = 1, pageSize = 20 }) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("bulletin_listings")
    .select(
      "id,title,body,price,city,state,created_at,status,bulletin_photos(secure_url,sort_order)",
      { count: "exact" }
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q?.trim()) query = query.textSearch("search", q.trim(), { type: "plain" });
  if (state) query = query.ilike("state", state);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function getListing(id) {
  const { data, error } = await supabase
    .from("bulletin_listings")
    .select(
      "id,title,body,price,category,tags,city,state,zip,created_at,user_id,status,bulletin_photos(secure_url,public_id,alt,sort_order)"
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createListing(payload, photos) {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) throw new Error("Not signed in");
  const user_id = user.user.id;

  const { data: listing, error } = await supabase
    .from("bulletin_listings")
    .insert([{ ...payload, user_id }])
    .select()
    .single();
  if (error) throw error;

  await replaceListingPhotos(listing.id, photos);
  return listing;
}

export async function updateListing(id, payload, photos = null) {
  const { data, error } = await supabase
    .from("bulletin_listings")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  if (Array.isArray(photos)) {
    await replaceListingPhotos(id, photos);
  }
  return data;
}

export async function deleteListing(id) {
  const { error } = await supabase
    .from("bulletin_listings")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return true;
}

export async function fetchMyListings() {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) throw new Error("Not signed in");
  const me = user.user.id;

  const { data, error } = await supabase
    .from("bulletin_listings")
    .select("id,title,city,state,price,created_at,status,bulletin_photos(secure_url,sort_order)")
    .eq("user_id", me)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Photos: replace entire set (max 8) */
export async function replaceListingPhotos(listing_id, photos) {
  const list = (photos ?? []).slice(0, 8).map((p, i) => ({
    listing_id,
    public_id: p.public_id,
    secure_url: p.secure_url,
    alt: p.alt || "",
    sort_order: i
  }));
  // delete old
  await supabase.from("bulletin_photos").delete().eq("listing_id", listing_id);
  if (list.length) {
    const { error } = await supabase.from("bulletin_photos").insert(list);
    if (error) throw error;
  }
}

/** ---------- MESSAGES ---------- */
export async function sendMessage({ listing_id, recipient_id, body }) {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) throw new Error("Not signed in");
  const sender_id = user.user.id;
  const { error } = await supabase
    .from("bulletin_messages")
    .insert([{ listing_id, sender_id, recipient_id, body }]);
  if (error) throw error;
  return true;
}

export async function fetchAllMyMessages() {
  const { data: user } = await supabase.auth.getUser();
  const me = user?.user?.id;
  if (!me) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("bulletin_messages")
    .select(
      "id,listing_id,sender_id,recipient_id,body,created_at,read_at,bulletin_listings(title)"
    )
    .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return { me, rows: data || [] };
}

export async function fetchThreadMessages(listing_id, other_user_id) {
  const { data: user } = await supabase.auth.getUser();
  const me = user?.user?.id;
  if (!me) throw new Error("Not signed in");

  const filter =
    `and(sender_id.eq.${me},recipient_id.eq.${other_user_id})` +
    `,and(sender_id.eq.${other_user_id},recipient_id.eq.${me})`;

  const { data, error } = await supabase
    .from("bulletin_messages")
    .select(
      "id,listing_id,sender_id,recipient_id,body,created_at,read_at,bulletin_listings(title)"
    )
    .eq("listing_id", listing_id)
    .or(filter)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return { me, rows: data || [] };
}

export async function markThreadRead(listing_id, other_user_id) {
  const { data: user } = await supabase.auth.getUser();
  const me = user?.user?.id;
  if (!me) throw new Error("Not signed in");

  const { error } = await supabase
    .from("bulletin_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("listing_id", listing_id)
    .eq("recipient_id", me)
    .eq("sender_id", other_user_id)
    .is("read_at", null);
  if (error) throw error;
}

export async function fetchProfilesMap(userIds = []) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, name")
    .in("id", ids);
  if (error) {
    console.warn("profiles fetch failed:", error.message);
    return {};
  }
  const map = {};
  for (const p of data || []) map[p.id] = p;
  return map;
}
