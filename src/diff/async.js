import { diff, diffElementNodes } from './index';
import { diffChildren } from './children';
import options from '../options';

/**
 * returns generator function type because it is not exposed by default
 */
export const GeneratorFunction = Object.getPrototypeOf(function*() {})
	.constructor;

/**
 * returns async diff function based on an existing sync diff function
 */
function generateAsyncDiffFunction(
	syncFunction,
	asyncFunctionName,
	interruptable
) {
	// async versions only work in browsers - it does not make sense in other environments
	if (typeof window === 'undefined')
		return new GeneratorFunction(
			'',
			'throw new Error("Cannot use async rendering in node.")'
		);

	// if we previously generated the function, used it from global
	if (window[asyncFunctionName]) return window[asyncFunctionName];

	// get the function body of the synchronous diff
	const diffBody = syncFunction.toString();

	// extract the function arguments - async version will have the same arguments
	const argMatches = diffBody.match(/function\s+\w+\(([^)]*)\)/);
	if (!argMatches || !argMatches[1])
		throw new Error(`Invalid function arguments: ${diffBody}`);
	const args = argMatches[1];

	// extract the function body - this wil be used as basis for the async version
	const bracketPosition = diffBody.indexOf('{');
	if (!bracketPosition)
		throw new Error(`Invalid function start bracket: ${diffBody}`);
	const lastCharacter = diffBody.charAt(diffBody.length - 1);
	if (lastCharacter !== '}')
		throw new Error(`Invalid function end bracket: ${diffBody}`);
	let body = diffBody.slice(bracketPosition + 1, -1);

	// replace pseudo yield calls - if we get a promise, yield it - since this is dynamically generated generator function, we can't use yield in the original code
	body = body.replaceAll(/(\w+\.yieldNextValue)/g, `yield * $1`);

	// add the code to make the diff asynchronous if requested - we only add it for the main diff function - start of recursion
	// if we're running out of deadline, yield and get back as browser allows us - give a millisecond buffer to stay within allotted time
	if (interruptable)
		body = `
		if (typeof window !== 'undefined' && (!window._preactDeadline || Date.now() > (window._preactDeadline - 1))) {
			yield new Promise(resolve => requestIdleCallback(deadline => { window._preactDeadline = Date.now() + deadline.timeRemaining(); resolve(); }));
		}
		${body}
	`;

	window[asyncFunctionName] = new GeneratorFunction(args, body);
	return window[asyncFunctionName];
}

/**
 * generates async version of the diff children from the synchronous version of it
 */
export const diffChildrenAsync = generateAsyncDiffFunction(
	diffChildren,
	'diffChildrenAsync'
);

/**
 * generates async version of the diff element nodes from the synchronous version of it
 */
export const diffElementNodesAsync = generateAsyncDiffFunction(
	diffElementNodes,
	'diffElementNodesAsync'
);

/**
 * generates async version of the diff from the synchronous version of it
 */
export const diffAsync = generateAsyncDiffFunction(diff, 'diffAsync', true);

/**
 * calls either the serial function or its generator/async version and waits for interrupts from the JS engine when they come up
 */
export async function optionalAsyncDiff(...args) {
	if (!options.asyncRendering) diff(...args);
	else {
		const generator = diffAsync(...args);
		let nextValue = generator.next();
		while (!nextValue.done) {
			if (nextValue.value && nextValue.value.then) await nextValue.value;
			nextValue = generator.next();
		}
	}
}
