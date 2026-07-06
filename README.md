# 🎵 rickordbox

> **A browser-based music library manager and DJ tool — your tracks, your playlists, your way. Up to 10× faster USB exports than rekordbox.**

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)![SQLite](https://img.shields.io/badge/SQLite-WASM-003B57?style=flat-square&logo=sqlite)

## 🚀 What is rickordbox?

**rickordbox** is an open-source, browser-based music collection manager inspired by professional DJ tools. It lets you manage your library locally without the heavy analysis wait times of traditional software.

### ✨ Key Features
- 🎧 **Smart Import:** Drag-and-drop audio files (MP3, WAV, FLAC, etc.) with auto-metadata reading.
- 🔌 **USB Recovery:** Scan and re-import files from existing Pioneer or Denon USB structures.
- 📤 **Multi-Device Export:** Fast exports for Pioneer CDJ/XDJ, Denon Engine OS, or Generic USB.
- 🩺 **Library Health:** Identify incompatible formats or missing metadata instantly.
- 💾 **Local-First:** All data stays in your browser using SQLite WASM. No cloud, no sign-up.
- 🔄 **Duplicate Detection:** Keep your library clean and organized.

## ⚡ Why rickordbox?

Traditional software like rekordbox spends 30–60 minutes analyzing tracks for USB exports. **rickordbox skips the wait.** It copies files directly to the correct folder structure, making exports up to 10x faster. Let the hardware handle the waveform generation when you play!

## 🛠️ Tech Stack
- **Frontend:** React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Build Tool:** Vite
- **Database:** SQLite (via sql.js/WASM)
- **Metadata:** music-metadata-browser

## ⚙️ Getting Started

### Prerequisites
- Node.js & npm

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/CarlosFranzetti/rickordbox.git

# 2. Navigate into the project
cd rickordbox

# 3. Install dependencies
npm install

# 4. Start the dev server
npm run dev
```

## 🌐 Demo
Check out the live app here: [https://rickordbox.lovable.app](https://rickordbox.lovable.app)

## 🤝 Contributing
Pull requests are welcome! Feel free to open an issue to discuss what you'd like to change.

*Built with ❤️ for music lovers and DJs everywhere.*