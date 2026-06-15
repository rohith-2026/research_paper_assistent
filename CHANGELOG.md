# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-15

### Added

**Frontend Features:**
- React 18 + TypeScript frontend
- User authentication and registration
- Paper search and discovery interface
- File upload for PDF/DOCX
- User dashboard with multiple views
- Admin interface with management tools
- Analytics and graph visualizations
- Notes and collections management
- Chatbot interface for paper Q&A
- Responsive design with Tailwind CSS
- Framer Motion animations
- Playwright E2E tests

**Backend Features:**
- FastAPI REST API
- JWT-based authentication
- MongoDB integration with Motor
- Paper search and recommendation
- ML-based subject classification
- Chatbot integration (Ollama)
- User analytics and metrics
- Admin dashboard endpoints
- Rate limiting and security middleware
- IP blocking capabilities
- CORS configuration
- Health check endpoints

**ML/AI Features:**
- TensorFlow/Keras text classification
- TF-IDF vectorization
- Subject area prediction
- PSNR/SSIM tracking
- Document embedding
- Ollama chatbot integration
- Summary generation
- AES+HMAC encryption

**Infrastructure:**
- Docker containerization
- Docker Compose setup
- Environment-based configuration
- MongoDB Atlas support
- Redis caching (optional)
- Gemini API integration (optional)

### Technical Specifications

- **Backend:** FastAPI on Python 3.11
- **Frontend:** React 18 with TypeScript 5
- **Database:** MongoDB with Motor async driver
- **Testing:** Pytest (backend), Playwright (frontend)
- **Deployment:** Docker & Docker Compose

## [Unreleased]

### Planned

- [ ] CI/CD pipeline with GitHub Actions
- [ ] Batch processing endpoints
- [ ] Advanced graph analytics
- [ ] Model versioning
- [ ] User preference system
- [ ] Email notifications
- [ ] Cloud storage integration (S3/GCS)
- [ ] Advanced search filters
- [ ] PDF annotation tools
- [ ] Team collaboration features
- [ ] Export to BibTeX/JSON
- [ ] Full-text indexing
- [ ] Performance optimizations
- [ ] Mobile app
- [ ] API rate limiting dashboard

### Known Issues

- None currently reported

## Notes

- Project is production-ready for research and demonstration purposes
- Suitable for academic institutions and research teams
- Requires MongoDB for full functionality
- Optional Ollama installation for chatbot features
- Optional Gemini API for enhanced summarization