<div align="center">

# Layr

> **Flutter-inspired layout primitives for React**

[![npm version](https://img.shields.io/npm/v/@dynshift/layr.svg)](https://www.npmjs.com/package/@dynshift/layr)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

<img src="https://github.com/nishanbhuinya/layr/blob/main/packages/layr/layr.gif" alt="Layr" width="150" />

</div>

## About

Layr brings Flutter's elegant layout system to React with type-safe, zero-dependency components.

- **Familiar API** — Identical to Flutter widgets
- **Lightweight** — Tree-shakeable with zero dependencies
- **Type-safe** — Full TypeScript support
- **Flexible** — Works with any React framework

## Installation

```bash
npm install @dynshift/layr
```

```bash
# Or using other package managers
pnpm add @dynshift/layr
yarn add @dynshift/layr
```

## Quick Example

```tsx
import { Container, Column, Row } from '@dynshift/layr';

function App() {
  return (
    <Container width={320} padding={24} color="#0b0b0b">
      <Column spacing={12}>
        <h1>Hello Layr</h1>
        <Row spacing={8}>
          <button>Action</button>
        </Row>
      </Column>
    </Container>
  );
}
```

## Documentation

Full documentation and API reference available at [layr.dynshift.com](https://layr.dynshift.com).

## Repository Structure

```bash
layr/
├── packages/
│   └── layr/          # Main package (@dynshift/layr)
├── docs/              # Documentation site
└── .github/           # CI/CD workflows
```

## Contributing

Contributions are welcome. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © 2025 [DynShift](https://dynshift.com) & [Nishan Bhuiya](https://nishanbhuinya.com)
