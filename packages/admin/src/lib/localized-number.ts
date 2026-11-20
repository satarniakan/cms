export function normalizeNumberInput(value: string): string {
	return value
		.replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
		.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
		.replace(/٫/g, ".")
		.replace(/−/g, "-");
}

export function localizeNumberInput(value: string, locale: string): string {
	return locale === "fa"
		? value
				.replace(/\d/g, (digit) => String.fromCharCode(0x06f0 + Number(digit)))
				.replace(/\./g, "٫")
		: value;
}
