if (typeof Symbol !== 'function') {
	let c = 0;
	// eslint-disable-next-line
	Symbol = function (s) {
		return `@@${s}${++c}`;
	};
	Symbol.for = (s) => `@@${s}`;
}
