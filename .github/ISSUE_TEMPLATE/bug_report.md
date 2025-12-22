---
name: Bug report
about: Report a bug or unexpected behavior in @dynshift/layr
title: "[Bug]: "
labels: bug
assignees: MNBLabs, nishanbhuinya

---

## Description

A clear and concise description of the bug.

## Steps to Reproduce

1. Install `@dynshift/layr@1.0.2`
2. Import a component (e.g. `Container`)
3. Use it with props:

```tsx
<Container width={200} height={100}>
  {/* content */}
</Container>
```

4. Observe the unexpected behavior

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

## Environment

* **@dynshift/layr version**: 1.0.2
* **React version**: (e.g. 18.3.1, 19.x)
* **TypeScript version**: (if applicable)
* **Browser / Node environment**: (e.g. Chrome 120, Node 20.11)
* **Build tool**: (e.g. Vite, Next.js, Create React App)

## Code Sample

Minimal reproducible example:

```tsx
import { Container } from '@dynshift/layr';

export default function Example() {
  return (
    <Container width={200}>
      {/* Your code here */}
    </Container>
  );
}
```

## Additional Context

Add screenshots, error logs, stack traces, or any other relevant context here.
