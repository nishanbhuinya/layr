// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, Container, Text } from "../src/tsx.tsx";

describe("@dynshift/layr/tsx", () => {
  it("renders core widgets from props with LAYR units", () => {
    let pressed = 0;
    render(
      <Container w={200} color="#0d0d0d" cornerRadius={16} objAlign="mid">
        <Text type="h1" color="white">
          Hello
        </Text>
        <Button label="Go" onPress={() => pressed++} />
      </Container>,
    );
    const h = screen.getByRole("heading", { name: "Hello" });
    expect(h.tagName).toBe("H1");
    const box = h.parentElement as HTMLElement;
    expect(box.style.width).toBe("calc(200 * var(--ds) / 1000)");
    expect(box.style.backgroundColor).toBe("rgb(13, 13, 13)");
    screen.getByRole("button", { name: "Go" }).click();
    return new Promise<void>((r) => setTimeout(() => {
      expect(pressed).toBe(1);
      r();
    }, 10));
  });
});
