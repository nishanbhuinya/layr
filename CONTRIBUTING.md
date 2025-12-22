# Contributing to Layr

Thank you for considering contributing to Layr.

## How to Contribute

### Reporting Issues

- Use the [GitHub issue tracker](https://github.com/nishanbhuinya/layr/issues)
- Include a minimal reproduction
- Specify your environment (Node version, React version, OS)

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Run type check: `pnpm typecheck`
6. Run linter: `pnpm lint`
7. Commit with clear messages
8. Push to your fork
9. Open a pull request

## Development Setup
```bash
# Clone the repository
git clone <https://github.com/nishanbhuinya/layr.git>
cd layr

# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

## Code Style

- Use TypeScript for all new code
- Follow existing patterns (Flutter-style API)
- Add JSDoc comments for public APIs
- Keep inline styles intentional (this library compiles to inline CSS)

## Commit Guidelines

Use conventional commits:

- `feat: add new component`
- `fix: resolve alignment issue in Row`
- `docs: update README examples`
- `chore: upgrade dependencies`

## Questions?

Open a [discussion](https://github.com/nishanbhuinya/layr/discussions) or reach out via [Instagram](https://www.instagram.com/nishanbhuinya).
