import { Input } from "@cloudflare/kumo";
import { useLingui } from "@lingui/react/macro";
import * as React from "react";

import { localizeNumberInput, normalizeNumberInput } from "../lib/localized-number.js";

const GROUPED_NUMBER = /^[+-]?\d{1,3}(?:[٬,]\d{3})+(?:\.\d*)?$/;
const NUMBER_DRAFT = /^[+-]?\d*(?:\.\d*)?(?:[eE][+-]?\d*)?$/;

type LocalizedNumberInputProps = Omit<
	React.ComponentProps<typeof Input>,
	"value" | "defaultValue" | "onChange" | "onValueChange" | "type" | "ref"
> & {
	value: number | null | undefined;
	onValueChange: (value: number | null) => void;
};

export function LocalizedNumberInput({
	value,
	onValueChange,
	step,
	min,
	max,
	onBlur,
	error,
	...props
}: LocalizedNumberInputProps) {
	const { i18n, t } = useLingui();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [draft, setDraft] = React.useState({ value, text: value == null ? "" : String(value) });
	const text = Object.is(draft.value, value) ? draft.text : value == null ? "" : String(value);
	const isPersian = i18n.locale === "fa";
	const numeric = text.trim() === "" ? null : Number(text);
	const invalid =
		numeric !== null && (!Number.isFinite(numeric) || (step === "1" && !Number.isInteger(numeric)));
	const belowMin = numeric !== null && min !== undefined && numeric < Number(min);
	const aboveMax = numeric !== null && max !== undefined && numeric > Number(max);
	const validationMessage =
		numeric === null && props.required
			? t`This field is required`
			: invalid
				? t`Enter a valid number`
				: belowMin
					? t`The minimum value is ${i18n.number(Number(min))}`
					: aboveMax
						? t`The maximum value is ${i18n.number(Number(max))}`
						: "";
	React.useEffect(() => {
		inputRef.current?.setCustomValidity(isPersian ? validationMessage : "");
	}, [isPersian, validationMessage]);

	return (
		<Input
			{...props}
			ref={inputRef}
			type={isPersian ? "text" : "number"}
			inputMode={step === "1" ? "numeric" : "decimal"}
			dir="ltr"
			step={step}
			min={min}
			max={max}
			value={localizeNumberInput(text, i18n.locale)}
			aria-invalid={validationMessage ? true : props["aria-invalid"]}
			error={
				error || (isPersian && (props.label || props.description) ? validationMessage : undefined)
			}
			onChange={(event) => {
				let next = normalizeNumberInput(event.target.value);
				if (GROUPED_NUMBER.test(next)) {
					next = next.replace(/[٬,]/g, "");
				}
				if (!NUMBER_DRAFT.test(next)) return;
				const number = next === "" ? null : Number(next);
				const nextValue = number !== null && Number.isFinite(number) ? number : null;
				setDraft({ value: nextValue, text: next });
				onValueChange(nextValue);
			}}
			onBlur={(event) => {
				if (!invalid && numeric !== null) setDraft({ value, text: String(numeric) });
				onBlur?.(event);
			}}
		/>
	);
}
