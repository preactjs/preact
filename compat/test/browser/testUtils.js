/**
 * Retrieve a Symbol if supported or use the fallback value
 * @param {string} name The name of the Symbol to look up
 * @param {number} fallback Fallback value if Symbols are not supported
 */
export function getSymbol(name, fallback) {
	let out = fallback;

	try {
		// eslint-disable-next-line
		if (
			Function.prototype.toString
				.call(eval('Symbol.for'))
				.match(/\[native code\]/)
		) {
			// Concatenate these string literals to prevent the test
			// harness and/or Babel from modifying the symbol value.
			// eslint-disable-next-line
			out = eval('Sym' + 'bol.for("' + name + '")');
		}
	} catch (e) {}

	return out;
}
