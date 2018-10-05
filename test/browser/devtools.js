import { createElement as h } from '../../src/create-element';
import { render } from '../../src/render';
import { assign } from '../../src/util';
import { Component } from '../../src/component';
import { getDisplayName, setIn } from '../../src/devtools/custom';
import { setupScratch, setupRerender, teardown } from '../_util/helpers';
import { initDevTools } from '../../src/devtools';
import options from '../../src/options';

/** @jsx h */

/**
 * @returns {import('../../src/internal').DevtoolsHook}
 */
function createMockHook() {
	let roots = new Set();
	let events = [];

	function emit(ev, data) {
		if (ev=='renderer-attached') return;
		events.push(data);
	}

	function getFiberRoots() {
		return roots;
	}

	function clear() {
		events.length = 0;
	}

	return {
		_roots: roots,
		log: events,
		_renderers: {},
		helpers: {},
		clear,
		getFiberRoots,
		emit
	};
}

describe('devtools', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('getDisplayName', () => {
		it('should get dom name', () => {
			expect(getDisplayName(h('div'))).to.equal('div');
		});

		it('should get Functional Component name', () => {
			function Foo() {
				return <div />;
			}

			expect(getDisplayName(h(Foo))).to.equal('Foo');
		});

		it('should get class name', () => {
			class Bar extends Component {
				render() {
					return <div />;
				}
			}

			expect(getDisplayName(h(Bar))).to.equal('Bar');
		});
	});

	describe('setIn', () => {
		it('should set top property', () => {
			let obj = {};
			setIn(obj, ['foo'], 'bar');
			expect(obj).to.deep.equal({ foo: 'bar' });
		});

		it('should set deep property', () => {
			let obj2 = { foo: { bar: [{ baz: 1 }] } };
			setIn(obj2, ['foo', 'bar', 0, 'baz'], 2);
			expect(obj2).to.deep.equal({ foo: { bar: [{ baz: 2 }] } });
		});

		it('should overwrite property', () => {
			let obj = { foo: 'foo' };
			setIn(obj, ['foo'], 'bar');
			expect(obj).to.deep.equal({ foo: 'bar' });
		});

		it('should set array property', () => {
			let obj = { foo: ['foo'] };
			setIn(obj, ['foo', 0], 'bar');
			expect(obj).to.deep.equal({ foo: ['bar'] });
		});
	});

	describe('Renderer', () => {

		/** @type {import('../../src/internal').DevtoolsHook} */
		let hook;

		let oldOptions;

		beforeEach(() => {
			oldOptions = assign({}, options);

			hook = createMockHook();
			window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;

			initDevTools();
			let rid = Object.keys(hook._renderers)[0];

			// Trigger setter.
			hook.helpers[rid] = {};
			hook.clear();
		});

		afterEach(() => {
			delete window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
			assign(options, oldOptions);
		});

		it('should detect when a root is updated', () => {
			render(<div>Hello World</div>, scratch);
			expect(hook.log.map(x => x.type)).to.deep.equal([
				'mount',
				'root',
				'rootCommitted'
			]);
			let mount = hook.log.find(x => x.type==='mount');

			hook.clear();
			render(<div>Foo</div>, scratch);
			expect(hook.log.map(x => x.type)).to.deep.equal([
				'update',
				'rootCommitted'
			]);

			expect(mount.internalInstance).to.equal(hook.log[0].internalInstance);
		});

		it('should detect setState update', () => {
			let updateState;

			class Foo extends Component {
				constructor() {
					super();
					updateState = () => this.setState(prev => ({ active: !prev.active }));
				}

				render() {
					return <h1>{this.state.active ? 'foo' : 'bar'}</h1>;
				}
			}

			render(<Foo />, scratch);
			expect(hook.log.map(x => x.type)).to.deep.equal([
				'mount',
				'mount',
				'mount',
				'root',
				'rootCommitted'
			]);
			let prev = [...hook.log];
			hook.clear();

			updateState();
			rerender();

			expect(hook.log.map(x => x.type)).to.deep.equal([
				'update',
				'update',
				'rootCommitted'
			]);

			hook.log.filter(x => x.type === 'update').forEach(next => {
				let update = prev.find(old => old.type === 'mount' && old.internalInstance === next.internalInstance);

				expect(update).to.not.equal(undefined);
				expect(update.data.state).to.not.equal(next.data.state);
			});
		});
	});
});
