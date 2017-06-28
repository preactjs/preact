/** Copy own-properties from `props` onto `obj`.
 *	@returns obj
 *	@private
 */
export function extend(obj, props) {
	for (let i in props) obj[i] = props[i];
	return obj;
}

/** A simple helper to convert Iterable to an Array
 * @returns {Array}
 * @private
 */
export function iterableToArray(iterable) {
	let iterStep = {}, tmpArr = [];
	while (!iterStep.done) {
		iterStep = iterable.next();
		iterStep.value ? tmpArr.push(iterStep.value) : void 0;
	}
	return tmpArr;
}

