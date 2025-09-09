import React from 'react'

export default function Footer() {
  return (
    <footer className="bg-herdBeige border-t border-stone-200 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10 text-center text-stone-600">
        © {new Date().getFullYear()} HERD — Homesteading Classes
      </div>
    </footer>
  )
}