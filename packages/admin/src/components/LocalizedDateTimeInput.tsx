import { Button, Input, Label, LayerDialog } from "@cloudflare/kumo";
import { useLingui } from "@lingui/react/macro";
import { Calendar } from "@phosphor-icons/react";
import * as React from "react";

import { fromDatetimeLocalInputValue, toDatetimeLocalInputValue } from "../lib/datetime-local.js";
import { guardUnsavedInput } from "../lib/dialog-form.js";
import { localizeNumberInput } from "../lib/localized-number.js";
import type { PublishingDateTimeError } from "../lib/publishing-datetime.js";
import { cn } from "../lib/utils.js";
import { PublishingDateTimeFields } from "./PublishingDateTimeEditor.js";
import { RequiredFieldMessage, useShowRequiredError } from "./RequiredFieldError.js";

type LocalizedDateTimeInputProps = Pick<
	React.ComponentProps<typeof Input>,
	| "id"
	| "label"
	| "required"
	| "disabled"
	| "readOnly"
	| "className"
	| "placeholder"
	| "aria-label"
	| "aria-labelledby"
	| "aria-describedby"
	| "aria-invalid"
	| "aria-required"
> & {
	value: unknown;
	timezone: string;
	onValueChange: (value: string | null) => void;
};

export function LocalizedDateTimeInput({
	value,
	timezone,
	onValueChange,
	label,
	required,
	disabled,
	readOnly,
	className,
	placeholder,
	...props
}: LocalizedDateTimeInputProps) {
	const { i18n, t } = useLingui();
	const formId = React.useId();
	const initial = React.useMemo(() => {
		let siteTimezone = timezone;
		try {
			siteTimezone = new Intl.DateTimeFormat("en", { timeZone: siteTimezone }).resolvedOptions()
				.timeZone;
		} catch {
			siteTimezone = "UTC";
		}
		const local = toDatetimeLocalInputValue(value, siteTimezone);
		const selectedDate = local ? new Date(`${local.slice(0, 10)}T12:00:00`) : undefined;
		return {
			timezone: siteTimezone,
			local,
			date: selectedDate && !Number.isNaN(selectedDate.getTime()) ? selectedDate : undefined,
			time: local.slice(11, 16),
		};
	}, [value, timezone]);
	const triggerRef = React.useRef<HTMLButtonElement>(null);
	const requiredErrorId = React.useId();
	const showRequiredError = useShowRequiredError(required, !initial.local);
	const [open, setOpen] = React.useState(false);
	const [date, setDate] = React.useState(initial.date);
	const [time, setTime] = React.useState(initial.time);
	const [invalid, setInvalid] = React.useState<{ reason: PublishingDateTimeError } | null>(null);
	React.useEffect(() => {
		setOpen(false);
		setDate(initial.date);
		setTime(initial.time);
		setInvalid(null);
	}, [initial]);

	if (i18n.locale !== "fa") {
		return (
			<Input
				{...props}
				label={label}
				required={required}
				disabled={disabled}
				readOnly={readOnly}
				className={className}
				placeholder={placeholder}
				type="datetime-local"
				value={initial.local}
				onChange={(event) => {
					try {
						onValueChange(fromDatetimeLocalInputValue(event.target.value, timezone));
					} catch {
						onValueChange(event.target.value);
					}
				}}
			/>
		);
	}

	const handleOpenChange = (nextOpen: boolean) => {
		setDate(initial.date);
		setTime(initial.time);
		setInvalid(null);
		setOpen(nextOpen);
	};
	const changed = date?.getTime() !== initial.date?.getTime() || time !== initial.time;
	const apply = () => {
		if (!date || Number.isNaN(date.getTime())) {
			setInvalid({ reason: date ? "invalid-date" : "missing-date" });
			return;
		}
		if (!time) {
			setInvalid({ reason: "missing-time" });
			return;
		}
		if (!changed) {
			setOpen(false);
			return;
		}
		const day = `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
		let next: string | null;
		try {
			next = fromDatetimeLocalInputValue(`${day}T${time}`, initial.timezone);
		} catch {
			setInvalid({ reason: "invalid-site-time" });
			return;
		}
		onValueChange(next);
		setOpen(false);
	};
	const formatted =
		initial.date && !Number.isNaN(initial.date.getTime())
			? `${new Intl.DateTimeFormat(i18n.locale, { dateStyle: "medium" }).format(initial.date)}، ${localizeNumberInput(initial.time, i18n.locale)}`
			: "";

	return (
		<div className={label ? "grid gap-2" : undefined}>
			{label && <Label htmlFor={props.id}>{label}</Label>}
			{/* Preserve native required validation for the dialog-backed control. */}
			{required && (
				<Input
					type="text"
					required
					disabled={disabled || readOnly}
					tabIndex={-1}
					aria-hidden="true"
					className="sr-only"
					value={initial.local}
					onChange={() => {}}
					onInvalid={(event) => {
						event.preventDefault();
						triggerRef.current?.focus();
					}}
				/>
			)}
			<LayerDialog.Root open={open} {...guardUnsavedInput(changed, handleOpenChange)}>
				<LayerDialog.Trigger
					render={
						<Button
							ref={triggerRef}
							aria-required={required || undefined}
							{...props}
							aria-invalid={props["aria-invalid"] || showRequiredError || undefined}
							aria-describedby={
								[props["aria-describedby"], showRequiredError && requiredErrorId]
									.filter(Boolean)
									.join(" ") || undefined
							}
							type="button"
							variant="outline"
							disabled={disabled || readOnly}
							className={cn("w-full justify-between text-start font-normal", className)}
						/>
					}
				>
					<span className="min-w-0 truncate">
						{formatted || placeholder || t`Choose a date and time`}
					</span>
					<Calendar className="size-4 shrink-0" aria-hidden="true" />
				</LayerDialog.Trigger>
				<LayerDialog.Content size="sm">
					<LayerDialog.Title>{label || t`Date and time`}</LayerDialog.Title>
					<LayerDialog.Description>{t`Choose a date and time in the site timezone.`}</LayerDialog.Description>
					<LayerDialog.Body>
						<form
							id={formId}
							noValidate
							onSubmit={(event) => {
								event.preventDefault();
								event.stopPropagation();
								apply();
							}}
						>
							<PublishingDateTimeFields
								date={date}
								time={time}
								timezone={initial.timezone}
								dateAriaLabel={t`Date`}
								invalid={invalid}
								onDateChange={(next) => {
									setDate(next);
									setInvalid(null);
								}}
								onTimeChange={(next) => {
									setTime(next);
									setInvalid(null);
								}}
							/>
							<Button
								type="button"
								variant="secondary"
								className="mt-4"
								onClick={() => {
									onValueChange(null);
									setOpen(false);
								}}
							>
								{t`Clear`}
							</Button>
						</form>
					</LayerDialog.Body>
					<LayerDialog.Actions dismissLabel={t`Cancel`}>
						<LayerDialog.Action
							type="submit"
							form={formId}
							onClick={(event) => {
								event.preventDefault();
								apply();
							}}
						>{t`Apply`}</LayerDialog.Action>
					</LayerDialog.Actions>
				</LayerDialog.Content>
			</LayerDialog.Root>
			{showRequiredError && (
				<RequiredFieldMessage
					id={requiredErrorId}
				>{t`This field is required`}</RequiredFieldMessage>
			)}
		</div>
	);
}
