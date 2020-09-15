import React, { Component, lazy } from 'preact/compat';

const h = React.createElement;

/**
 * Create a Lazy component whose promise is controlled by by the test. This
 * function returns 3 values: The Lazy component to render, a `resolve`
 * function, and a `reject` function. Call `resolve` with the component the Lazy
 * component should resolve with. Call `reject` with the error the Lazy
 * component should reject with
 *
 * @example
 * // 1. Create and render the Lazy component
 * const [Lazy, resolve] = createLazy();
 * render(
 * 	<Suspense fallback={<div>Suspended...</div>}>
 * 		<Lazy />
 * 	</Suspense>,
 * 	scratch
 * );
 * rerender(); // Rerender is required so the fallback is displayed
 * expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);
 *
 * // 2. Resolve the Lazy with a new component to render
 * return resolve(() => <div>Hello</div>).then(() => {
 * 	rerender();
 * 	expect(scratch.innerHTML).to.equal(`<div>Hello</div>`);
 * });
 *
 * @typedef {import('../../../src').ComponentType<any>} ComponentType
 * @returns {[typeof Component, (c: ComponentType) => Promise<void>, (e: Error) => Promise<void>]}
 */
export function createLazy() {
	/** @type {(c: ComponentType) => Promise<void>} */
	let resolver, rejecter;
	const Lazy = lazy(() => {
		let promise = new Promise((resolve, reject) => {
			resolver = c => {
				resolve({ default: c });
				return promise;
			};

			rejecter = e => {
				reject(e);
				return promise;
			};
		});

		return promise;
	});

	return [Lazy, c => resolver(c), e => rejecter(e)];
}

/**
 * Returns a Component and a function (named `suspend`) that will suspend the component when called.
 * `suspend` will return two functions, `resolve` and `reject`. Call `resolve` with a Component the
 * suspended component should resume with or reject with the Error the suspended component should
 * reject with
 *
 * @example
 * // 1. Create a suspender with initial children (argument to createSuspender) and render it
 * const [Suspender, suspend] = createSuspender(() => <div>Hello</div>);
 * render(
 * 	<Suspense fallback={<div>Suspended...</div>}>
 * 		<Suspender />
 * 	</Suspense>,
 * 	scratch
 * );
 * expect(scratch.innerHTML).to.eql(`div>Hello</div>`);
 *
 * // 2. Cause the component to suspend and rerender the update (i.e. the fallback)
 * const [resolve] = suspend();
 * rerender();
 * expect(scratch.innerHTML).to.eql(`div>Suspended...</div>`);
 *
 * // 3. Resolve the suspended component with a new component and rerender
 * return resolve(() => <div>Hello2</div>).then(() => {
 * 	rerender();
 * 	expect(scratch.innerHTML).to.eql(`div>Hello2</div>`);
 * });
 *
 * @typedef {Component<{}, any>} Suspender
 * @typedef {[(c: ComponentType) => Promise<void>, (error: Error) => Promise<void>]} Resolvers
 * @param {ComponentType} DefaultComponent
 * @returns {[typeof Suspender, () => Resolvers]}
 */
export function createSuspender(DefaultComponent) {
	/** @type {(lazy: typeof Component) => void} */
	let renderLazy;
	class Suspender extends Component {
		constructor(props, context) {
			super(props, context);
			this.state = { Lazy: null };

			renderLazy = Lazy => this.setState({ Lazy });
		}

		render(props, state) {
			return state.Lazy ? h(state.Lazy, props) : h(DefaultComponent, props);
		}
	}

	sinon.spy(Suspender.prototype, 'render');

	/**
	 * @returns {Resolvers}
	 */
	function suspend() {
		const [Lazy, resolve, reject] = createLazy();
		renderLazy(Lazy);
		return [resolve, reject];
	}

	return [Suspender, suspend];
}
