const spatialParsing = () => {
	/**
	 * Implementation for dbscan, inlined and migrated to typescript from https://github.com/cdxOo/dbscan (MIT License)
	 */
	const DBSCAN = <T>({
		dataset,
		epsilon,
		epsilonCompare,
		minimumPoints,
		distanceFunction,
	}: {
		dataset: T[];
		epsilon?: number;
		epsilonCompare?: (distance: number, epsilon: number) => boolean;
		minimumPoints?: number;
		distanceFunction: (a: T, b: T) => number;
	}) => {
		epsilon = epsilon || 1; // aka maxDistance
		epsilonCompare = epsilonCompare || ((dist, e) => dist < e);
		minimumPoints = minimumPoints || 2;

		const visitedIndices: Record<number, boolean> = {};
		const isVisited = (i: number) => visitedIndices[i];
		const markVisited = (i: number) => {
			visitedIndices[i] = true;
		};

		const clusteredIndices: Record<number, boolean> = {};
		const isClustered = (i: number) => clusteredIndices[i];
		const markClustered = (i: number) => {
			clusteredIndices[i] = true;
		};

		const uniqueMerge = <T>(targetArray: T[], sourceArray: T[]) => {
			for (let i = 0; i < sourceArray.length; i += 1) {
				const item = sourceArray[i];
				if (targetArray.indexOf(item) < 0) {
					targetArray.push(item);
				}
			}
		};

		const findNeighbors = (index: number) => {
			const neighbors = [];
			for (let other = 0; other < dataset.length; other += 1) {
				const distance = distanceFunction(dataset[index], dataset[other]);
				if (epsilonCompare(distance, epsilon)) {
					neighbors.push(other);
				}
			}
			return neighbors;
		};

		const noise: number[] = [];
		const addNoise = (i: number) => noise.push(i);

		const clusters: number[][] = [];
		const createCluster = () => clusters.push([]) - 1;
		const addIndexToCluster = (c: number, i: number) => {
			clusters[c].push(i);
			markClustered(i);
		};

		const expandCluster = (c: number, neighbors: number[]) => {
			for (let i = 0; i < neighbors.length; i += 1) {
				const neighborIndex = neighbors[i];
				if (!isVisited(neighborIndex)) {
					markVisited(neighborIndex);

					const secondaryNeighbors = findNeighbors(neighborIndex);
					if (secondaryNeighbors.length >= minimumPoints) {
						uniqueMerge(neighbors, secondaryNeighbors);
					}
				}

				if (!isClustered(neighborIndex)) {
					addIndexToCluster(c, neighborIndex);
				}
			}
		};

		dataset.forEach((unused, index) => {
			if (!isVisited(index)) {
				markVisited(index);

				const neighbors = findNeighbors(index);
				if (neighbors.length < minimumPoints) {
					addNoise(index);
				} else {
					const clusterIndex = createCluster();
					addIndexToCluster(clusterIndex, index);
					expandCluster(clusterIndex, neighbors);
				}
			}
		});

		return { clusters, noise };
	};

	const IgnoredTagsList = [
		"header",
		"footer",
		"nav",
		"aside",
		"script",
		"style",
		"noscript",
		"form",
		"button",
	];
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

	type ReadableNode = Element;
	type NodeWithRect = {
		node: ReadableNode;
		rect: DOMRect;
	};

	const isOnlyChild = (node: Node) => {
		if (!node.parentElement) return true;
		if (node.parentElement.nodeName === "body") return false;
		if (node.parentElement.childNodes.length === 1) return true;
		return false;
	};

	const hasValidInlineParent = (node: Node) => {
		return node.parentElement && !node.parentElement.matches("div, section, article, main, body ");
	};

	const hasValidParent = (node: Node) => {
		return node.parentElement && !node.parentElement.isSameNode(document.body);
	};

	/**
	 * We want to find the highest parent of text node in the cluster.
	 * For example in this case: <p><span>Text here</span></p>
	 * the P tag is highest parent.
	 */
	const findHighestDirectParentOfReadableNode = (node: Node): Element => {
		// For image tag the parent is the image tag itself
		if (node.nodeType === 1 && node.nodeName.toLowerCase() === "img") {
			return node as HTMLImageElement;
		}

		// go up the tree until the parent is no longer an only child
		let parent = node.parentElement;
		// if the parent is an inline tag, then go up one more level
		while (
			parent &&
			hasValidInlineParent(parent) &&
			InlineTags.includes(parent?.tagName.toLowerCase())
		) {
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
	const barredNodes = Array.from(document.querySelectorAll(IgnoredTagsList.join(",")));

	const doesNodePassHeuristics = (node: Node) => {
		if (node.nodeType === 1 && node.nodeName.toLowerCase() === "img") {
			return (node as HTMLImageElement).alt.trim().length > 0;
		}

		if ((node.textContent ?? "").trim().length === 0) {
			return false;
		}

		const parentNode = findHighestDirectParentOfReadableNode(node);

		if (parentNode && parentNode instanceof Element) {
			if (
				!parentNode.checkVisibility({
					checkOpacity: true,
					checkVisibilityCSS: true,
				})
			)
				return false;

			const rect = parentNode.getBoundingClientRect();
			// elements that are readable usually don't have really small height or width
			if (rect.width < 4 || rect.height < 4) {
				return false;
			}
		}

		if (parentNode && parentNode instanceof Element) {
			if (barredNodes.some((node) => node.contains(parentNode))) {
				return false;
			}
		}

		return true;
	};

	const isTextOrImageNode = (node: Node) => {
		if (node.nodeType === 1 && node.nodeName.toLowerCase() === "img") {
			return true;
		}

		if (node.nodeType === 3) {
			return true;
		}

		return false;
	};

	const getAllReadableNodes = (): NodeWithRect[] => {
		const treeWalker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
			{
				acceptNode(node) {
					if (isTextOrImageNode(node) && doesNodePassHeuristics(node)) {
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

		const parentsForReadableNodes = readableNodes.map(findHighestDirectParentOfReadableNode);
		const uniqueParents = parentsForReadableNodes.reduce((acc, curr) => {
			if (
				parentsForReadableNodes.find((node) => {
					if (!node.isSameNode(curr) && node.contains(curr)) {
						console.log("is same node", node, curr, node.isSameNode(curr), node.contains(curr));
					}

					return !node.isSameNode(curr) && node.contains(curr);
				})
			) {
				return acc;
			} else {
				acc.push(curr);
			}
			return acc;
		}, [] as Element[]);

		return uniqueParents.map((node) => {
			return {
				node,
				rect: node.getBoundingClientRect(),
			};
		});
	};

	const distanceFunction = (a: NodeWithRect, b: NodeWithRect) => {
		// we make two assumptions here which are fine to make for rects returned from getBoundingClientRect
		// 1. rects are upright and not rotated
		// 2. If two rects intersect, we assume distance to be 0
		let dx = 0;
		let dy = 0;
		const rect1 = a.rect;
		const rect2 = b.rect;
		// Calculate the horizontal distance
		if (rect1.x + rect1.width < rect2.x) {
			dx = rect2.x - (rect1.x + rect1.width);
		} else if (rect2.x + rect2.width < rect1.x) {
			dx = rect1.x - (rect2.x + rect2.width);
		}

		// Calculate the vertical distance
		if (rect1.y + rect1.height < rect2.y) {
			dy = rect2.y - (rect1.y + rect1.height);
		} else if (rect2.y + rect2.height < rect1.y) {
			dy = rect1.y - (rect2.y + rect2.height);
		}

		const distance = Math.sqrt(dx * dx + dy * dy);
		// Return the Euclidean distance
		return distance;
	};
	/**
	 * Clusters nodes using dbscan
	 */
	const clusterReadableNodes = (nodes: NodeWithRect[]) => {
		const { clusters, noise } = DBSCAN({
			dataset: nodes,
			epsilon: 32,
			// nodes that are by itself are considered noise.
			minimumPoints: 2,
			distanceFunction,
		});

		return clusters;
	};

	const totalTextLength = (cluster: number[]) => {
		return cluster.map((t) => readableNodes[t].node.textContent?.trim()).join("").length;
	};

	const approximatelyEqual = (a: number, b: number, epsilon = 1) => {
		return Math.abs(a - b) < epsilon;
	};

	const getClusterBounds = (cluster: number[]) => {
		const firstElementBounds = readableNodes[cluster[0]].rect;
		const lastElementBounds = readableNodes[cluster[cluster.length - 1]].rect;

		return {
			x: firstElementBounds.x,
			y: firstElementBounds.y,
			height: lastElementBounds.y + lastElementBounds.height - firstElementBounds.y,
			width: lastElementBounds.x + lastElementBounds.width - firstElementBounds.x,
		};
	};
	const findCriticalClusters = (clusters: number[][]) => {
		// merge the clusters that have similar widths and x position

		let i = 0;
		while (i < clusters.length) {
			const cluster = clusters[i];
			const clusterBounds = getClusterBounds(cluster);
			for (let j = 0; j < clusters.length; j++) {
				if (j === i) continue;

				const otherCluster = clusters[j];
				const otherClusterBounds = getClusterBounds(otherCluster);
				if (
					approximatelyEqual(clusterBounds.x, otherClusterBounds.x, 16) &&
					approximatelyEqual(clusterBounds.width, otherClusterBounds.width, 16)
				) {
					cluster.push(...otherCluster);
					clusters.splice(j, 1);
				}
			}

			i++;
		}

		// TODO: Think about centrality, and text density as metrics
		// to make this selection process include more clusters than just the one that has most amount of text.
		const clusterWithMostText = clusters.reduce((acc, curr) => {
			if (totalTextLength(curr) > totalTextLength(acc)) {
				return curr;
			}
			return acc;
		}, clusters[0]);


		return [clusterWithMostText];
	};

	const readableNodes = getAllReadableNodes();
	const clusters = clusterReadableNodes(readableNodes);

	const criticalClusters = findCriticalClusters(clusters);


	// filter readable nodes using the above information as well as heuristics
	const filteredNodes = readableNodes.filter((_, idx) => {
		return criticalClusters.some((cluster) => {
			return cluster.includes(idx);
		});
	});


	// TODO: Return this in the format decided by @saghen
	return filteredNodes
		.map((node) => node.node.textContent?.trim())
		.join(" ")
		.replace(/ {2}|\r\n|\n|\r/gm, "");
};

export { spatialParsing };
