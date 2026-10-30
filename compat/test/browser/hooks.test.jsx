import { createContext } from 'preact';
import {
	Component,
	Fragment,
	Suspense,
	createElement,
	flushSync,
	lazy,
	useDeferredValue,
	useLayoutEffect,
	useRef,
	useInsertionEffect,
	useTransition,
	render,
	useState,
	useContext,
	useEffect,
	useEffectEvent
} from 'preact/compat';
import { setupRerender, act } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { vi } from 'vitest';

describe('React-18-hooks', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('useDeferredValue', () => {
		it('returns the value', () => {
			const App = props => {
				const val = useDeferredValue(props.text);
				return <p>{val}</p>;
			};

			render(<App text="hello world" />, scratch);

			expect(scratch.innerHTML).to.equal('<p>hello world</p>');
		});
	});

	describe('useInsertionEffect', () => {
		it('runs the effect', () => {
			const spy = vi.fn();
			const App = () => {
				useInsertionEffect(spy, []);
				return <p>hello world</p>;
			};

			act(() => {
				render(<App />, scratch);
			});

			expect(scratch.innerHTML).to.equal('<p>hello world</p>');
			expect(spy).toHaveBeenCalledOnce();
		});
	});

	describe('useTransition', () => {
		it('runs transitions', () => {
			const spy = vi.fn();

			/** @type {(v) => void} */
			let go;
			const App = () => {
				const [isPending, start] = useTransition();
				go = start;
				return <p>Pending: {isPending ? 'yes' : 'no'}</p>;
			};

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<p>Pending: no</p>');

			go(spy);
			rerender();
			expect(spy).toHaveBeenCalledOnce();
			expect(scratch.innerHTML).to.equal('<p>Pending: no</p>');
		});
	});

	describe('useEffectEvent', () => {
		it('sees latest values from render', () => {
			const spy = vi.fn();

			let triggerEvent;

			const App = ({ val }) => {
				const onEvent = useEffectEvent(() => {
					spy(val);
				});

				useEffect(() => {
					triggerEvent = () => {
						onEvent();
					};
				}, []);
			};

			act(() => {
				render(<App val={0} />, scratch);
			});

			triggerEvent();
			expect(spy).toHaveBeenCalledWith(0);

			act(() => {
				render(<App val={1} />, scratch);
			});

			triggerEvent();
			expect(spy).toHaveBeenCalledWith(1);
		});
	});

	it('should release the force-flag on context-consumers', () => {
		let sequence, setSubmitting;
		const Ctx = createContext({
			isSubmitting: false,
			setIsSubmitting: () => {}
		});
		const FormWrapper = props => {
			const [isSubmitting, setIsSubmitting] = useState(false);
			setSubmitting = setIsSubmitting;
			return (
				<Ctx.Provider value={{ isSubmitting, setIsSubmitting }}>
					{props.children}
				</Ctx.Provider>
			);
		};

		const Form = () => {
			const { isSubmitting, setIsSubmitting } = useContext(Ctx);
			const [shouldSubmit, setShouldSubmit] = useState(false);

			sequence = () => {
				setShouldSubmit(true);
			};

			const submit = () => {
				setIsSubmitting(true);
				setShouldSubmit(false);
			};

			useEffect(() => {
				if (shouldSubmit) {
					submit();
				}
			}, [shouldSubmit]);

			return (
				<p>
					isSubmitting: {'' + isSubmitting} | shouldSubmit: {'' + shouldSubmit}
				</p>
			);
		};

		const App = () => {
			return (
				<FormWrapper>
					<Form />
				</FormWrapper>
			);
		};

		render(<App />, scratch);

		act(() => {
			sequence();
		});
		expect(scratch.innerHTML).to.equal(
			'<p>isSubmitting: true | shouldSubmit: false</p>'
		);

		act(() => {
			setSubmitting(false);
		});
		expect(scratch.innerHTML).to.equal(
			'<p>isSubmitting: false | shouldSubmit: false</p>'
		);

		act(() => {
			sequence();
		});
		expect(scratch.innerHTML).to.equal(
			'<p>isSubmitting: true | shouldSubmit: false</p>'
		);
	});
});

// Kept out of the describe above, whose `setupRerender` replaces the default
// scheduler.
describe('effects before a queued rerender', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	const afterPaint = () => new Promise(r => setTimeout(r, 60));

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	function Logger({ name, log }) {
		useLayoutEffect(() => {
			log.push(`${name} layout`);
		}, []);
		useEffect(() => {
			log.push(`${name} effect`);
		}, []);
		return null;
	}

	function createOther(log) {
		let set;
		function Other() {
			const [value, setValue] = useState(0);
			set = setValue;
			if (value) log.push('other render');
			return null;
		}
		return [Other, () => flushSync(() => set(1))];
	}

	it('runs the layout work of a commit before its effects when it calls flushSync', async () => {
		const log = [];
		const [Other, sync] = createOther(log);

		function FromLayout() {
			useLayoutEffect(sync, []);
			return null;
		}

		function FromRef() {
			return <div ref={el => el && sync()} />;
		}

		class FromDidMount extends Component {
			componentDidMount() {
				sync();
			}
			render() {
				return null;
			}
		}

		class Later extends Component {
			componentDidMount() {
				log.push('later didMount');
			}
			render() {
				return null;
			}
		}

		for (const Sync of [FromLayout, FromRef, FromDidMount]) {
			log.length = 0;
			render(
				<Fragment>
					<Other />
					<Logger name="a" log={log} />
					<Sync />
					<Logger name="b" log={log} />
					<Later />
				</Fragment>,
				scratch
			);
			await afterPaint();
			render(null, scratch);

			const effects = log.indexOf('a effect');
			expect(effects).to.be.greaterThan(log.indexOf('b layout'));
			expect(effects).to.be.greaterThan(log.indexOf('later didMount'));
		}
	});

	it('runs effects of a revealed lazy tree before the rerender a ref queued', async () => {
		const log = [];
		const registry = new Set();

		function Slot({ item, children }) {
			useEffect(() => {
				registry.add(item);
			}, []);
			return children;
		}

		function Item() {
			const [node, setNode] = useState(null);
			const ref = useRef(null);
			if (node) log.push([...registry].findIndex(r => r.current == node));
			return (
				<Slot item={ref}>
					<span
						ref={el => {
							ref.current = el;
							if (el && el != node) setNode(el);
						}}
					/>
				</Slot>
			);
		}

		let resolve;
		const Lazy = lazy(() => new Promise(r => (resolve = r)));

		render(
			<Suspense fallback="loading">
				<Lazy />
			</Suspense>,
			scratch
		);
		// Resolved before the frame that would flush the suspended commit's effects.
		await Promise.resolve();
		resolve({
			default: () => (
				<Fragment>
					<Item />
					<Item />
				</Fragment>
			)
		});
		await afterPaint();

		expect(log).to.deep.equal([0, 1]);
	});

	it('does not run effects of siblings a suspending lazy discards before it resolves', async () => {
		const log = [];

		function Sibling() {
			useEffect(() => {
				log.push('mount');
				return () => log.push('cleanup');
			}, []);
			return null;
		}

		let resolve;
		const Lazy = lazy(() => new Promise(r => (resolve = r)));

		render(
			<Suspense fallback="loading">
				<Sibling />
				<Lazy />
			</Suspense>,
			scratch
		);
		await Promise.resolve();
		await Promise.resolve();
		expect(log).to.deep.equal([]);

		resolve({ default: () => 'lazy' });
		await afterPaint();

		expect(scratch.textContent).to.equal('lazy');
		expect(log).to.deep.equal(['mount']);
	});
});
