# CrochetEverything 🧶

**Take your idea into a comfy gift.**

CrochetEverything allows you to turn your creative ideas into generated crochet patterns. Whether you have a specific object in mind or just a vague concept, our AI-powered engine helps you visualize and craft the perfect crochet gift.

---

## ✨ Features

- **AI Pattern Generation**: Describe what you want to make, and get a generated pattern description.
- **3D Preview**: Visualize your crochet creation before you start stitching (Coming Soon).
- **Project Management**: Save and organize your crochet projects.
- **Community Gallery**: Share your creations and get inspired by others.

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/almknown/CrochetEverything.git
cd CrochetEverything
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials for:
- **Clerk** (Authentication)
- **Neon** (Database)
- **Gemini API** (AI Generation)

### 3. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Stack

- **Framework**: Next.js 14+ (App Router)
- **Auth**: Clerk
- **Database**: Neon PostgreSQL + Drizzle ORM
- **AI**: Gemini
- **UI**: Shadcn/ui + Tailwind CSS

---

## 📄 License

MIT
