import {
	render,
	options,
	createElement,
	Component,
	createVNode,
	Fragment,
	EMPTY_OBJ,
	EMPTY_ARR,
	getDomSibling,
	updateParentDomPointers,
	diff,
	diffChildren,
	diffElementNodes,
	diffProps,
	setProperty,
	unmount,
	applyRef,
	assign,
	removeNode,
	slice,
	reorderChildren,
	placeChild,
	doRender,
	commitRoot
} from 'preact';

// request idle callback polyfill for async rendering for Safari - using 16ms to get 60fps
window.requestIdleCallback =
	window.requestIdleCallback ||
	(handler => {
		let startTime = Date.now();
		setTimeout(
			() =>
				handler({
					timeRemaining: () => Math.max(0, 16.0 - (Date.now() - startTime))
				}),
			1
		);
	});

/**
 * parses function and returns arguments and body separately
 */
const parseFunction = f => {
	// get the function body of the synchronous diff
	const code = f.toString();

	// extract the function arguments - async version will have the same arguments
	const argMatches = code.match(/function\s+\w+\(([^)]*)\)/);
	if (!argMatches || !argMatches[1])
		throw new Error(`Invalid function arguments: ${code}`);
	const args = argMatches[1];

	// extract the function body - this wil be used as basis for the async version
	const bracketPosition = code.indexOf('{');
	if (!bracketPosition)
		throw new Error(`Invalid function start bracket: ${code}`);
	const lastCharacter = code.charAt(code.length - 1);
	if (lastCharacter !== '}')
		throw new Error(`Invalid function end bracket: ${code}`);
	const body = code.slice(bracketPosition + 1, -1);

	return { args, body };
};

/**
 * get generator function constructor because it is not exposed by default
 */
const getGeneratorFunctionConstructor = new Function(
	'return Object.getPrototypeOf(function*(){}).constructor'
);
const GeneratorFunction = getGeneratorFunctionConstructor();

/**
 * get async function constructor because it is not exposed by default
 */
const getAsyncFunctionConstructor = new Function(
	'return Object.getPrototypeOf(async function(){}).constructor'
);
const AsyncFunction = getAsyncFunctionConstructor();

/**
 * returns an async/generator function based on an existing regular function
 * @returns {function}
 */
function generateAsyncFunction(
	syncFunction,
	asyncFunctionName,
	generator,
	deps,
	asyncCalls,
	breakCode
) {
	// if we previously generated the function, used it from global
	if (window[asyncFunctionName]) return window[asyncFunctionName];

	// parse function and get its arguments and body
	let { args, body } = parseFunction(syncFunction, deps);

	// add dependencies as arguments - these are reserved in mangle.json so that they are not modified by build
	for (const dep of deps) args += `, ${dep}`;

	// replace pseudo yield/await calls - if we get a promise, yield/await it
	for (const asyncCall of asyncCalls)
		body = body.replaceAll(
			new RegExp(asyncCall, 'g'),
			`${generator ? 'yield *' : 'await'} ${asyncCall}`
		);

	// add the break code if requested - this is the break point at which render will stop and check to see if there is enough time - if not, wait until we do
	if (breakCode) body = `${breakCode}${body}`;

	console.log(
		'async/generator function generated',
		asyncFunctionName,
		args,
		body
	);

	const functionType = generator ? GeneratorFunction : AsyncFunction;
	window[asyncFunctionName] = new functionType(args, body);
	return window[asyncFunctionName];
}

/**
 * generate the diff generator function from its regular version
 */
const diffGenerator = generateAsyncFunction(
	diff,
	'diffGenerator',
	true,
	[
		'options',
		'doRender',
		'assign',
		'Component',
		'Fragment',
		'diffChildren',
		'diffElementNodes'
	],
	['diffChildren', 'diffElementNodes'],
	// we only add this for the main diff function - start of recursion - if we're running out of deadline, yield and get back as browser allows us
	`if (typeof window !== 'undefined' && (!window._preactDeadline || Date.now() > (window._preactDeadline - 1))) {
		yield new Promise(resolve => requestIdleCallback(deadline => { window._preactDeadline = Date.now() + deadline.timeRemaining(); resolve(); }));
	}`
);

/**
 * runner routine around the diff generator to yield when there is a result and pass the dependencies
 */
const diffRunner = function*() {
	// call the diff children generator with its dependencies and get the generator back
	const generator = diffGenerator(
		...arguments,
		options,
		doRender,
		assign,
		Component,
		Fragment,
		diffChildrenRunner,
		diffElementNodesRunner
	);

	// get the next result from generator until there is a promise - then yield it
	for (
		let nextValue = generator.next();
		!nextValue.done;
		nextValue = generator.next()
	)
		if (nextValue.value && nextValue.value.then) yield nextValue.value;
};

/**
 * async routine around the diff generator - awaits promise when there is one - this is the part where we really break up the blocking code
 * @returns {Promise<void>}
 */
const diffAsync = async function() {
	const generator = diffGenerator(
		...arguments,
		options,
		doRender,
		assign,
		Component,
		Fragment,
		diffChildrenRunner,
		diffElementNodesRunner
	);
	for (
		let nextValue = generator.next();
		!nextValue.done;
		nextValue = generator.next()
	)
		if (nextValue.value && nextValue.value.then) await nextValue.value;
};

/**
 * generate the diff children function from its regular version
 */
const diffChildrenGenerator = generateAsyncFunction(
	diffChildren,
	'diffChildrenGenerator',
	true,
	[
		'diff',
		'unmount',
		'applyRef',
		'createVNode',
		'Fragment',
		'EMPTY_OBJ',
		'EMPTY_ARR',
		'getDomSibling'
	],
	['diff']
);

/**
 * runner routine around the children generator to yield when there is a result and pass the dependencies
 */
const diffChildrenRunner = function*() {
	// call the diff children generator with its dependencies and get the generator back
	const generator = diffChildrenGenerator(
		...arguments,
		diffRunner,
		unmount,
		applyRef,
		createVNode,
		Fragment,
		EMPTY_OBJ,
		EMPTY_ARR,
		getDomSibling
	);

	// get the next result from generator until there is a promise - then yield it
	for (
		let nextValue = generator.next();
		!nextValue.done;
		nextValue = generator.next()
	)
		if (nextValue.value && nextValue.value.then) yield nextValue.value;
};

/**
 * generate the diff element nodes function from its regular version
 */
const diffElementNodesGenerator = generateAsyncFunction(
	diffElementNodes,
	'diffElementNodesGenerator',
	true,
	[
		'EMPTY_OBJ',
		'getDomSibling',
		'diffProps',
		'setProperty',
		'assign',
		'removeNode',
		'slice',
		'diffChildren'
	],
	['diff']
);

/**
 * runner routine around the element nodes generator to yield when there is a result and pass the dependencies
 */
const diffElementNodesRunner = function*() {
	// call the diff element nodes generator with its dependencies and get the generator back
	const generator = diffElementNodesGenerator(
		...arguments,
		EMPTY_OBJ,
		getDomSibling,
		diffProps,
		setProperty,
		assign,
		removeNode,
		slice,
		diffChildrenRunner
	);

	// get the next result from generator until there is a promise - then yield it
	for (
		let nextValue = generator.next();
		!nextValue.done;
		nextValue = generator.next()
	)
		if (nextValue.value && nextValue.value.then) yield nextValue.value;
};

// generate the main render routine and create its async version that we will use for initial render
const renderAsyncCore = generateAsyncFunction(
	render,
	'renderAsync',
	false,
	[
		'options',
		'createElement',
		'Fragment',
		'EMPTY_OBJ',
		'slice',
		'diff',
		'commitRoot'
	],
	['diff']
);

/**
 * returns if async is supported in the execution environment
 * @returns {boolean}
 */
const asyncSupported = () => {
	if (typeof window === 'undefined') return false;
	if (typeof AsyncFunction !== 'function') return false;
	if (typeof GeneratorFunction !== 'function') return false;
	return true;
};

/**
 * main exposed async render function
 * @param vnode
 * @param parentDom
 * @param replaceNode
 * @returns {void|*}
 */
export const renderAsync = (vnode, parentDom, replaceNode) => {
	// default to regular render if async is not supported
	if (!asyncSupported()) return render(vnode, parentDom, replaceNode);

	console.log('running render async core');
	return renderAsyncCore(
		vnode,
		parentDom,
		replaceNode,
		options,
		createElement,
		Fragment,
		EMPTY_OBJ,
		slice,
		diffAsync,
		commitRoot
	);
};

/**
 * hydrate async version
 * @param vnode
 * @param parentDom
 * @returns {void|*}
 */
const hydrateAsync = (vnode, parentDom) =>
	renderAsync(vnode, parentDom, () => {});

/*
// async implementation of adding component to render queue
options.addRenderQueue = c => {

	// initialize render queue variables in global space
	if (window._preactQueue === undefined) window._preactQueue = [];
	if (window._preactQueueCount === undefined) window._preactQueueCount = 0;

	// add the component to the render queue
	window._preactQueue.push(c);

	// if the previous value was 0 (queue was empty) this will return 0 and negation will make it true, which means we should process the render queue now
	// if the previous value was greater (queue was not empty, there were other elements to render), we won't process the render queue now because it should be processed by previous call
	return !window._preactQueueCount++;
};

// async implementation of processing render queue
const processRenderQueue = async () => {

	// generate async component render routine if not done before
	const renderComponentAsync = generateAsyncFunction(renderComponent, 'renderComponentAsync');

	// render the components in render queue
	let queue;
	while ((window._preactQueueCount = window._preactQueue.length)) {
		queue = window._preactQueue.sort((a, b) => a._vnode._depth - b._vnode._depth);
		window._preactQueue = [];
		// Don't update `renderCount` yet. Keep its value non-zero to prevent unnecessary
		// process() calls from getting scheduled while `queue` is still being consumed.
		for (const c of queue.filter(c => c._dirty)) await renderComponentAsync(c, deps);
	}
};
options.processRenderQueue = () => processRenderQueue(); // wrap it in a regular function so that caller will not wait for promise

*/
