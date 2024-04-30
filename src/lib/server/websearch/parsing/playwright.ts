import { type BrowserContext, chromium, devices, type Page } from "playwright";

type PlaywrightConfig = {};

const initPlaywrightService = async ({}: PlaywrightConfig) => {
	const browser = await chromium.launch({
		headless: true,
	});

	process.on("SIGINT", () => {
		browser.close();
	});

	const device = devices["Desktop Chrome"];
	const options = {
		...device,
		screen: {
			width: 1920,
			height: 1080,
		},
	};
	return browser.newContext(options);
};

const loadPage =
	(ctx: BrowserContext) =>
	async (url: string): Promise<Page> => {
		const page = await ctx.newPage();
		await page.goto(url);
		await page.waitForLoadState("domcontentloaded");
		return page;
	};

export { initPlaywrightService, loadPage };
