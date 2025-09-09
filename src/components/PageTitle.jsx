// src/components/PageTitle.jsx
import { useEffect } from "react";

export default function PageTitle({ title }) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => { document.title = prev; };
  }, [title]);
  return null;
}
