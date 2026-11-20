import { i18n } from "@lingui/core";
import * as React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { page as browser, userEvent } from "vitest/browser";

import { ListPaginationFooter } from "../../src/components/ListPaginationFooter";
import { render } from "../utils/render.tsx";

const SEARCH_LOAD_MS = 50;

/**
 * A footer over three pages. A page request resolves at once, as a cached page
 * does, unless `pageLoadMs` is set. Typing in the search box, or pressing
 * Reload, starts a load the footer didn't request.
 */
function Harness({
	pageLoadMs,
	initialPage = 1,
	totalCount = 60,
}: {
	pageLoadMs?: number;
	initialPage?: number;
	totalCount?: number;
}) {
	const [page, setPage] = React.useState(initialPage);
	const [perPage, setPerPage] = React.useState(20);
	const [isPending, setIsPending] = React.useState(false);
	const [loads, setLoads] = React.useState(0);
	const load = (ms: number) => {
		setIsPending(true);
		setTimeout(() => {
			setIsPending(false);
			setLoads((count) => count + 1);
		}, ms);
	};
	return (
		<>
			<input aria-label="Search" onChange={() => load(SEARCH_LOAD_MS)} />
			<button type="button" onClick={() => load(SEARCH_LOAD_MS)}>
				Reload
			</button>
			<output>{`Loads finished: ${loads}`}</output>
			<ListPaginationFooter
				label="Posts pagination"
				pageSizes={[20, 50]}
				pagination={{
					page,
					perPage,
					totalCount,
					isPending,
					onPageChange(nextPage) {
						setPage(nextPage);
						if (pageLoadMs !== undefined) load(pageLoadMs);
					},
					onPageSizeChange(nextPerPage) {
						setPerPage(nextPerPage);
						setPage(1);
						if (pageLoadMs !== undefined) load(pageLoadMs);
					},
				}}
			/>
		</>
	);
}

async function settle() {
	await new Promise((resolve) => setTimeout(resolve, SEARCH_LOAD_MS));
}

afterEach(() => i18n.loadAndActivate({ locale: "en", messages: {} }));

describe("ListPaginationFooter", () => {
	it.each([undefined, 50])(
		"uses Persian labels for numeric choices and keeps numeric page values (load=%s)",
		async (pageLoadMs) => {
			i18n.loadAndActivate({ locale: "fa", messages: {} });
			const screen = await render(<Harness pageLoadMs={pageLoadMs} />);
			const page = screen.getByRole("combobox", { name: "Page number" });
			await expect.element(page).toHaveTextContent("۱");
			await page.click();
			await browser.getByRole("option", { name: "۲", exact: true }).click();
			await expect.element(screen.getByText("Showing \u2066۲۱-۴۰\u2069 of ۶۰")).toBeInTheDocument();
			await expect.poll(() => document.activeElement).toBe(page.element());

			const pageSize = screen.getByRole("combobox", { name: "Page size" });
			await expect.element(pageSize).toHaveTextContent("۲۰");
			await pageSize.click();
			await browser.getByRole("option", { name: "۵۰", exact: true }).click();
			await expect.element(page).toHaveTextContent("۱");
			await expect.element(pageSize).toHaveTextContent("۵۰");
			await expect.poll(() => document.activeElement).toBe(pageSize.element());
		},
	);

	it("accepts Persian, Arabic and Latin page numbers for large lists without jumping while typing", async () => {
		i18n.loadAndActivate({ locale: "fa", messages: {} });
		const screen = await render(<Harness totalCount={4000} />);
		const page = screen.getByRole("textbox", { name: "Page number" });
		for (const text of ["۱۲", "٣٤", "56"]) {
			await page.fill(text);
			await userEvent.keyboard("{Enter}");
			await expect.element(page).toHaveFocus();
		}
		await expect.element(page).toHaveValue("۵۶");
		await expect
			.element(screen.getByText("Showing \u2066۱۱۰۱-۱۱۲۰\u2069 of ۴٬۰۰۰"))
			.toBeInTheDocument();
		await page.fill("۵۷");
		await expect
			.element(screen.getByText("Showing \u2066۱۱۰۱-۱۱۲۰\u2069 of ۴٬۰۰۰"))
			.toBeInTheDocument();
		await screen.getByRole("textbox", { name: "Search" }).click();
		await expect
			.element(screen.getByText("Showing \u2066۱۱۲۱-۱۱۴۰\u2069 of ۴٬۰۰۰"))
			.toBeInTheDocument();
	});

	it("restores invalid page text, bounds valid values, and handles an empty list", async () => {
		i18n.loadAndActivate({ locale: "fa", messages: {} });
		const screen = await render(<Harness totalCount={4000} />);
		const page = screen.getByRole("textbox", { name: "Page number" });
		for (const text of ["", "۱٫۵", "۱۲abc", "۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹"]) {
			await page.fill(text);
			await userEvent.keyboard("{Enter}");
			await expect.element(page).toHaveValue("۱");
		}
		await page.fill("۹۹۹");
		await userEvent.keyboard("{Enter}");
		await expect.element(page).toHaveValue("۲۰۰");
		await expect.element(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
		await page.fill("۰");
		await userEvent.keyboard("{Enter}");
		await expect.element(page).toHaveValue("۱");
		await screen.rerender(<Harness totalCount={0} />);
		await expect.element(screen.getByText("Showing \u2066۰-۰\u2069 of ۰")).toBeInTheDocument();
		await expect.element(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
		await expect.element(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
	});

	it("returns focus to the control after the page it requested loads", async () => {
		const screen = await render(<Harness pageLoadMs={50} />);

		const nextPage = screen.getByRole("button", { name: "Next page" });
		await nextPage.click();

		await expect.element(screen.getByText("Loads finished: 1")).toBeInTheDocument();
		await expect.poll(() => document.activeElement).toBe(nextPage.element());
	});

	it("leaves focus alone after a load it didn't start", async () => {
		const screen = await render(<Harness />);

		await screen.getByRole("button", { name: "Next page" }).click();
		const search = screen.getByRole("textbox", { name: "Search" });
		await search.fill("d");

		await expect.element(screen.getByText("Loads finished: 1")).toBeInTheDocument();
		await settle();
		expect(document.activeElement).toBe(search.element());
	});

	it.each([
		["Page number", "3"],
		["Page size", "50"],
	])(
		"returns focus to the %s dropdown after the page picked from it loads",
		async (name, option) => {
			const screen = await render(<Harness pageLoadMs={50} />);
			const dropdown = screen.getByRole("combobox", { name });

			await dropdown.click();
			await browser.getByRole("option", { name: option, exact: true }).click();

			await expect.element(screen.getByText("Loads finished: 1")).toBeInTheDocument();
			await expect.poll(() => document.activeElement).toBe(dropdown.element());
		},
	);

	it("moves focus to the page picker when the page reached disables the pressed button", async () => {
		const screen = await render(<Harness initialPage={2} />);

		await screen.getByRole("button", { name: "Previous page" }).click();

		await expect
			.poll(() => document.activeElement)
			.toBe(screen.getByRole("combobox", { name: "Page number" }).element());
	});

	it("drops a request served without loading, so a later load doesn't take focus", async () => {
		const screen = await render(<Harness />);

		await screen.getByRole("button", { name: "Next page" }).click();
		await screen.getByRole("button", { name: "Reload" }).click();
		(document.activeElement as HTMLElement).blur();

		await expect.element(screen.getByText("Loads finished: 1")).toBeInTheDocument();
		await settle();
		expect(document.activeElement).toBe(document.body);
	});

	it.each([
		["a cached page", undefined],
		["a page that loads", 50],
	])(
		"leaves focus outside the footer alone when %s is requested without moving it",
		async (_case, pageLoadMs) => {
			const screen = await render(<Harness pageLoadMs={pageLoadMs} />);
			const search = screen.getByRole("textbox", { name: "Search" }).element() as HTMLElement;
			search.focus();

			(screen.getByRole("button", { name: "Next page" }).element() as HTMLElement).click();

			await expect.element(screen.getByText("Showing 21-40 of 60")).toBeInTheDocument();
			await settle();
			expect(document.activeElement).toBe(search);
		},
	);

	it("leaves focus where it was moved while the requested page loads", async () => {
		const screen = await render(<Harness pageLoadMs={500} />);

		await screen.getByRole("button", { name: "Next page" }).click();
		const search = screen.getByRole("textbox", { name: "Search" });
		search.element().focus();

		await expect.element(screen.getByText("Loads finished: 1")).toBeInTheDocument();
		await settle();
		expect(document.activeElement).toBe(search.element());
	});
});
