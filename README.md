# 🎵 rickordbox

> **A browser-based music library manager and DJ tool — your tracks, your playlists, your way.**

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)
![SQLite](https://img.shields.io/badge/SQLite-WASM-003B57?style=flat-square&logo=sqlite)

---

## 🚀 What is rickordbox?

**rickordbox** is an open-source, browser-based music collection manager inspired by professional DJ tools. It lets you:

- 🎧 **Import & play** audio files directly in your browser
- 📁 **Organise** your tracks into playlists and nested folders
- 🔍 **Search & browse** your full collection at a glance
- ✏️ **Edit metadata** for individual tracks
- 🔄 **Detect and remove duplicates** in your library
- 📤 **Export playlists** for use in other DJ software
- 💾 **Backup & restore** your entire library database

All data stays local — no server, no cloud, no sign-up required.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| ⚡ Build tool | [Vite](https://vitejs.dev/) |
| 🟦 Language | [TypeScript](https://www.typescriptlang.org/) |
| ⚛️ UI Framework | [React 18](https://react.dev/) |
| 🎨 Component Library | [shadcn/ui](https://ui.shadcn.com/) |
| 💨 Styling | [Tailwind CSS](https://tailwindcss.com/) |
| 🗃️ Database | [sql.js](https://sql.js.org/) (SQLite in WASM) |
| 🎵 Audio Metadata | [music-metadata-browser](https://github.com/Borewit/music-metadata-browser) |

---

## ⚙️ Getting Started

The only requirement is **Node.js & npm** — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
# 1️⃣  Clone the repository
git clone https://github.com/CarlosFranzetti/rickordbox.git

# 2️⃣  Navigate into the project
cd rickordbox

# 3️⃣  Install dependencies
npm install

# 4️⃣  Start the dev server
npm run dev
```

Then open **http://localhost:5173** in your browser. 🎉

---

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | 🔥 Start development server |
| `npm run build` | 🏗️ Build for production |
| `npm run preview` | 👁️ Preview the production build |
| `npm run lint` | 🔎 Run ESLint |
| `npm test` | 🧪 Run tests with Vitest |

---

## 🌐 Editing the Code

**Preferred IDE (local)**

Clone the repo, make changes in your editor of choice, and push back to GitHub.

**GitHub Web Editor**

1. Navigate to the desired file.
2. Click the **✏️ Edit** (pencil) button at the top right.
3. Commit your changes directly from the browser.

**GitHub Codespaces**

1. Click the green **Code** button on the repository page.
2. Select the **Codespaces** tab.
3. Click **New codespace** — your full dev environment spins up instantly.

---

## 🤝 Contributing

Pull requests are welcome! Feel free to open an issue to discuss what you'd like to change.

---

*Built with ❤️ for music lovers and DJs everywhere.*
