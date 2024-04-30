type ReadableNode = Node | HTMLImageElement;

const IgnoredTagsList = ["header", "footer", "nav", "aside", "script", "style", "noscript", "form"];
const InlineTags = [
	"a",
	"abbrv",
	"span",
	"address",
	"time",
	"acronym",
	"strong",
	"b",
	"br",
	"sub",
	"sup",
	"tt",
	"var",
	"em",
	"i",
];

const hasValidParent = (node: Node) => {
	return node.parentElement && !node.parentElement.isSameNode(document.body);
};

const isOnlyChild = (node: Node) => {
	if (!node.parentElement) return true;
	if (node.parentElement.nodeName === "body") return false;
	if (node.parentElement.childNodes.length === 1) return true;
	return false;
};

const findHighestDirectParentOfReadableNode = (node: Node): Element => {
	// For image tag the parent is the image tag itself
	if (node.nodeType === 1 && node.nodeName.toLowerCase() === "img") {
		return node as HTMLImageElement;
	}

	// go up the tree until the parent is no longer an only child
	let parent = node.parentElement;
	// if the parent is an inline tag, then go up one more level
	while (parent && hasValidParent(parent) && InlineTags.includes(parent?.tagName.toLowerCase())) {
		parent = parent.parentElement;
	}

	while (parent && isOnlyChild(parent)) {
		if (!hasValidParent(parent)) break;
		parent = parent.parentElement;
	}

	if (!parent)
		throw new Error(
			"disconnected node found, this should not really be possible when traversing through the dom"
		);

	if (parent.nodeName.toLowerCase() === "code") {
		if (
			parent.parentElement &&
			["pre", "p"].includes(parent.parentElement.nodeName.toLowerCase())
		) {
			parent = parent.parentElement;
		}
	}
	if (["td", "th", "tr", "li"].includes(parent.nodeName.toLowerCase())) {
		let maxDepth = 3;
		let depth = 0;
		let tempParent = parent;
		while (tempParent && !tempParent.matches("ul, ol, table") && depth < maxDepth) {
			if (!tempParent.parentElement) break;
			tempParent = tempParent.parentElement;
			depth += 1;
		}

		if (tempParent.matches("ul, ol, table")) {
			parent = tempParent;
		}
	}

	return parent;
};

const doesNodePassHeuristics = (barredNodes: Element[], node: Node) => {
	if (node.nodeType === 1 && node.nodeName.toLowerCase() === "img") {
		return (node as HTMLImageElement).alt.trim().length > 0;
	}

	if ((node.textContent ?? "").trim().length === 0) {
		return false;
	}

	const parentNode = findHighestDirectParentOfReadableNode(node);

	if (parentNode && parentNode instanceof Element) {
		if (barredNodes.some((node) => node.contains(parentNode))) {
			return false;
		}
	}

	return true;
};

const getAllReadableNodes = (): ReadableNode[] => {
	const treeWalker = document.createTreeWalker(
		document.body,
		NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
		{
			acceptNode(node) {
				if (node.nodeType === 3) {
					return NodeFilter.FILTER_ACCEPT;
				} else if (node.nodeType === 1 && node.nodeName.toLowerCase() === "img") {
					return NodeFilter.FILTER_ACCEPT;
				} else {
					return NodeFilter.FILTER_SKIP;
				}
			},
		}
	);

	const readableNodes = [];

	while (treeWalker.nextNode()) {
		readableNodes.push(treeWalker.currentNode as ReadableNode);
	}

	return readableNodes;
};

// TODO: implement this
const parse = () => {};
