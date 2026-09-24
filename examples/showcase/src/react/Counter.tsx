import { useState } from "react";

export function Counter({ start = 0, label, onChange }: { start?: number; label: string; onChange?: (n: number) => void }) {
  const [n, setN] = useState(start);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        setN(n + 1);
        onChange?.(n + 1);
      }}
    >
      {label}: {n}
    </button>
  );
}
