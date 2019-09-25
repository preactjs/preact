export function nextFrame() {
	return new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
}
