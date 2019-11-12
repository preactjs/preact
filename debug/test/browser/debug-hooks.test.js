import { createElement, render, Component } from 'preact';
import {
	useState,
	useEffect,
	useLayoutEffect,
	useMemo,
	useCallback
} from 'preact/hooks';
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

	// TODO: Fix this test. It only passed before because render was never called.
	// Once render is called, currentComponent is set and never unset so calls to
	// hooks outside of components would still work.
	it.skip('should throw an error when invoked outside of a component', () => {
		function Foo(props) {
			useEffect(() => {}); // Pretend to use a hook
			return props.children;
		}

		const fn = () =>
			act(() => {
				render(<Foo>Hello!</Foo>, scratch);
				useState();
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

	it('should warn for argumentless useEffect hooks', () => {
		const App = () => {
			const [state] = useState('test');
			useEffect(() => 'test');
			return <p>{state}</p>;
		};
		render(<App />, scratch);
		expect(warnings[0]).to.match(/You should provide an array of arguments/);
		render(<App />, scratch);
		expect(warnings[1]).to.be.undefined;
	});

	it('should warn for argumentless useLayoutEffect hooks', () => {
		const App = () => {
			const [state] = useState('test');
			useLayoutEffect(() => 'test');
			return <p>{state}</p>;
		};
		render(<App />, scratch);
		expect(warnings[0]).to.match(/You should provide an array of arguments/);
		render(<App />, scratch);
		expect(warnings[1]).to.be.undefined;
	});

	it('should not warn for argumented effect hooks', () => {
		const App = () => {
			const [state] = useState('test');
			useLayoutEffect(() => 'test', []);
			useEffect(() => 'test', [state]);
			return <p>{state}</p>;
		};
		const fn = () => act(() => render(<App />, scratch));
		expect(fn).to.not.throw();
	});

	it('should warn for useless useMemo calls', () => {
		const App = () => {
			const [people] = useState([40, 20, 60, 80]);
			const retiredPeople = useMemo(() => people.filter(x => x >= 60));
			const cb = useCallback(() => () => 'test');
			return <p onClick={cb}>{retiredPeople.map(x => x)}</p>;
		};
		render(<App />, scratch);
		expect(warnings.length).to.equal(2);
	});

	it('should warn when non-array args is passed', () => {
		const App = () => {
			const foo = useMemo(() => 'foo', 12);
			return <p>{foo}</p>;
		};
		render(<App />, scratch);
		expect(warnings[0]).to.match(/without passing arguments/);
	});
});
