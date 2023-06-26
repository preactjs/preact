// importing the dependencies from their source codes because if we put these exports in the main
// bundle it increases its size significantly - this means we are repeating the same source code
// in another bundle - inefficient but better than increasing core bundle size
import { EMPTY_OBJ, EMPTY_ARR } from '../../src/constants';
import { render, hydrate } from '../../src/index';
import options from '../../src/options';
import {
	Component,
	getDomSibling,
	renderComponent,
	updateParentDomPointers
} from '../../src/component';
import {
	createElement,
	createVNode,
	Fragment,
	createRef,
	isValidElement
} from '../../src/create-element';
import { assign, removeNode, slice } from '../../src/util';
import {
	diff,
	diffElementNodes,
	doRender,
	unmount,
	applyRef,
	commitRoot
} from '../../src/diff/index';
import {
	diffChildren,
	reorderChildren,
	placeChild,
	toChildArray
} from '../../src/diff/children';
import { diffProps, setProperty } from '../../src/diff/props';
import { cloneElement } from '../../src/clone-element';
import { createContext } from '../../src/create-context';

/**
 * returns if async is supported in the execution environment
 * @returns {boolean}
 */
const asyncSupported = () => {
	if (typeof window === 'undefined') return false;
	if (typeof AsyncFunction !== 'function') return false;
	return typeof GeneratorFunction === 'function';
};

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
	// if we previously generated the function, nothing to do
	if (window._preactAsync[asyncFunctionName]) return;

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

	// generate the async/generator function
	const functionType = generator ? GeneratorFunction : AsyncFunction;
	window._preactAsync[asyncFunctionName] = new functionType(args, body);
}

/**
 * initializes the async rendering global namespace - because of microbundle
 * we are forced to use global space here because it always transforms the
 * generators and async functions and we escape that by creating them with
 * dynamic constructors, which limit their scope and we use global
 */
const initializeAsyncRendering = () => {
	// no need to initialize again if done before
	if (window._preactAsync && window._preactAsync.initialized) return;

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

	// initialize global namespace to keep async functions and regular references
	window._preactAsync = {
		initialized: true, // keep it here to prevent initialization again
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
	};

	// generate the diff generator function from its regular version
	generateAsyncFunction(
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

	// runner routine around the diff generator to yield when there is a result and pass the dependencies
	window._preactAsync.diffRunner = new GeneratorFunction(`
		// call the diff children generator with its dependencies and get the generator back
		const generator = window._preactAsync.diffGenerator(
			...arguments,
			window._preactAsync.options,
			window._preactAsync.doRender,
			window._preactAsync.assign,
			window._preactAsync.Component,
			window._preactAsync.Fragment,
			window._preactAsync.diffChildrenRunner,
			window._preactAsync.diffElementNodesRunner
		);

		// get the next result from generator until there is a promise - then yield it
		for (
			let nextValue = generator.next();
			!nextValue.done;
			nextValue = generator.next()
		)
			if (nextValue.value && nextValue.value.then) yield nextValue.value;
	`);

	// async routine around the diff generator - awaits promise when there is one - this is the part where we really break up the blocking code
	window._preactAsync.diffAsync = new AsyncFunction(`
		const generator = window._preactAsync.diffGenerator(
			...arguments,
			window._preactAsync.options,
			window._preactAsync.doRender,
			window._preactAsync.assign,
			window._preactAsync.Component,
			window._preactAsync.Fragment,
			window._preactAsync.diffChildrenRunner,
			window._preactAsync.diffElementNodesRunner
		);
		for (let nextValue = generator.next(); !nextValue.done; nextValue = generator.next())
  		if (nextValue.value && nextValue.value.then) await nextValue.value;
	`);

	// generate the diff children function from its regular version
	generateAsyncFunction(
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
			'getDomSibling',
			'placeChild',
			'reorderChildren'
		],
		['diff']
	);

	// runner routine around the children generator to yield when there is a result and pass the dependencies
	window._preactAsync.diffChildrenRunner = new GeneratorFunction(`
		// call the diff children generator with its dependencies and get the generator back
		const generator = window._preactAsync.diffChildrenGenerator(
			...arguments,
			window._preactAsync.diffRunner,
			window._preactAsync.unmount,
			window._preactAsync.applyRef,
			window._preactAsync.createVNode,
			window._preactAsync.Fragment,
			window._preactAsync.EMPTY_OBJ,
			window._preactAsync.EMPTY_ARR,
			window._preactAsync.getDomSibling,
			window._preactAsync.placeChild,
			window._preactAsync.reorderChildren
		);

		// get the next result from generator until there is a promise - then yield it
		for (
			let nextValue = generator.next();
			!nextValue.done;
			nextValue = generator.next()
		)
			if (nextValue.value && nextValue.value.then) yield nextValue.value;
	`);

	// generate the diff element nodes function from its regular version
	generateAsyncFunction(
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
		['diffChildren']
	);

	// runner routine around the element nodes generator to yield when there is a result and pass the dependencies
	window._preactAsync.diffElementNodesRunner = new GeneratorFunction(`
		// call the diff element nodes generator with its dependencies and get the generator back
		const generator = window._preactAsync.diffElementNodesGenerator(
			...arguments,
			window._preactAsync.EMPTY_OBJ,
			window._preactAsync.getDomSibling,
			window._preactAsync.diffProps,
			window._preactAsync.setProperty,
			window._preactAsync.assign,
			window._preactAsync.removeNode,
			window._preactAsync.slice,
			window._preactAsync.diffChildrenRunner
		);

		// get the next result from generator until there is a promise - then yield it
		for (
			let nextValue = generator.next();
			!nextValue.done;
			nextValue = generator.next()
		)
			if (nextValue.value && nextValue.value.then) yield nextValue.value;
	`);

	// generate the main render routine and create its async version that we will use for initial render
	generateAsyncFunction(
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

	/*************************************************************************************************************************************
	 * below is async implementation of processing render queue. disabled for now, limiting async rendering to initial render only.
	 * we have seen some bugs in cases of frequent re-rendering, specifically in comparison control, when we update state quickly based on mouse events.
	 * we may want to re-visit this later to fix it properly.

	// async implementation of adding component to render queue
	options.addRenderQueue = c => {
		// initialize render queue variables in global space
		if (window._preactAsync.queue === undefined) window._preactAsync.queue = [];
		if (window._preactAsync.queueCount === undefined)
			window._preactAsync.queueCount = 0;

		// add the component to the render queue
		window._preactAsync.queue.push(c);

		// if the previous value was 0 (queue was empty) this will return 0 and negation will make it true, which means we should process the render queue now
		// if the previous value was greater (queue was not empty, there were other elements to render), we won't process the render queue now because it should be processed by previous call
		return !window._preactAsync.queueCount++;
	};

	// generate async component render routine if not done before
	generateAsyncFunction(
		renderComponent,
		'renderComponentAsync',
		false,
		[
			'assign',
			'diff',
			'getDomSibling',
			'commitRoot',
			'updateParentDomPointers'
		],
		['diff']
	);

	// note that we are waiting for each component render here. otherwise it would be
	// "concurrent rendering" but that does not work at all - double rendering issues - not a good idea.
	// __v is mangled property of _vnode, __b => _depth, __d => _dirty
	window._preactAsync.processRenderQueue = new AsyncFunction(`
		let queue;
		while ((window._preactAsync.queueCount = window._preactAsync.queue.length)) {
			queue = window._preactAsync.queue.sort((a, b) => a.__v.__b - b.__v.__b);
			window._preactAsync.queue = [];
			for (const c of queue.filter(c => c.__d))
				await window._preactAsync.renderComponentAsync(
					c,
					window._preactAsync.assign,
					window._preactAsync.diffAsync,
					window._preactAsync.getDomSibling,
					window._preactAsync.commitRoot,
					window._preactAsync.updateParentDomPointers
				);
		}
	`);
	options.processRenderQueue = () => window._preactAsync.processRenderQueue(); // wrap it in a regular function so that caller will not wait for promise
	 **************************************************************************************************************************************/
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

	// initialize the async rendering global namespace if needed
	// note that this will update the options, making it impossible for the regular
	// rendering to run - users would need to reset option hooks for that to work
	// but there may be weird issues with it - best to try to avoid that scenario
	initializeAsyncRendering();

	// start the async render
	return window._preactAsync.renderAsync(
		vnode,
		parentDom,
		replaceNode,
		options,
		createElement,
		Fragment,
		EMPTY_OBJ,
		slice,
		window._preactAsync.diffAsync,
		commitRoot
	);
};

/**
 * hydrate async version
 * @param vnode
 * @param parentDom
 * @returns {void|*}
 */
export const hydrateAsync = (vnode, parentDom) =>
	renderAsync(vnode, parentDom, () => {});

/**
 * export standard preact functions as well in case the user needs to run serial rendering
 */
export {
	render,
	hydrate,
	createElement,
	createElement as h,
	createRef,
	isValidElement,
	Component,
	Fragment,
	cloneElement,
	createContext,
	toChildArray,
	options
};
