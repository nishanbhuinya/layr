<div align="center">

# @dynshift/layr

> **Flutter-inspired layout primitives for React**

[![npm version](https://img.shields.io/npm/v/@dynshift/layr.svg?style=flat-square)](https://www.npmjs.com/package/@dynshift/layr)
[![npm downloads](https://img.shields.io/npm/dm/@dynshift/layr.svg?style=flat-square)](https://www.npmjs.com/package/@dynshift/layr)
[![license](https://img.shields.io/npm/l/@dynshift/layr.svg?style=flat-square)](https://github.com/nishanbhuinya/layr/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

<img src="https://github.com/nishanbhuinya/layr/blob/main/packages/layr/layr.gif" alt="Layr" width="150" />

[Documentation](https://layr.dynshift.com) · [GitHub](https://github.com/nishanbhuinya/layr) · [npm](https://www.npmjs.com/package/@dynshift/layr)

</div>

## Features

- **Flutter-inspired API** — Familiar patterns for Flutter developers transitioning to React
- **Zero dependencies** — Lightweight and fully tree-shakeable
- **TypeScript-first** — Complete type definitions out of the box
- **React 18 & 19** — Optimized for modern React with full compatibility
- **Comprehensive styling** — Decorations, shadows, gradients, and borders built-in
- **Flexible layouts** — Stack, Row, Column with powerful alignment controls

## Installation

```bash
npm install @dynshift/layr
```

```bash
# Using other package managers
pnpm add @dynshift/layr
yarn add @dynshift/layr
bun add @dynshift/layr
```

## Quick Start

```tsx
import { Container, Column, Row } from '@dynshift/layr';

export function Card() {
  return (
    <Container
      width={320}
      padding={24}
      decoration={{
        color: '#1a1a1a',
        borderRadius: 16,
        boxShadow: [{ color: 'rgba(0,0,0,0.2)', blurRadius: 12 }],
      }}
    >
      <Column spacing={12}>
        <Row spacing={8}>
          <Container width={40} height={40} color="#3b82f6" decoration={{ borderRadius: 8 }} />
          <span>Welcome to Layr</span>
        </Row>
        <p>Build layouts the Flutter way.</p>
      </Column>
    </Container>
  );
}
```

## Components

### Container

A versatile box with comprehensive styling options including padding, margin, decoration, shadows, gradients, and borders.

```tsx
<Container
  width={200}
  height={100}
  padding={16}
  margin={8}
  color="#1a1a1a"
  decoration={{
    borderRadius: 12,
    boxShadow: [{ color: 'rgba(0,0,0,0.1)', blurRadius: 10 }],
  }}
>
  {children}
</Container>
```

### Column

Displays children in a vertical arrangement with spacing and alignment controls.

```tsx
<Column
  spacing={16}
  mainAxisAlignment={MainAxisAlignment.center}
  crossAxisAlignment={CrossAxisAlignment.start}
>
  {children}
</Column>
```

### Row

Displays children in a horizontal arrangement with spacing and alignment controls.

```tsx
<Row
  spacing={12}
  mainAxisAlignment={MainAxisAlignment.spaceBetween}
  crossAxisAlignment={CrossAxisAlignment.center}
>
  {children}
</Row>
```

### Stack

Positions children in layers, enabling overlapping elements. Children are painted in order (first = bottom, last = top).

```tsx
<Stack fit={StackFit.expand}>
  <Container color="#000" />
  <Positioned top={10} left={10}>
    <Container width={50} height={50} color="#fff" />
  </Positioned>
</Stack>
```

### Positioned & PositionedFill

Absolute positioning within a Stack.

```tsx
<Positioned top={0} right={0} bottom={0} left={0}>
  {children}
</Positioned>

<PositionedFill>
  {children}
</PositionedFill>
```

### SizedBox

Constrains its child to a specific width and height. Useful as a spacer or for fixed-size containers.

```tsx
<SizedBox width={100} height={100}>
  {children}
</SizedBox>

{/* As a spacer */}
<SizedBox height={20} />
```

### Padding

A lightweight wrapper that applies padding to its child.

```tsx
<Padding padding={16}>
  {children}
</Padding>

<Padding padding={{ horizontal: 20, vertical: 10 }}>
  {children}
</Padding>
```

### Centre / Center

Centers its child both horizontally and vertically. Both spellings are supported.

```tsx
<Centre>
  {children}
</Centre>
```

## Advanced Usage

### Edge Insets Helpers

Utility functions for creating padding and margin values in Flutter style.

```tsx
import { EdgeInsetsAll, EdgeInsetsSymmetric, EdgeInsetsOnly } from '@dynshift/layr';

<Container padding={EdgeInsetsAll(16)} />
<Container padding={EdgeInsetsSymmetric({ horizontal: 20, vertical: 10 })} />
<Container margin={EdgeInsetsOnly({ top: 10, left: 20 })} />
```

### Border Helpers

```tsx
import { BorderAll, BorderRadiusCircular } from '@dynshift/layr';

<Container
  decoration={{
    border: BorderAll({ width: 2, color: '#3b82f6', style: 'solid' }),
    borderRadius: BorderRadiusCircular(12),
  }}
/>
```

### Box Shapes

```tsx
import { BoxShape } from '@dynshift/layr';

<Container
  width={100}
  height={100}
  decoration={{
    color: '#3b82f6',
    shape: BoxShape.circle,
  }}
/>
```

### Alignment Enums

```tsx
import { MainAxisAlignment, CrossAxisAlignment, StackFit } from '@dynshift/layr';

<Column mainAxisAlignment={MainAxisAlignment.spaceBetween}>
  {children}
</Column>

<Row crossAxisAlignment={CrossAxisAlignment.stretch}>
  {children}
</Row>

<Stack fit={StackFit.expand}>
  {children}
</Stack>
```

## TypeScript Support

Full type definitions are included for all components and utilities:

```tsx
import type {
  ContainerProps,
  ColumnProps,
  RowProps,
  StackProps,
  EdgeInsets,
  BoxDecoration,
  Alignment,
} from '@dynshift/layr';
```

## Documentation

For complete documentation, examples, and API reference, visit [layr.dynshift.com](https://layr.dynshift.com).

## Contributing

Contributions are welcome. Please see the [GitHub repository](https://github.com/nishanbhuinya/layr) for guidelines.

## License

MIT © 2025 [DynShift](https://dynshift.com) & [Nishan Bhuiya](https://nishanbhuinya.com)
