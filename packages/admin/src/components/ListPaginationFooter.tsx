import { InputGroup, Pagination, Select } from "@cloudflare/kumo";
import { useLingui } from "@lingui/react/macro";
import {
	CaretDoubleLeftIcon,
	CaretDoubleRightIcon,
	CaretLeftIcon,
	CaretRightIcon,
} from "@phosphor-icons/react";
import * as React from "react";

import { localizeNumberInput, normalizeNumberInput } from "../lib/localized-number.js";

export interface ListPagination {
	page: number;
	perPage: number;
	totalCount: number;
	isPending: boolean;
	onPageChange: (page: number) => void;
	onPageSizeChange: (perPage: number) => void;
}

/** Above this many pages the page picker is a number input instead of a dropdown. */
const MAX_PAGE_DROPDOWN_ITEMS = 100;
const PAGE_NUMBER = /^\d+$/;

interface ListPaginationFooterProps {
	pagination: ListPagination;
	pageSizes: number[];
	/** Accessible name of the pagination navigation. */
	label: string;
}

/**
 * Numbered pagination pinned to the bottom of the admin's scrolling `<main>`.
 * Render it as the last child of a `flex min-h-full flex-col` page so short
 * lists keep it at the bottom of the viewport.
 */
export function ListPaginationFooter({ pagination, pageSizes, label }: ListPaginationFooterProps) {
	const { t, i18n } = useLingui();
	const pageCount = Math.max(1, Math.ceil(pagination.totalCount / pagination.perPage));
	const [editingPage, setEditingPage] = React.useState({
		page: pagination.page,
		text: String(pagination.page),
	});
	const pageText =
		editingPage.page === pagination.page ? editingPage.text : String(pagination.page);
	const paginationRootRef = React.useRef<HTMLElement>(null);
	const requestRef = React.useRef<{
		focusTarget: HTMLElement | null;
		fallback: "page" | "page-size";
		sawPending: boolean;
	} | null>(null);

	const rememberRequest = (fallback: "page" | "page-size") => {
		requestRef.current = {
			focusTarget: document.activeElement instanceof HTMLElement ? document.activeElement : null,
			fallback,
			sawPending: false,
		};
	};
	const requestPage = (nextPage: number) => {
		if (pagination.isPending || nextPage === pagination.page) return;
		if (!Number.isSafeInteger(nextPage) || nextPage < 1 || nextPage > pageCount) return;
		rememberRequest("page");
		pagination.onPageChange(nextPage);
	};
	const requestPageSize = (nextPerPage: number) => {
		if (
			pagination.isPending ||
			nextPerPage === pagination.perPage ||
			!pageSizes.includes(nextPerPage)
		) {
			return;
		}
		rememberRequest("page-size");
		pagination.onPageSizeChange(nextPerPage);
	};
	const commitPage = () => {
		const value = normalizeNumberInput(pageText).trim();
		const nextPage =
			PAGE_NUMBER.test(value) && Number.isSafeInteger(Number(value))
				? Math.min(pageCount, Math.max(1, Number(value)))
				: pagination.page;
		setEditingPage({ page: nextPage, text: String(nextPage) });
		requestPage(nextPage);
	};
	// Focus leaves the controls while they are inert during a load, and the
	// page reached can disable the button that was pressed (Previous on page 2).
	// Once the requested page settles, put focus back unless the user has moved
	// it. Page changes also run this, so a request served without loading (a
	// cached page) is dropped instead of claiming a later, unrelated load.
	React.useEffect(() => {
		const request = requestRef.current;
		if (!request) return;
		if (pagination.isPending) {
			request.sawPending = true;
			return;
		}
		requestRef.current = null;
		const target = request.focusTarget;
		// A dropdown pick saves its popup option, which never takes focus back.
		const targetUsable =
			!!target?.isConnected && !target.matches(":disabled") && !target.closest('[role="listbox"]');
		const active = document.activeElement;
		const focusMoved = !!active && active !== document.body && active !== target;
		if (focusMoved || (targetUsable && !request.sawPending)) return;
		const slot = request.fallback === "page-size" ? "pagination-page-size" : "pagination-controls";
		const focusTarget = targetUsable
			? target
			: ['[role="combobox"]', "input", "button:not(:disabled)"]
					.map((control) =>
						paginationRootRef.current?.querySelector<HTMLElement>(
							`[data-slot="${slot}"] ${control}`,
						),
					)
					.find((control) => control);
		focusTarget?.focus({ preventScroll: true });
	}, [pagination.page, pagination.perPage, pagination.isPending]);

	return (
		<footer
			ref={paginationRootRef}
			className="sticky -bottom-6 z-10 -mx-6 mt-auto -mb-6 flex min-h-12 min-w-0 shrink-0 items-center border-t border-kumo-line bg-kumo-elevated px-6 py-1"
		>
			<Pagination
				page={pagination.page}
				setPage={requestPage}
				perPage={pagination.perPage}
				totalCount={pagination.totalCount}
				className="flex-wrap gap-y-3"
				labels={{
					navigation: label,
					firstPage: t`First page`,
					previousPage: t`Previous page`,
					nextPage: t`Next page`,
					lastPage: t`Last page`,
					pageNumber: t`Page number`,
					pageSize: t`Page size`,
				}}
			>
				<Pagination.Info className="min-w-fit">
					{({ pageShowingRange: range, totalCount }) => {
						const shown = totalCount === 0 ? "0-0" : range;
						const pageShowingRange =
							i18n.locale === "fa"
								? `\u2066${localizeNumberInput(shown, i18n.locale)}\u2069`
								: shown;
						return (
							<span role="status">{t`Showing ${pageShowingRange} of ${i18n.number(totalCount ?? 0)}`}</span>
						);
					}}
				</Pagination.Info>
				<Pagination.Separator className="hidden sm:block" />
				<div inert={pagination.isPending || undefined} className="contents">
					<div data-slot="pagination-page-size" className="flex items-center gap-2">
						<span className="text-sm text-kumo-subtle">{t`Per page`}</span>
						<Select
							aria-label={t`Page size`}
							value={pagination.perPage}
							onValueChange={(value) => {
								if (value !== null) requestPageSize(value);
							}}
							items={pageSizes.map((value) => ({ value, label: i18n.number(value) }))}
						/>
					</div>
					<div
						data-slot="pagination-controls"
						className="flex grow basis-full flex-col items-end sm:basis-auto"
					>
						<nav aria-label={label}>
							<InputGroup>
								<InputGroup.Button
									variant="secondary"
									aria-label={t`First page`}
									disabled={pagination.page <= 1}
									onClick={() => requestPage(1)}
								>
									<CaretDoubleLeftIcon size={16} className="rtl:-scale-x-100" />
								</InputGroup.Button>
								<InputGroup.Button
									variant="secondary"
									aria-label={t`Previous page`}
									disabled={pagination.page <= 1}
									onClick={() => requestPage(pagination.page - 1)}
								>
									<CaretLeftIcon size={16} className="rtl:-scale-x-100" />
								</InputGroup.Button>
								{pageCount <= MAX_PAGE_DROPDOWN_ITEMS ? (
									<Select
										aria-label={t`Page number`}
										className="rounded-none ring-kumo-hairline"
										value={pagination.page}
										onValueChange={(value) => {
											if (value !== null) requestPage(value);
										}}
										items={Array.from({ length: pageCount }, (_, index) => ({
											value: index + 1,
											label: i18n.number(index + 1),
										}))}
									/>
								) : (
									<InputGroup.Input
										className="w-16 text-center"
										aria-label={t`Page number`}
										inputMode="numeric"
										dir="ltr"
										value={localizeNumberInput(pageText, i18n.locale)}
										onValueChange={(value) =>
											setEditingPage({ page: pagination.page, text: normalizeNumberInput(value) })
										}
										onBlur={commitPage}
										onKeyDown={(event) => {
											if (event.key === "Enter") {
												event.preventDefault();
												commitPage();
											}
										}}
										autoComplete="off"
										data-1p-ignore
										data-lpignore="true"
										data-form-type="other"
									/>
								)}
								<InputGroup.Button
									variant="secondary"
									aria-label={t`Next page`}
									disabled={pagination.page >= pageCount}
									onClick={() => requestPage(pagination.page + 1)}
								>
									<CaretRightIcon size={16} className="rtl:-scale-x-100" />
								</InputGroup.Button>
								<InputGroup.Button
									variant="secondary"
									aria-label={t`Last page`}
									disabled={pagination.page >= pageCount}
									onClick={() => requestPage(pageCount)}
								>
									<CaretDoubleRightIcon size={16} className="rtl:-scale-x-100" />
								</InputGroup.Button>
							</InputGroup>
						</nav>
					</div>
				</div>
			</Pagination>
		</footer>
	);
}
