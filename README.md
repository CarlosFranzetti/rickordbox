<p align="center">
  <img src="https://raw.githubusercontent.com/CarlosFranzetti/rickordbox/main/public/favicon.svg" alt="rickordbox logo" width="120" height="120">
</p>

<h1 align="center">🎵 rickordbox 🎧</h1>

<p align="center">
  <strong>🚀 Your tracks. Your playlists. Your way. 🚀</strong>
</p>

<p align="center">
  <em>A browser-based music library manager and DJ tool — up to <b>10× faster</b> USB exports than rekordbox!</em>
</p>

<p align="center">
  <a href="#-features"><img src="https://img.shields.io/badge/✨-Features-ff69b4?style=for-the-badge" alt="Features"></a>
  <a href="#-quick-start"><img src="https://img.shields.io/badge/🚀-Quick_Start-00d4aa?style=for-the-badge" alt="Quick Start"></a>
  <a href="#-contributing"><img src="https://img.shields.io/badge/🤝-Contributing-9cf?style=for-the-badge" alt="Contributing"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/SQLite-WASM-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite">
</p>

<p align="center">
  <img src="https://img.shields.io/github/license/CarlosFranzetti/rickordbox?style=flat-square&color=green" alt="License">
  <img src="https://img.shields.io/github/stars/CarlosFranzetti/rickordbox?style=flat-square&color=yellow" alt="Stars">
  <img src="https://img.shields.io/github/forks/CarlosFranzetti/rickordbox?style=flat-square&color=blue" alt="Forks">
  <img src="https://img.shields.io/github/issues/CarlosFranzetti/rickordbox?style=flat-square&color=red" alt="Issues">
</p>

---

## 📖 Table of Contents

- [🎯 What is rickordbox?](#-what-is-rickordbox)
- [⚡ Why It's Faster](#-why-its-faster)
- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [📦 Scripts](#-scripts)
- [🤝 Contributing](#-contributing)
- [🔐 Security](#-security)
- [❤️ Support](#️-support)

---

## 🎯 What is rickordbox?

<table>
<tr>
<td width="60%">

**rickordbox** is an open-source, browser-based music collection manager inspired by professional DJ tools. 

🔒 **100% Private** — All data stays local on YOUR device  
☁️ **No Cloud** — No server, no sign-up, no tracking  
💨 **Lightning Fast** — Export to USB in seconds, not hours  
🎨 **Modern UI** — Beautiful, intuitive interface  

</td>
<td width="40%">

```
  🎧 Import & Play
  📁 Organize Playlists  
  🔍 Search & Browse
  ✏️ Edit Metadata
  🔄 Remove Duplicates
  📤 Export to USB
  💾 Backup Library
```

</td>
</tr>
</table>

---

## ⚡ Why It's Faster

<table>
<tr>
<td align="center">
  
### 🐢 rekordbox

*30-60 minutes for 500 tracks*

</td>
<td align="center">

### ⚡ rickordbox

*< 1 minute for 500 tracks*

</td>
</tr>
</table>

| Operation | rekordbox | rickordbox |
|:----------|:---------:|:----------:|
| Beat grid analysis | ✅ Slow | ⏭️ Skipped |
| Waveform generation | ✅ Slow | ⏭️ Skipped |
| ANLZ / memory cue files | ✅ Slow | ⏭️ Skipped |
| **USB Export (500 tracks)** | 🐢 20-40 min | 🚀 **< 1 min** |

> 💡 **Pro tip:** Beat grids and waveforms are generated live on CDJ hardware when you load a track — same result, zero wait time at your desk!

---

## ✨ Features

<table>
<tr>
<td>

### 📥 Smart Import
- 🖱️ Drag-and-drop or browse
- 🎵 Supports **MP3, WAV, FLAC, AIFF, M4A, AAC, OGG, WMA, OPUS**
- 📝 Auto-reads metadata (title, artist, BPM, key, cover art)
- 📂 Auto-creates playlists from folder hierarchy

</td>
<td>

### 🔌 USB Recovery
- 🆘 Lost your database? No problem!
- 📀 Scan and re-import from USB drives
- 🎛️ Pioneer `/Contents/` support
- 🎚️ Denon `/Engine Library/` support

</td>
</tr>
<tr>
<td>

### 🖥️ Multi-Device Export
| Profile | Hardware |
|---------|----------|
| 🔴 **Pioneer** | CDJ-2000NXS2, CDJ-3000, XDJ-RX3, XDJ-XZ |
| 🟢 **Denon** | SC6000, SC5000, Prime 4, Prime Go |
| ⚪ **Generic** | Any media player |

</td>
<td>

### 🩺 Library Health
- ⚠️ Detect incompatible formats
- 🔍 Find unknown file types  
- 📋 Identify missing metadata
- ✅ Fix issues before export

</td>
</tr>
<tr>
<td colspan="2">

### 💾 Database Backups
🔄 **Auto-save** (configurable) • 📥 **Manual backup** • 📤 **Easy restore** • 🛡️ **Pre-import snapshots**

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

<table>
<tr>
<td align="center" width="96">
  <img src="https://skillicons.dev/icons?i=vite" width="48" height="48" alt="Vite" />
  <br>Vite
</td>
<td align="center" width="96">
  <img src="https://skillicons.dev/icons?i=ts" width="48" height="48" alt="TypeScript" />
  <br>TypeScript
</td>
<td align="center" width="96">
  <img src="https://skillicons.dev/icons?i=react" width="48" height="48" alt="React" />
  <br>React 18
</td>
<td align="center" width="96">
  <img src="https://skillicons.dev/icons?i=tailwind" width="48" height="48" alt="Tailwind" />
  <br>Tailwind
</td>
<td align="center" width="96">
  <img src="https://skillicons.dev/icons?i=sqlite" width="48" height="48" alt="SQLite" />
  <br>SQLite
</td>
</tr>
</table>

| Layer | Technology | Description |
|:------|:-----------|:------------|
| ⚡ Build | [Vite](https://vitejs.dev/) | Next-gen frontend tooling |
| 🟦 Language | [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |
| ⚛️ UI | [React 18](https://react.dev/) | Modern reactive framework |
| 🎨 Components | [shadcn/ui](https://ui.shadcn.com/) | Beautiful, accessible components |
| 💨 Styling | [Tailwind CSS](https://tailwindcss.com/) | Utility-first CSS |
| 🗃️ Database | [sql.js](https://sql.js.org/) | SQLite in WebAssembly |
| 🎵 Metadata | [music-metadata-browser](https://github.com/Borewit/music-metadata-browser) | Audio tag parsing |

---

## 🚀 Quick Start

### Prerequisites

> 📋 **Required:** Node.js & npm — [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```bash
# 1️⃣ Clone the repo
git clone https://github.com/CarlosFranzetti/rickordbox.git

# 2️⃣ Navigate to project
cd rickordbox

# 3️⃣ Install dependencies
npm install

# 4️⃣ Start dev server
npm run dev
```

### 🎉 Open [http://localhost:5173](http://localhost:5173) and start mixing!

---

## 📦 Scripts

| Command | Description |
|:--------|:------------|
| `npm run dev` | 🔥 Start development server |
| `npm run build` | 🏗️ Build for production |
| `npm run preview` | 👁️ Preview production build |
| `npm run lint` | 🔎 Run ESLint |
| `npm test` | 🧪 Run Vitest tests |

---

## 💻 Development Options

<details>
<summary><b>🖥️ Local Development</b></summary>

Clone the repo, make changes in your favorite editor, and push back to GitHub.

</details>

<details>
<summary><b>🌐 GitHub Web Editor</b></summary>

1. Navigate to the file you want to edit
2. Click the **✏️ Edit** button
3. Commit changes directly from your browser!

</details>

<details>
<summary><b>☁️ GitHub Codespaces</b></summary>

1. Click the green **Code** button
2. Select **Codespaces** tab
3. Click **New codespace** — instant dev environment!

</details>

---

## 🤝 Contributing

Contributions are what make the open source community amazing! 🌟

1. 🍴 Fork the Project
2. 🌿 Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. 💾 Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. 📤 Push to the Branch (`git push origin feature/AmazingFeature`)
5. 🎉 Open a Pull Request

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for detailed guidelines.

---

## 🔐 Security

We take security seriously! Please see our [Security Policy](.github/SECURITY.md) for:
- 🛡️ Supported versions
- 🚨 How to report vulnerabilities
- ⏱️ Response timelines

---

## ❤️ Support

<p align="center">
  If you find rickordbox useful, please consider giving it a ⭐!
</p>

<p align="center">
  <a href="https://github.com/CarlosFranzetti/rickordbox/stargazers">
    <img src="https://img.shields.io/github/stars/CarlosFranzetti/rickordbox?style=social" alt="Star on GitHub">
  </a>
</p>

---

<p align="center">
  <sub>Built with ❤️ by DJs, for DJs</sub>
</p>

<p align="center">
  <sub>🎧 Happy mixing! 🎶</sub>
</p>
