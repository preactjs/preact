import { createElement, render, Component } from 'preact';
import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import 'preact/debug';
import { act } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';

/** @jsx createElement */

describe('debug with hooks', () => {
	let scratch;
	let errors = [];
	let warnings = [];

	beforeEach(() => {
		errors = [];
		warnings = [];
		scratch = setupScratch();
		sinon.stub(console, 'error').callsFake(e => errors.push(e));
		sinon.stub(console, 'warn').callsFake(w => warnings.push(w));
	});

	afterEach(() => {
		console.error.restore();
		console.warn.restore();
		teardown(scratch);
	});

	// TODO: Fix this test. It only passed before because App was the first component
	// into render so currentComponent in hooks/index.js wasn't set yet. However,
	// any children under App wouldn't have thrown the error if they did what App
	// did because currentComponent would be set to App.
	// In other words, hooks never clear currentComponent so once it is set, it won't
	// be unset
	it.skip('should throw an error when using a hook outside a render', () => {
		const Foo = props => props.children;
		class App extends Component {
			componentWillMount() {
				useState();
			}

			render() {
				return <p>test</p>;
			}
		}
		const fn = () =>
			act(() =>
				render(
					<Foo>
						<App />
					</Foo>,
					scratch
				)
			);
		expect(fn).to.throw(/Hook can only be invoked from render/);
	});

	it('should throw an error when invoked outside of a component', () => {
		function foo() {
			useEffect(() => {}); // Pretend to use a hook
			return <p>test</p>;
		}

		const fn = () =>
			act(() => {
				render(foo(), scratch);
			});
		expect(fn).to.throw(/Hook can only be invoked from render/);
	});

	it('should throw an error when invoked outside of a component before render', () => {
		function Foo(props) {
			useEffect(() => {}); // Pretend to use a hook
			return props.children;
		}

		const fn = () =>
			act(() => {
				useState();
				render(<Foo>Hello!</Foo>, scratch);
			});
		expect(fn).to.throw(/Hook can only be invoked from render/);
	});

	it('should throw an error when invoked inside an effect callback', () => {
		function Foo(props) {
			useEffect(() => {
				useState();
			});
			return props.children;
		}

		const fn = () =>
			act(() => {
				render(<Foo>Hello!</Foo>, scratch);
			});
		expect(fn).to.throw(/Hook can only be invoked from render/);
	});

	it('should warn for useMemo/useCallback without arguments', () => {
		const App = () => {
			const [people] = useState([40, 20, 60, 80]);
			const retiredPeople = useMemo(() => people.filter(x => x >= 60));
			const cb = useCallback(() => () => 'test');
			return <p onClick={cb}>{retiredPeople.map(x => x)}</p>;
		};
		render(<App />, scratch);
		// One more to show the need for @babel/plugin-transform-react-jsx-source
		expect(warnings.length).to.equal(3);
	});

	it('should warn when useMemo is called with non-array args', () => {
		const App = () => {
			const foo = useMemo(() => 'foo', 12);
			return <p>{foo}</p>;
		};
		render(<App />, scratch);
		expect(warnings[0]).to.match(/without passing arguments/);
	});
});
