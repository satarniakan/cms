import { i18n } from "@lingui/core";
import * as React from "react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { LocalizedNumberInput } from "../../src/components/LocalizedNumberInput.js";
import { render } from "../utils/render.js";

beforeEach(() => i18n.loadAndActivate({ locale: "fa", messages: {} }));
afterEach(() => i18n.loadAndActivate({ locale: "en", messages: {} }));

function NumberField({ step = "any", min, max }: { step?: string; min?: number; max?: number }) {
	const [value, setValue] = React.useState<number | null>(12);
	return (
		<>
			<LocalizedNumberInput
				label="مقدار"
				value={value}
				onValueChange={setValue}
				step={step}
				min={min}
				max={max}
			/>
			<output>{JSON.stringify(value)}</output>
			<button type="button" onClick={() => setValue(42)}>
				Reset
			</button>
		</>
	);
}

it("displays Persian digits while emitting numeric values for Persian, Arabic and Latin input", async () => {
	const screen = await render(<NumberField />);
	const input = screen.getByRole("textbox", { name: "مقدار" });
	await expect.element(input).toHaveValue("۱۲");
	for (const text of ["−۱۲۳٫۵", "-١٢٣.٥", "-123.5"]) {
		await input.fill(text);
		await expect.element(input).toHaveValue("-۱۲۳٫۵");
		await expect.element(screen.getByRole("status")).toHaveTextContent("-123.5");
	}
	await input.fill("۱٬۲۳۴٫۵");
	await expect.element(screen.getByRole("status")).toHaveTextContent("1234.5");
});

it("preserves a minus sign and a decimal separator while typing", async () => {
	const screen = await render(<NumberField />);
	const input = screen.getByRole("textbox", { name: "مقدار" });
	await input.fill("-");
	await userEvent.keyboard("12.5");
	await expect.element(input).toHaveValue("-۱۲٫۵");
	await expect.element(screen.getByRole("status")).toHaveTextContent("-12.5");
	await input.fill("");
	await expect.element(screen.getByRole("status")).toHaveTextContent("null");
	await expect.element(input).toHaveValue("");
});

it("keeps an unlabelled editor control focused while a negative number is incomplete", async () => {
	function QuietField() {
		const [value, setValue] = React.useState<number | null>(null);
		return (
			<LocalizedNumberInput aria-label="مقدار" value={value} onValueChange={setValue} step="any" />
		);
	}
	const screen = await render(<QuietField />);
	const input = screen.getByRole("textbox", { name: "مقدار" });
	await input.fill("-");
	await expect.element(input).toHaveFocus();
	await userEvent.keyboard("12.5");
	await expect.element(input).toHaveValue("-۱۲٫۵");
	await expect.element(input).toHaveFocus();
});

it("does not emit NaN or infinity and rejects malformed pasted values", async () => {
	const screen = await render(<NumberField />);
	const input = screen.getByRole("textbox", { name: "مقدار" });
	await input.fill("۱۲abc");
	await expect.element(input).toHaveValue("۱۲");
	await input.fill("۱٬۲۳");
	await expect.element(input).toHaveValue("۱۲");
	await input.fill("1e999");
	await expect.element(screen.getByRole("status")).toHaveTextContent("null");
	await expect.element(input).toHaveAttribute("aria-invalid", "true");
	expect((input.element() as HTMLInputElement).checkValidity()).toBe(false);
});

it("enforces integer and range constraints without clamping user values", async () => {
	const screen = await render(<NumberField step="1" min={0} max={20} />);
	const input = screen.getByRole("textbox", { name: "مقدار" });
	for (const text of ["۱٫۵", "-۱", "۲۱"]) {
		await input.fill(text);
		await expect.element(input).toHaveAttribute("aria-invalid", "true");
		expect((input.element() as HTMLInputElement).checkValidity()).toBe(false);
	}
	await input.fill("۲۰");
	await expect.element(input).not.toHaveAttribute("aria-invalid");
	expect((input.element() as HTMLInputElement).checkValidity()).toBe(true);
});

it("keeps Arabic layouts usable with native numeric validation", async () => {
	i18n.loadAndActivate({ locale: "ar", messages: {} });
	const screen = await render(
		<div dir="rtl">
			<NumberField step="1" min={1} max={30} />
		</div>,
	);
	const input = screen.getByRole("spinbutton", { name: "مقدار" });
	await input.fill("24");
	await expect.element(screen.getByRole("status")).toHaveTextContent("24");
	expect((input.element() as HTMLInputElement).checkValidity()).toBe(true);
	await input.fill("31");
	expect((input.element() as HTMLInputElement).checkValidity()).toBe(false);
});

it("reflects external resets and keeps the native number field for English", async () => {
	const screen = await render(<NumberField />);
	await screen.getByRole("textbox", { name: "مقدار" }).fill("۱۵");
	await screen.getByRole("button", { name: "Reset" }).click();
	await expect.element(screen.getByRole("textbox", { name: "مقدار" })).toHaveValue("۴۲");
	i18n.loadAndActivate({ locale: "en", messages: {} });
	await expect.element(screen.getByRole("spinbutton", { name: "مقدار" })).toHaveValue(42);
});
