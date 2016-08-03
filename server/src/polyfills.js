if (typeof Symbol!=='function') {
	let c = 0;
	Symbol = function(s) {		// eslint-disable-line
		return `@@${s}${++c}`;
	};
	Symbol.for = s => `@@${s}`;
}
