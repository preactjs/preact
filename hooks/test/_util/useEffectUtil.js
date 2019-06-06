export function scheduleEffectAssert(assertFn) {
	return new Promise(resolve => {
		requestAnimationFrame(() =>
			setTimeout(() => {
				assertFn();
				resolve();
			}, 0)
		);
	});
}
