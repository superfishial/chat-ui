import { navigating } from "$app/stores";
import { tick } from "svelte";
import { get } from "svelte/store";

const detachedOffset = 10;

type SnapScrollToBottomOptions = {
	/** Pass in a dependency to update scroll on changes. */
	dependency: unknown;
	/** Controls whether the snapping is enabled */
	enabled?: boolean;
};
/**
 * @param node element to snap scroll to bottom
 * @param options for scroll snapping
 */
export const snapScrollToBottom = (
	node: HTMLElement,
	{ dependency, enabled = true }: SnapScrollToBottomOptions
) => {
	let prevScrollValue = node.scrollTop;
	let isDetached = !enabled;

	const handleScroll = () => {
		// if user scrolled up, we detach
		if (node.scrollTop < prevScrollValue) {
			isDetached = true;
		}

		// if user scrolled back to within 10px of bottom, we reattach
		if (node.scrollTop - (node.scrollHeight - node.clientHeight) >= -detachedOffset) {
			isDetached = false;
		}

		prevScrollValue = node.scrollTop;
	};

	const updateScroll = async (opts: { force?: boolean; enabled?: boolean } = {}) => {
		// enabled = opts.enabled ?? enabled;
		if (!opts.force && (isDetached || !enabled) && !get(navigating)) return;

		// wait for next tick to ensure that the DOM is updated
		await tick();

		node.scrollTo({ top: node.scrollHeight });
	};

	node.addEventListener("scroll", handleScroll);

	if (dependency) {
		updateScroll({ force: true });
	}

	return {
		update: updateScroll,
		destroy: () => {
			node.removeEventListener("scroll", handleScroll);
		},
	};
};
