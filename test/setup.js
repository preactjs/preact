// patch Sinon 1.x's deepEqual to support objects with no prototype.
// @see https://github.com/sinonjs/sinon/pull/1050
try {
	let foo = Object.create(null),
		bar = Object.create(null);
	foo.a = 'a';
	bar.a = 'a';
	sinon.deepEqual(foo, bar);
} catch (err) {
	// console.log('Detected Sinon reliance on hasOwnProperty: patching deepEqual. '+err);  // eslint-disable-line
	let eq = sinon.deepEqual;
	let isPrototypeless = obj => obj && typeof obj==='object' && (!obj.prototype || !obj.prototype.hasOwnProperty);
	sinon.deepEqual = (a, b) => {
		if (!sinon.match || !sinon.match.isMatcher(a)) {
			if (isPrototypeless(a)) a = { ...a };
			if (isPrototypeless(b)) b = { ...b };
		}
		return eq.call(sinon, a, b);
	};
}
