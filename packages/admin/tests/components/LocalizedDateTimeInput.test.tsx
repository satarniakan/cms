import { i18n } from "@lingui/core";
import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { LocalizedDateTimeInput } from "../../src/components/LocalizedDateTimeInput.js";
import { render } from "../utils/render.tsx";

import "../../dist/styles.css";

beforeEach(() => {
	i18n.loadAndActivate({ locale: "fa", messages: {} });
});

afterEach(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

const defaults = {
	id: "event-date",
	label: "Event date",
	timezone: "Asia/Tehran",
	value: "2026-03-21T07:00:37.123Z",
};

it("does not change the stored instant or seconds when applied without edits", async () => {
	const onValueChange = vi.fn();
	const screen = await render(
		<LocalizedDateTimeInput {...defaults} onValueChange={onValueChange} />,
	);
	await screen.getByRole("button", { name: "Event date", exact: true }).click();
	await expect.element(screen.getByText("فروردین ۱۴۰۵", { exact: true })).toBeVisible();
	await expect.element(screen.getByRole("textbox", { name: "Hour" })).toHaveValue("۱۰");
	await expect.element(screen.getByRole("textbox", { name: "Minute" })).toHaveValue("۳۰");
	await expect.element(screen.getByText("Asia/Tehran", { exact: true })).toBeVisible();
	await screen.getByRole("button", { name: "Apply", exact: true }).click();
	await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
	expect(onValueChange).not.toHaveBeenCalled();
});

it("discards canceled edits and restores the saved date when reopened", async () => {
	const onValueChange = vi.fn();
	const screen = await render(
		<LocalizedDateTimeInput {...defaults} onValueChange={onValueChange} />,
	);
	const trigger = screen.getByRole("button", { name: "Event date", exact: true });
	await trigger.click();
	await screen.getByRole("button", { name: / ۲-ام فروردین / }).click();
	await screen.getByRole("textbox", { name: "Minute" }).fill("۴۵");
	await screen.getByRole("button", { name: "Cancel", exact: true }).click();
	expect(onValueChange).not.toHaveBeenCalled();
	await expect.element(trigger).toHaveFocus();
	await trigger.click();
	await expect.element(screen.getByRole("textbox", { name: "Minute" })).toHaveValue("۳۰");
	await expect.element(screen.getByRole("gridcell", { selected: true })).toHaveTextContent("۱");
});

it("requires a complete date and time without emitting partial values", async () => {
	const onValueChange = vi.fn();
	const screen = await render(
		<LocalizedDateTimeInput {...defaults} value={null} onValueChange={onValueChange} />,
	);
	await screen.getByRole("button", { name: "Event date", exact: true }).click();
	await screen.getByRole("button", { name: "Apply", exact: true }).click();
	await expect.element(screen.getByRole("alert")).toHaveTextContent("Choose a date");
	const firstDay =
		screen.container.ownerDocument.querySelector<HTMLButtonElement>(".rdp-day_button");
	expect(firstDay).not.toBeNull();
	await userEvent.click(firstDay!);
	await screen.getByRole("button", { name: "Apply", exact: true }).click();
	await expect.element(screen.getByRole("alert")).toHaveTextContent("Enter a time");
	expect(onValueChange).not.toHaveBeenCalled();
});

it("rejects a nonexistent site-local time and accepts a corrected time", async () => {
	const onValueChange = vi.fn();
	const screen = await render(
		<LocalizedDateTimeInput
			{...defaults}
			timezone="Europe/Berlin"
			value="2026-03-29T00:30:00.000Z"
			onValueChange={onValueChange}
		/>,
	);
	await screen.getByRole("button", { name: "Event date", exact: true }).click();
	await screen.getByRole("textbox", { name: "Hour" }).fill("۰۲");
	await screen.getByRole("button", { name: "Apply", exact: true }).click();
	await expect
		.element(screen.getByRole("alert"))
		.toHaveTextContent("That time is ambiguous or does not exist in the site timezone");
	await expect.element(screen.getByRole("dialog")).toBeVisible();
	expect(onValueChange).not.toHaveBeenCalled();
	await screen.getByRole("textbox", { name: "Hour" }).fill("۰۳");
	await screen.getByRole("button", { name: "Apply", exact: true }).click();
	expect(onValueChange).toHaveBeenCalledExactlyOnceWith("2026-03-29T01:30:00.000Z");
});

it("rejects an ambiguous site-local time instead of choosing an offset", async () => {
	const onValueChange = vi.fn();
	const screen = await render(
		<LocalizedDateTimeInput
			{...defaults}
			timezone="Europe/Berlin"
			value="2026-10-25T02:30:00.000Z"
			onValueChange={onValueChange}
		/>,
	);
	await screen.getByRole("button", { name: "Event date", exact: true }).click();
	await screen.getByRole("textbox", { name: "Hour" }).fill("۰۲");
	await screen.getByRole("button", { name: "Apply", exact: true }).click();
	await expect
		.element(screen.getByRole("alert"))
		.toHaveTextContent("That time is ambiguous or does not exist in the site timezone");
	expect(onValueChange).not.toHaveBeenCalled();
});

it("preserves an existing instant in a repeated hour without edits", async () => {
	const onValueChange = vi.fn();
	const screen = await render(
		<LocalizedDateTimeInput
			{...defaults}
			timezone="Europe/Berlin"
			value="2026-10-25T00:30:12.000Z"
			onValueChange={onValueChange}
		/>,
	);
	await screen.getByRole("button", { name: "Event date", exact: true }).click();
	await screen.getByRole("button", { name: "Apply", exact: true }).click();
	await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
	expect(onValueChange).not.toHaveBeenCalled();
});

it("applies once with Enter and follows external value and timezone changes", async () => {
	const onValueChange = vi.fn();
	const screen = await render(
		<LocalizedDateTimeInput {...defaults} onValueChange={onValueChange} />,
	);
	await screen.getByRole("button", { name: "Event date", exact: true }).click();
	await screen.getByRole("textbox", { name: "Minute" }).fill("٤٥");
	await userEvent.keyboard("{Enter}");
	expect(onValueChange).toHaveBeenCalledExactlyOnceWith("2026-03-21T07:15:00.000Z");
	await screen.rerender(
		<LocalizedDateTimeInput
			{...defaults}
			timezone="UTC"
			value="2025-03-20T09:20:00.000Z"
			onValueChange={onValueChange}
		/>,
	);
	await screen.getByRole("button", { name: "Event date", exact: true }).click();
	await expect.element(screen.getByText("اسفند ۱۴۰۳", { exact: true })).toBeVisible();
	await expect.element(screen.getByRole("textbox", { name: "Hour" })).toHaveValue("۰۹");
	await expect.element(screen.getByRole("textbox", { name: "Minute" })).toHaveValue("۲۰");
});

it("displays and uses UTC when the configured site timezone is invalid", async () => {
	const onValueChange = vi.fn();
	const screen = await render(
		<LocalizedDateTimeInput
			{...defaults}
			timezone="Not/A_Timezone"
			onValueChange={onValueChange}
		/>,
	);
	await screen.getByRole("button", { name: "Event date", exact: true }).click();
	await expect.element(screen.getByText("UTC", { exact: true })).toBeVisible();
	await expect.element(screen.getByRole("textbox", { name: "Hour" })).toHaveValue("۰۷");
	await screen.getByRole("textbox", { name: "Minute" }).fill("۱۵");
	await screen.getByRole("button", { name: "Apply", exact: true }).click();
	expect(onValueChange).toHaveBeenCalledExactlyOnceWith("2026-03-21T07:15:00.000Z");
});

it("does not allow editing a read-only field", async () => {
	const screen = await render(
		<LocalizedDateTimeInput {...defaults} readOnly onValueChange={vi.fn()} />,
	);
	await expect
		.element(screen.getByRole("button", { name: "Event date", exact: true }))
		.toBeDisabled();
});

it("leaves English inputs native and preserves ISO conversion and clearing", async () => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
	const onValueChange = vi.fn();
	const screen = await render(
		<LocalizedDateTimeInput {...defaults} onValueChange={onValueChange} />,
	);
	const input = screen.getByLabelText("Event date");
	await expect.element(input).toHaveValue("2026-03-21T10:30");
	await input.fill("2026-03-22T11:00");
	expect(onValueChange).toHaveBeenLastCalledWith("2026-03-22T07:30:00.000Z");
	await input.fill("");
	expect(onValueChange).toHaveBeenLastCalledWith(null);
});
