import { originalParse } from "./parsing/parse";
import { initPlaywrightService, loadPage } from "./parsing/playwright";
import { spatialParsing } from "./parsing/spatialParsing";

const playwright = await initPlaywrightService({});

export async function parseWeb(url: string) {
	const abortController = new AbortController();
	setTimeout(() => abortController.abort(), 10000);
	const r = await fetch(url, { signal: abortController.signal, credentials: "omit" }).catch();

	if (r.headers.get("content-type")?.includes("text/html")) {
		const page = await loadPage(playwright)(url);

		const [text, spatial] = await Promise.all([
			page.evaluate(originalParse).catch((e) => console.warn(e)),
			page.evaluate(spatialParsing),
		]);

		console.log("\n\nOriginal Text\n\n", text, "\n\nSpatial Text\n\n", spatial);

		return spatial;
	} else if (
		r.headers.get("content-type")?.includes("text/plain") ||
		r.headers.get("content-type")?.includes("text/markdown")
	) {
		return r.text();
	} else {
		throw new Error("Unsupported content type");
	}
}
