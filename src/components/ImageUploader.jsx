// src/components/ImageUploader.jsx
import React, { useEffect, useRef, useState } from "react";

const WIDGET_SRC = "https://upload-widget.cloudinary.com/latest/global/all.js";

export default function ImageUploader({ maxFiles = 8, onChange }) {
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState([]); // [{public_id, secure_url, alt}]
  const widgetRef = useRef(null);

  // Load widget script once
  useEffect(() => {
    if (window.cloudinary) {
      setReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = WIDGET_SRC;
    s.async = true;
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, []);

  // Build/create the widget
  function openWidget() {
    if (!window.cloudinary || !ready) return;

    if (!widgetRef.current) {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      if (!cloudName || !uploadPreset) {
        alert("Missing Cloudinary env: VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET");
        return;
      }

      widgetRef.current = window.cloudinary.createUploadWidget(
        {
          cloudName,
          uploadPreset,
          multiple: true,
          maxFiles,
          sources: ["local", "camera", "url"],
          showCompletedButton: true,
          showUploadedFile: true,
          cropping: false,
          // optional: folder: "herd-bulletin",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary widget error:", error);
            return;
          }

          // On each successful file
          if (result?.event === "success" && result.info) {
            const { public_id, secure_url, original_filename } = result.info;
            setItems(prev => {
              // enforce maxFiles client-side
              const next = [...prev, {
                public_id,
                secure_url,
                alt: original_filename || ""
              }].slice(0, maxFiles);
              // notify parent
              onChange?.(next);
              return next;
            });
          }

          // When the whole batch is done, Cloudinary emits "queues-end"
          if (result?.event === "queues-end") {
            // Optional: you could toast "uploads complete" here
          }
        }
      );
    }

    widgetRef.current.open();
  }

  function removeAt(i) {
    setItems(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      onChange?.(next);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <button type="button" className="border px-3 py-2" onClick={openWidget} disabled={!ready}>
        {ready ? "Upload Photos" : "Loading uploader…"}
      </button>
      {items.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {items.map((it, i) => (
            <div key={it.secure_url} className="relative">
              <img src={it.secure_url} alt={it.alt || ""} className="w-full h-28 object-cover border" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-1 right-1 bg-white/90 border px-2 text-xs"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="text-xs text-gray-600">Up to {maxFiles} photos.</div>
    </div>
  );
}
