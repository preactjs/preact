/** Param obj for diffChildren
 * @param {{ parentDom: any; newParentVNode: any; oldParentVNode: any; globalContext: any; isSvg: any; excessDomChildren; commitQueue: any; oldDom: any; isHydrating: boolean; }} args
 */

const divider = '=========================';
const prevShapes = new Map();
const shapeChanges = new Map();

/**
 * @template T
 * @param {string} key
 * @param  {...T} args
 * @returns {T[]}
 */
export function logArgsShapeChange(key, ...args) {
	return logShapeChange(key, args);
}

export function logShapeChange(key, obj) {
	var currShape = calculateShape(obj);
	if (prevShapes.has(key)) {
		const prevObjShapes = prevShapes.get(key);
		const lastShape = prevObjShapes[prevObjShapes.length - 1];
		if (JSON.stringify(lastShape) !== JSON.stringify(currShape)) {
			prevObjShapes.push(currShape);

			const lastShapeStr = JSON.stringify(lastShape);
			const currShapeStr = JSON.stringify(currShape);

			const shapeChange = `lastShape: ${lastShapeStr}\r\ncurrShape: ${currShapeStr}`;
			if (!shapeChanges.has(key)) {
				shapeChanges.set(key, []);
			}

			const seenShapeChanges = shapeChanges.get(key);
			if (!seenShapeChanges.includes(shapeChange)) {
				seenShapeChanges.push(shapeChange);

				console.log(divider);
				console.log(`Shape change for "${key}"`);
				console.log(shapeChange);
			}
		}
	} else {
		prevShapes.set(key, [currShape]);

		console.log(divider);
		console.log(`New shape:`, key);
		console.log('currShape:', JSON.stringify(currShape));
	}
	return obj;
}

function calculateShape(obj) {
	const shape = [];
	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			shape.push(getType(obj[i]));
		}
	} else {
		for (let key in obj) {
			shape.push({
				name: key,
				type: getType(obj[key])
			});
		}
	}
	return shape;
}

function getType(value) {
	return value === null
		? 'null'
		: typeof value == 'function'
		? `function:${value.name}`
		: typeof value == 'object'
		? `object:${value.constructor && value.constructor.name}`
		: typeof value;
}
