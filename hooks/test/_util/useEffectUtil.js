// TODO: Remove this function and use `act` in tests instead
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
