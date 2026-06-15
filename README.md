# 📚 Research Paper Assistant

> **Enterprise-grade AI platform for intelligent paper discovery, analysis, and collaborative research workflows**

<div align="center">

![Status Badge](https://img.shields.io/badge/status-production--ready-brightgreen?style=for-the-badge)
![License Badge](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
![TypeScript Badge](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript)
![React Badge](https://img.shields.io/badge/React-18+-blue?style=for-the-badge&logo=react)
![Python Badge](https://img.shields.io/badge/Python-3.11+-blue?style=for-the-badge&logo=python)
![MongoDB Badge](https://img.shields.io/badge/MongoDB-Latest-green?style=for-the-badge&logo=mongodb)

[View Demo](#-features) • [Documentation](#-quick-start) • [API Docs](#-backend-architecture) • [Contribute](CONTRIBUTING.md)

</div>

---

## ✨ Overview

A **production-grade full-stack platform** that revolutionizes academic research:

```
📤 Upload Research Papers → 🤖 AI Analysis → 💬 Team Collaboration → 📊 Insights
```

### Key Capabilities
- 🔍 **Intelligent Search** - Text & file-based discovery
- 🧠 **ML Classification** - Subject prediction with TensorFlow/Keras
- 💬 **AI Chatbot** - Ollama-powered paper discussion
- 📝 **Smart Summaries** - AES+HMAC encrypted summaries
- 📈 **Analytics** - Usage patterns, trends, performance metrics
- 👥 **Collaboration** - Multi-user support with role-based access
- 🔐 **Enterprise Security** - JWT auth, rate limiting, IP blocking

---

## 🎯 Perfect For

| User Type | Use Case |
|-----------|----------|
| **Researchers** | Organize & analyze papers, generate insights |
| **Academics** | Literature review, paper discovery |
| **Teams** | Collaborative research, shared annotations |
| **Enterprises** | Document analysis, knowledge management |

---

## 🛠️ Tech Stack

### Backend
```
Framework:     FastAPI • Python 3.11
Database:      MongoDB • Motor (async driver)
ML/AI:         TensorFlow • Keras • Ollama
Authentication: JWT • OAuth-ready
Security:      Rate Limiting • IP Blocking • CORS
```

### Frontend
```
Framework:     React 18 • TypeScript 5
Build Tool:    Vite
Styling:       Tailwind CSS • Framer Motion
Testing:       Playwright (E2E)
State:         Context API
```

### Infrastructure
```
Deployment:    Docker • Docker Compose
Optional:      Gemini API • Redis
Monitoring:    Health checks • Metrics
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + TS)                    │
│  ├─ Landing Page  ├─ Auth  ├─ Dashboard  ├─ Admin Panel     │
└────────────────────────┬────────────────────────────────────┘
                         │ (REST API + WebSocket)
┌────────────────────────┴────────────────────────────────────┐
│                   Backend (FastAPI)                          │
│  ├─ Auth Routes      ├─ Paper Routes    ├─ Analytics API    │
│  ├─ ML Services      ├─ Chatbot API     ├─ Admin Routes     │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│              Data Layer (MongoDB + ML)                       │
│  ├─ User Collection   ├─ Papers DB       ├─ ML Artifacts    │
│  ├─ Sessions          ├─ Analytics       ├─ Cache (Redis)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
```bash
✓ Python 3.11+
✓ Node.js 20+
✓ npm or yarn
✓ MongoDB (local or cloud)
```

### Installation (10 minutes)

#### 1️⃣ Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 2️⃣ Configure Backend
```bash
cp .env.example .env
# Edit .env with your settings:
# - MONGO_URI=mongodb://localhost:27017
# - JWT_SECRET=your-secret-key
```

#### 3️⃣ Start Backend
```bash
python -m uvicorn app.main:app --reload --port 8000
```

**Backend Health:**
- 🌐 Base URL: http://localhost:8000
- 📚 API Docs: http://localhost:8000/docs
- ❤️ Health: http://localhost:8000/healthz

#### 4️⃣ Frontend Setup (New Terminal)
```bash
cd frontend
npm install
npm run dev
```

**Frontend:**
- 🌐 URL: http://localhost:5173

#### 5️⃣ (Optional) Landing Page
```bash
cd landing
npm install
npm run dev
```

---

## 📁 Project Structure

```
research-paper-assistant/
├── 📂 backend/
│   ├── 📂 app/
│   │   ├── 📂 api/                 # Route handlers
│   │   ├── 📂 core/                # Config & security
│   │   ├── 📂 db/                  # MongoDB setup
│   │   ├── 📂 middleware/          # Security, rate limit
│   │   ├── 📂 repositories/        # Data access layer
│   │   ├── 📂 schemas/             # Pydantic models
│   │   ├── 📂 services/            # Business logic
│   │   ├── 📂 artifacts/           # ML models
│   │   └── 📄 main.py              # FastAPI app
│   ├── 📋 requirements.txt
│   ├── ⚙️ .env.example
│   └── 🐳 Dockerfile
│
├── 📂 frontend/
│   ├── 📂 src/
│   │   ├── 📂 pages/               # React pages
│   │   ├── 📂 components/          # React components
│   │   ├── 📂 api/                 # API client
│   │   ├── 📂 routes/              # Route config
│   │   ├── 📂 styles/              # Tailwind CSS
│   │   └── 📄 App.tsx
│   ├── 📋 package.json
│   ├── ⚙️ vite.config.ts
│   └── 🧪 playwright.config.ts
│
├── 📂 landing/
│   └── [Marketing landing page]
│
├── 🐳 docker-compose.yml
└── 📖 README.md
```

---

## 🎨 User Features

### For Researchers
- 📤 Upload PDF/DOCX documents
- 🔍 Search papers by keywords
- 📝 Create notes & annotations
- 💾 Save favorites & collections
- 💬 Chat with papers via Ollama
- 📥 Download summaries
- 📊 View research analytics

### For Admins
- 👥 User management
- 📊 Platform analytics
- 🔍 Session review
- 💬 Feedback management
- 🛡️ System health monitoring
- 🚨 Abuse detection
- ⚙️ Role-based access control

---

## 🔌 API Endpoints

### Authentication
```http
POST   /api/auth/register      # User registration
POST   /api/auth/login         # User login
POST   /api/auth/refresh       # Refresh token
POST   /api/auth/logout        # User logout
```

### Papers
```http
GET    /api/papers             # List papers
POST   /api/papers/search      # Text search
POST   /api/papers/upload      # Upload new paper
GET    /api/papers/{id}        # Get paper details
POST   /api/papers/{id}/save   # Save favorite
```

### Chatbot
```http
POST   /api/chat/ask           # Ask question about paper
GET    /api/chat/history       # Get chat history
```

### Analytics
```http
GET    /api/analytics/usage    # Usage metrics
GET    /api/analytics/trends   # Research trends
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v --cov=app
```

### Frontend Tests
```bash
cd frontend
npm run test:e2e
```

---

## 🐳 Docker Deployment

### Single Container
```bash
docker-compose up --build
```

### Environment Variables
```env
MONGO_URI=mongodb://mongo:27017
MONGO_DB=research_assistant
JWT_SECRET=your-secret-key
GEMINI_API_KEY=optional-gemini-key
REDIS_URL=optional-redis-url
```

---

## 🔒 Security Features

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Rate Limiting** - Prevent abuse
- ✅ **IP Blocking** - Security middleware
- ✅ **CORS** - Cross-origin request handling
- ✅ **Input Validation** - Strict schema validation
- ✅ **Encryption** - AES+HMAC for sensitive data
- ✅ **Environment Config** - No secrets in code

---

## 📚 ML Features

### Subject Classification
- **Algorithm:** TF-IDF + Keras Neural Network
- **Performance:** Multi-class document classification
- **Output:** Probability scores for subjects

### Text Processing
- Document parsing (PDF/DOCX)
- Text extraction & cleaning
- Feature engineering
- Vectorization

### Chatbot Integration
- **Engine:** Ollama (local LLM)
- **Features:** Paper-specific Q&A
- **Privacy:** Runs locally, no external calls

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Quick start
git checkout -b feature/your-feature
# Make changes
git commit -m "feat: description"
git push origin feature/your-feature
```

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |
| [SECURITY.md](SECURITY.md) | Security policies |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards |

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection failed | Check `MONGO_URI` in `.env` |
| Port 8000 in use | Change port: `--port 8001` |
| Frontend won't load | `npm install` & `npm run dev` |
| Ollama not working | Install from [ollama.ai](https://ollama.ai) |

---

## 🎓 Learning Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Guide](https://react.dev/)
- [MongoDB Guide](https://docs.mongodb.com/)
- [TensorFlow/Keras](https://www.tensorflow.org/)

---

## 📞 Support

- 🐛 [Report Issues](https://github.com/rohith-2026/research_paper_assistent/issues)
- 💡 [Request Features](https://github.com/rohith-2026/research_paper_assistent/discussions)
- 📧 Contact maintainers via issues

---

<div align="center">

**🚀 Transform your research workflow with AI**

⭐ Star if this helps your research!

</div>
