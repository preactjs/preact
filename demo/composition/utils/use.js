import { onMounted, onUnmounted, reactive } from "preact/composition";

export function useMousePosition() {
	const pos = reactive({ x: 0, y: 0 });

	let t;
	function update(e) {
		cancelAnimationFrame(t);
		t = requestAnimationFrame(() => {
			// pos.x = e.pageX;
			// pos.y = e.pageY;
			pos.$value = {
				x: e.pageX,
				y: e.pageY
			};
		});
	}

	onMounted(() => window.addEventListener("mousemove", update));
	onUnmounted(() => window.removeEventListener("mousemove", update));

	return pos;
}

export function useWindowSize() {
	const pos = reactive(getWindowSize());

	let t;
	function update() {
		cancelAnimationFrame(t);
		t = requestAnimationFrame(() => (pos.$value = getWindowSize()));
	}

	onMounted(() => window.addEventListener("resize", update));
	onUnmounted(() => window.removeEventListener("resize", update));

	return pos;
}

function getWindowSize() {
	return {
		width: window.innerWidth,
		height: window.innerHeight
	};
}
