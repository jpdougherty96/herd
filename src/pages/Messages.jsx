// src/pages/Messages.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  fetchAllMyMessages,
  fetchThreadMessages,
  markThreadRead,
  sendMessage,
  fetchProfilesMap,
} from "../lib/bulletinApi";
import { useSearchParams } from "react-router-dom";

export default function Messages() {
  const [sp, setSp] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [active, setActive] = useState(null); // { listing_id, other_id }
  const [chatRows, setChatRows] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [meId, setMeId] = useState(null);

  const chatEndRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { me, rows } = await fetchAllMyMessages();
        setMeId(me);

        const byKey = new Map();
        const needProfiles = new Set();

        for (const m of rows) {
          const other = m.sender_id === me ? m.recipient_id : m.sender_id;
          const key = `${m.listing_id}:${other}`;
          const prev = byKey.get(key) || {
            listing_id: m.listing_id,
            listing_title: m.bulletin_listings?.title || "(listing)",
            other_id: other,
            last_msg: "",
            last_ts: 0,
            unread_count: 0,
          };
          const ts = new Date(m.created_at).getTime();
          if (ts > prev.last_ts) { prev.last_ts = ts; prev.last_msg = m.body; }
          if (m.recipient_id === me && !m.read_at) prev.unread_count += 1;
          byKey.set(key, prev);
          needProfiles.add(other);
        }

        const list = Array.from(byKey.values()).sort((a,b)=>b.last_ts - a.last_ts);
        setThreads(list);

        const map = await fetchProfilesMap(Array.from(needProfiles));
        setProfiles(map);

        const qsListing = sp.get("listing");
        const qsUser = sp.get("user");
        if (qsListing && qsUser) {
          setActive({ listing_id: qsListing, other_id: qsUser });
        } else if (!active && list[0]) {
          setActive({ listing_id: list[0].listing_id, other_id: list[0].other_id });
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    (async () => {
      setChatLoading(true);
      try {
        const { me, rows } = await fetchThreadMessages(active.listing_id, active.other_id);
        if (!meId) setMeId(me);
        setChatRows(rows);
        await markThreadRead(active.listing_id, active.other_id);
        setThreads(prev => prev.map(t =>
          t.listing_id === active.listing_id && t.other_id === active.other_id
            ? { ...t, unread_count: 0 }
            : t
        ));
        setSp(params => {
          const next = new URLSearchParams(params);
          next.set("listing", active.listing_id);
          next.set("user", active.other_id);
          return next;
        }, { replace: true });
      } finally {
        setChatLoading(false);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.listing_id, active?.other_id]);

  async function onSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !active) return;

    setDraft("");
    const sender = meId || "me";

    // Optimistic add
    setChatRows(prev => [
      ...prev,
      {
        id: "temp-" + Math.random(),
        listing_id: active.listing_id,
        sender_id: sender,
        recipient_id: active.other_id,
        body: text,
        created_at: new Date().toISOString(),
      },
    ]);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 10);

    await sendMessage({
      listing_id: active.listing_id,
      recipient_id: active.other_id,
      body: text,
    });
  }

  const sidebar = (
    <div className="border-r w-full md:w-80">
      <div className="p-3 font-semibold">Conversations</div>
      {loading ? (
        <div className="p-3 text-sm text-gray-600">Loading…</div>
      ) : threads.length === 0 ? (
        <div className="p-3 text-sm text-gray-600">No messages yet.</div>
      ) : (
        <ul className="divide-y">
          {threads.map(t => {
            const profile = profiles[t.other_id];
            const name = displayName(profile, t.other_id);
            const isActive = active && t.listing_id === active.listing_id && t.other_id === active.other_id;
            return (
              <li
                key={`${t.listing_id}:${t.other_id}`}
                className={`p-3 cursor-pointer ${isActive ? "bg-gray-50" : "hover:bg-gray-50"}`}
                onClick={() => setActive({ listing_id: t.listing_id, other_id: t.other_id })}
              >
                <div className="text-sm text-gray-600 truncate">{t.listing_title}</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name={name} id={t.other_id} />
                    <div className="font-medium truncate">{name}</div>
                  </div>
                  {t.unread_count > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center text-xs bg-green-600 text-white rounded-full w-5 h-5">
                      {t.unread_count}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 truncate">{t.last_msg}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const chat = (
    <div className="flex-1 flex flex-col">
      {!active ? (
        <div className="p-4 text-sm text-gray-600">Select a conversation.</div>
      ) : (
        <>
          <div className="border-b p-3">
            <div className="font-semibold">
              {threads.find(x => x.listing_id === active.listing_id && x.other_id === active.other_id)?.listing_title || "Listing"}
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Avatar name={displayName(profiles[active.other_id], active.other_id)} id={active.other_id} />
              With {displayName(profiles[active.other_id], active.other_id)}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatLoading ? (
              <div className="text-sm text-gray-600">Loading…</div>
            ) : (
              chatRows.map((m) => {
                const isMe = m.sender_id === meId || m.sender_id === "me";
                const name = isMe ? "You" : displayName(profiles[active.other_id], active.other_id);
                return (
                  <MessageBubble
                    key={m.id}
                    me={isMe}
                    name={name}
                    otherId={!isMe ? active.other_id : meId}
                    body={m.body}
                    created_at={m.created_at}
                  />
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={onSend} className="border-t p-3 flex gap-2">
            <textarea
              className="border flex-1 px-3 py-2 h-20"
              placeholder={`Message ${displayName(profiles[active.other_id], active.other_id)}…`}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              required
            />
            <button className="border px-4 py-2 self-end">Send</button>
          </form>
        </>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl h-[calc(100vh-8rem)] md:h-[70vh] border rounded overflow-hidden flex">
      {sidebar}
      {chat}
    </div>
  );
}

/* ---------- Small helpers & components ---------- */

// Prefer full_name -> name -> username -> short UUID
function displayName(profile, fallbackId) {
  return (
    profile?.full_name ||
    profile?.name ||
    profile?.username ||
    (fallbackId?.slice(0, 8) + "…")
  );
}

function initials(name = "?") {
  const parts = name.trim().split(/\s+/);
  const [a, b] = [parts[0]?.[0], parts[1]?.[0]];
  return ((a || "?") + (b || "")).toUpperCase();
}

// deterministic color for a given user id (other participant)
const COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-amber-600",
  "bg-pink-600", "bg-cyan-600", "bg-indigo-600"
];
function colorClassForId(id = "") {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function Avatar({ name, id }) {
  return (
    <div className={`w-6 h-6 rounded-full text-[10px] text-white flex items-center justify-center ${colorClassForId(id)}`}>
      {initials(name)}
    </div>
  );
}

function MessageBubble({ me, name, otherId, body, created_at }) {
  const bubbleClass = me ? "bg-green-600 text-white" : `${colorClassForId(otherId)} text-white`;
  const wrapClass = me ? "ml-auto text-right" : "";
  return (
    <div className={`max-w-[80%] ${wrapClass}`}>
      <div className="text-[11px] text-gray-500 mb-1">{name}</div>
      <div className={`inline-block px-3 py-2 rounded ${bubbleClass}`}>
        <div className="whitespace-pre-wrap">{body}</div>
      </div>
      <div className="text-[10px] text-gray-500 mt-1">{new Date(created_at).toLocaleString()}</div>
    </div>
  );
}
