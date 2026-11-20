import { describe, expect, it } from "vitest";

import { formatFileSize } from "../../src/lib/media-utils";

describe("formatFileSize", () => {
	it("uses Persian digits and unit names in the size of a file", () => {
		expect(formatFileSize(204_800, "fa")).toBe("۲۰۰ کیلوبایت");
		expect(formatFileSize(1_536, "fa")).toBe("۱٫۵ کیلوبایت");
		expect(formatFileSize(1_073_741_824, "fa")).toBe("۱ گیگابایت");
	});

	it("still reports a zero-byte file as zero rather than hiding it", () => {
		expect(formatFileSize(0, "fa")).toBe("۰ بایت");
		expect(formatFileSize(0)).toBe("0 B");
	});

	it("keeps the byte sizes of every other locale untouched", () => {
		expect(formatFileSize(204_800)).toBe("200 KB");
		expect(formatFileSize(204_800, "ar")).toBe("200 KB");
		expect(formatFileSize(204_800, "en")).toBe("200 KB");
	});
});
