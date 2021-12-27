import { diff, diffElementNodes } from './index';
import { diffChildren } from './children';
import { diffDeps } from './deps';
import options from '../options';

/**
 * returns generator function type because it is not exposed by default
 */
export const GeneratorFunction = Object.getPrototypeOf(function*(){}).constructor;

/**
 * generates async version of the diff children from the synchronous version of it
 */
function generateAsyncDiffChildren() {

	// async versions only work in browsers - it does not make sense in other environments
	if (typeof window === 'undefined') return new GeneratorFunction('', 'throw new Error("Cannot use async rendering in node.")');

	// if we previously generated the function, used it from global
	if (window.diffChildrenAsync) return window.diffChildrenAsync;

	// get the function body of the synchronous diff
	const diffBody = diffChildren.toString();

	// extract the function arguments - async version will have the same arguments
	const argMatches = diffBody.match(/function\s+\w+\(([^)]*)\)/);
	if (!argMatches || !argMatches[1]) throw new Error(`Invalid function arguments: ${diffBody}`);
	const args = argMatches[1];

	// extract the function body - this wil be used as basis for the async version
	const bracketPosition = diffBody.indexOf('{');
	if (!bracketPosition) throw new Error(`Invalid function start bracket: ${diffBody}`);
	const lastCharacter = diffBody.charAt(diffBody.length - 1);
	if (lastCharacter !== '}') throw new Error(`Invalid function end bracket: ${diffBody}`);
	let body = diffBody.slice(bracketPosition + 1, -1);

	// replace pseudo yield calls
	body = body.replaceAll('yield_nextValue.value', 'yield nextValue.value');

	window.diffChildrenAsync = new GeneratorFunction(args, body);
	return window.diffChildrenAsync;
}
export const diffChildrenAsync = generateAsyncDiffChildren();

/**
 * generates async version of the diff element nodes from the synchronous version of it
 */
function generateAsyncDiffElementNodes() {

	// async versions only work in browsers - it does not make sense in other environments
	if (typeof window === 'undefined') return new GeneratorFunction('', 'throw new Error("Cannot use async rendering in node.")');

	// if we previously generated the function, used it from global
	if (window.diffElementNodesAsync) return window.diffElementNodesAsync;

	// get the function body of the synchronous diff
	const diffBody = diffElementNodes.toString();

	// extract the function arguments - async version will have the same arguments
	const argMatches = diffBody.match(/function\s+\w+\(([^)]*)\)/);
	if (!argMatches || !argMatches[1]) throw new Error(`Invalid function arguments: ${diffBody}`);
	const args = argMatches[1];

	// extract the function body - this wil be used as basis for the async version
	const bracketPosition = diffBody.indexOf('{');
	if (!bracketPosition) throw new Error(`Invalid function start bracket: ${diffBody}`);
	const lastCharacter = diffBody.charAt(diffBody.length - 1);
	if (lastCharacter !== '}') throw new Error(`Invalid function end bracket: ${diffBody}`);
	let body = diffBody.slice(bracketPosition + 1, -1);

	// replace pseudo yield calls
	body = body.replaceAll('yield_nextValue.value', 'yield nextValue.value');

	window.diffElementNodesAsync = new GeneratorFunction(args, body);
	return window.diffElementNodesAsync;
}
export const diffElementNodesAsync = generateAsyncDiffElementNodes();

/**
 * generates async version of the diff from the synchronous version of it
 */
function generateAsyncDiff() {

	// async versions only work in browsers - it does not make sense in other environments
	if (typeof window === 'undefined') return new GeneratorFunction('', 'throw new Error("Cannot use async rendering in node.")');

	// if we previously generated the function, used it from global
	if (window.diffAsync) return window.diffAsync;

	// get the function body of the synchronous diff
	const diffBody = diff.toString();

	// extract the function arguments - async version will have the same arguments
	const argMatches = diffBody.match(/function\s+\w+\(([^)]*)\)/);
	if (!argMatches || !argMatches[1]) throw new Error(`Invalid function arguments: ${diffBody}`);
	const args = argMatches[1];

	// extract the function body - this wil be used as basis for the async version
	const bracketPosition = diffBody.indexOf('{');
	if (!bracketPosition) throw new Error(`Invalid function start bracket: ${diffBody}`);
	const lastCharacter = diffBody.charAt(diffBody.length - 1);
	if (lastCharacter !== '}') throw new Error(`Invalid function end bracket: ${diffBody}`);
	let body = diffBody.slice(bracketPosition + 1, -1);

	// replace pseudo yield calls
	body = body.replaceAll('yield_nextValue.value', 'yield nextValue.value');

	// add the code to make the diff asynchronous - if we're running out of deadline, yield and get back as browser allows us - give a few milliseconds buffer to stay within allotted time
	body = `
		if (typeof window !== 'undefined' && (!window._preactDeadline || Date.now() > (window._preactDeadline - 2))) {
			yield new Promise(resolve => requestIdleCallback(deadline => { window._preactDeadline = Date.now() + deadline.timeRemaining(); resolve(); }));
		}
		${body}
	`;

	window.diffAsync = new GeneratorFunction(args, body);
	return window.diffAsync;
}
export const diffAsync = generateAsyncDiff();

/**
 * calls either the serial function or its generator/async version and waits for interrupts from the JS engine when they come up
 */
export async function optionalAsyncDiff(...args) {
	if (!options.asyncRendering) diff(...args, diffDeps());
	else {
		const generator = diffAsync(...args, diffDeps());
		let nextValue = generator.next();
		while (!nextValue.done) { if (nextValue.value && nextValue.value.then) await nextValue.value; nextValue = generator.next(); }
	}
}
