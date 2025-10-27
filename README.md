# RKS Chatbot - Frontend

React + TypeScript Frontend mit TailwindCSS und Mobile-First Design.

## 🚀 Deployment auf Coolify (nixpacks)

### 1. Git Repository erstellen

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/DEIN-USERNAME/rks-frontend.git
git push -u origin main
```

### 2. Application in Coolify

1. **New Resource** → **Application**
2. **Git Repository** verbinden
3. **Branch**: `main`
4. **Build Pack**: `nixpacks`
5. **Port**: `3000`

**WICHTIG:** Keine Commands eintragen - `nixpacks.toml` macht alles!

### 3. Umgebungsvariablen

```env
VITE_API_BASE_URL=https://deine-backend-url.com
```

⚠️ **Kein Trailing Slash!**

### 4. Deploy

Klicke auf **"Deploy"** → Fertig! 🎉

## 🔄 Backend CORS aktualisieren

Nach Frontend-Deployment:

1. Gehe zur Backend-Application
2. Environment Variables → `CORS_ORIGINS`
3. Aktualisiere mit Frontend-URL
4. Backend Redeploy

## 🔧 Lokale Entwicklung

```bash
pnpm install
pnpm dev
```

Öffne: http://localhost:5173

## 📋 Features

- ✅ React 18 + TypeScript
- ✅ TailwindCSS (lokal)
- ✅ Mobile-First Design
- ✅ Streaming Chat
- ✅ JWT-Auth
- ✅ Responsive UI

