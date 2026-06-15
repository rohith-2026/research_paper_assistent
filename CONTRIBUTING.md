# Contributing to Research Paper Assistant

Thank you for your interest in contributing! This document provides guidelines for contributing.

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- Git
- MongoDB (local or cloud)

### Development Setup

```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup (new terminal)
cd frontend
npm install
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming convention:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Test additions

### 2. Make Your Changes

- Keep commits atomic and focused
- Write clear commit messages
- Follow code style guidelines
- Add tests for new functionality

### 3. Code Quality

**Backend:**
```bash
cd backend
black app tests
flake8 app tests
pytest tests/ -v
```

**Frontend:**
```bash
cd frontend
npm run lint
npm run format
npm run test:e2e
```

### 4. Submit Pull Request

- Provide clear description
- Reference related issues
- Ensure all tests pass
- Follow PR template

## Code Style

### Python

- Follow PEP 8
- Use Black for formatting
- Type hints where applicable
- Docstrings for functions

```python
def search_papers(
    query: str,
    limit: int = 10,
    offset: int = 0
) -> List[Paper]:
    """Search papers by query text.
    
    Args:
        query: Search query string
        limit: Results limit
        offset: Results offset
    
    Returns:
        List of matching papers
    """
    # Implementation
```

### TypeScript/React

- Use TypeScript strictly
- Follow ESLint rules
- Functional components
- Hooks for state management

```typescript
interface SearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchProps> = ({ onSearch, placeholder }) => {
  // Implementation
};
```

## Testing Guidelines

- Write tests for new features
- Aim for >80% coverage
- Use descriptive test names
- Test edge cases

```python
def test_search_papers_with_valid_query():
    """Test paper search with valid query."""
    results = search_papers("machine learning", limit=5)
    assert len(results) <= 5
    assert all(isinstance(r, Paper) for r in results)
```

## Documentation

- Update README for significant changes
- Add docstrings to functions
- Include inline comments for complex logic
- Document new APIs

## Reporting Issues

When reporting issues, include:
- Clear, descriptive title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details

## Feature Requests

For feature requests:
- Describe use case
- Explain expected behavior
- Provide examples
- Consider performance impact

## Review Process

1. Automated tests must pass
2. Code quality reviewed
3. Maintainers provide feedback
4. Address feedback & push updates
5. Merge when approved

## Release Process

Versions follow Semantic Versioning (MAJOR.MINOR.PATCH).

Release checklist:
- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped
- [ ] Tag release in Git

## Communication

- Use GitHub Issues for discussions
- Open Issues before starting major work
- Be respectful and inclusive

## License

By contributing, you agree contributions will be licensed under MIT License.

## Questions?

Open an issue or reach out to maintainers.

Thank you for contributing! 🎉