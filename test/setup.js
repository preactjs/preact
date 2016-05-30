// patch Sinon 1.x's deepEqual to support objects with no prototype.
// @see https://github.com/sinonjs/sinon/pull/1050

let needsPatch = false;
try {
	let foo = Object.create(null),
		bar = Object.create(null);
	foo.a = 'a';
	bar.a = 'a';
	sinon.deepEqual(foo, bar);
} catch (err) {
	// console.log('Detected Sinon reliance on hasOwnProperty: patching deepEqual. '+err);  // eslint-disable-line
	needsPatch = true;
}

if (needsPatch) {
	let isPrototypeless = obj => !obj.prototype || !obj.prototype.hasOwnProperty,
		hasOwnProperty = Object.prototype.hasOwnProperty;
	sinon._originalDeepEqual = sinon.deepEqual;
	sinon.deepEqual = (a, b) => {
		if (!sinon.match.isMatcher(a)) {
			if (a && typeof a==='object' && isPrototypeless(a)) a.hasOwnProperty = hasOwnProperty;
			if (b && typeof b==='object' && isPrototypeless(b)) b.hasOwnProperty = hasOwnProperty;
		}
		return sinon._originalDeepEqual(a, b);
	};
}
