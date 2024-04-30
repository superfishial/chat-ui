const originalParse = () => {
	const paragraphs = document.querySelectorAll("p, table, pre, ul, ol");

	if (!paragraphs.length) {
		throw new Error(`webpage doesn't have any parseable element`);
	}
	const paragraphTexts = Array.from(paragraphs).map((p) => p.textContent);

	// combine text contents from paragraphs and then remove newlines and multiple spaces
	const text = paragraphTexts.join(" ").replace(/ {2}|\r\n|\n|\r/gm, "");

	return text;
};

export { originalParse };
