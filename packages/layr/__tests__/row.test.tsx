import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MainAxisSize, Row } from "../src/components/row";

describe("Row component", () => {
	it("should have maxWidth 100% to respect parent width constraints", () => {
		const { container } = render(
			<Row>
				<div>Child</div>
			</Row>,
		);

		const rowElement = container.firstChild as HTMLElement;
		expect(rowElement.style.maxWidth).toBe("100%");
	});

	it("should have maxWidth 100% even when mainAxisSize is min", () => {
		const { container } = render(
			<Row mainAxisSize={MainAxisSize.min}>
				<div>Child</div>
			</Row>,
		);

		const rowElement = container.firstChild as HTMLElement;
		expect(rowElement.style.maxWidth).toBe("100%");
	});

	it("should have width 100% when mainAxisSize is max (default)", () => {
		const { container } = render(
			<Row>
				<div>Child</div>
			</Row>,
		);

		const rowElement = container.firstChild as HTMLElement;
		expect(rowElement.style.width).toBe("100%");
	});

	it("should have width auto when mainAxisSize is min", () => {
		const { container } = render(
			<Row mainAxisSize={MainAxisSize.min}>
				<div>Child</div>
			</Row>,
		);

		const rowElement = container.firstChild as HTMLElement;
		expect(rowElement.style.width).toBe("auto");
	});
});
