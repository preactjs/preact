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

	it('finishes attaching refs before a detached ref can flush passive effects', async () => {
		const log = [];
		const [Other, sync] = createOther(log);
		const onRef = node => {
			if (!node) sync();
		};

		function Fresh() {
			const ref = useRef(null);
			useLayoutEffect(() => {
				log.push('layout');
			}, []);
			useEffect(() => {
				log.push(ref.current);
			}, []);
			return <span ref={ref} />;
		}

		function App({ next }) {
			return (
				<>
					{next && <Fresh />}
					<i ref={next ? null : onRef} />
				</>
			);
		}

		render(<Other />, document.createElement('div'));
		render(<App next={false} />, scratch);
		render(<App next={true} />, scratch);
		await afterPaint();

		expect(log).to.deep.equal([
			'other render',
			'layout',
			scratch.querySelector('span')
		]);
	});

	it('allows an effect to drain the render queue with flushSync before new work', () => {
		const log = [];
		const [Other, sync] = createOther(log);
		let update;

		function App() {
			const [value, setValue] = useState(0);
			update = setValue;
			useEffect(sync, []);
			return (
				<>
					{value}
					<Other />
				</>
			);
		}

		render(<App />, scratch);
		flushSync(() => update(1));
		expect(scratch.textContent).to.equal('1');
		expect(log).to.deep.equal(['other render']);
	});

	it('allows an effect to drain the render queue with flushSync', async () => {
		const log = [];
		const [Other, sync] = createOther(log);

		function App() {
			const [value, setValue] = useState(0);
			// Queued by the commit, so the effect below runs ahead of this rerender.
			useLayoutEffect(() => setValue(1), []);
			useEffect(sync, []);
			return (
				<>
					{value}
					<Other />
				</>
			);
		}

		render(<App />, scratch);
		await Promise.resolve();
		expect(scratch.textContent).to.equal('1');
		expect(log).to.deep.equal(['other render']);
	});

	it('keeps effects of a rendering tree for its commit when the render flushes the queue', async () => {
		for (const trigger of ['ref', 'layout cleanup']) {
			const log = [];
			const [Other, sync] = createOther(log);

			// Leaves a rerender queued by a commit in the render queue.
			function Late() {
				const [node, setNode] = useState(null);
				return <b ref={el => el && el != node && setNode(el)} />;
			}

			function Fresh() {
				const ref = useRef(null);
				useLayoutEffect(() => {
					log.push('layout');
				}, []);
				useEffect(() => {
					log.push(ref.current);
				}, []);
				return <span ref={ref} />;
			}

			function Leaving() {
				useLayoutEffect(() => sync, []);
				return null;
			}

			function App({ next }) {
				return (
					<div>
						{next && <Fresh />}
						{trigger == 'ref' ? (
							<i ref={next ? null : node => node || sync()} />
						) : (
							<p>{!next && <Leaving />}</p>
						)}
					</div>
				);
			}

			render(<Other />, document.createElement('div'));
			render(<App next={false} />, scratch);
			await afterPaint();
			render(
				<section>
					<div>
						<Late />
					</div>
				</section>,
				document.createElement('div')
			);
			// Detaching flushes the queue, deep inside this render.
			render(<App next={true} />, scratch);
			await afterPaint();

			expect(log).to.deep.equal([
				'other render',
				'layout',
				scratch.querySelector('span')
			]);
			render(null, scratch);
		}
	});

	it('keeps the DOM intact when the cleanup of an unmounted component calls flushSync', async () => {
		let show, bump, setTitle;

		function Old() {
			useEffect(() => () => flushSync(() => setTitle('closed')), []);
			return <s>old</s>;
		}

		function New() {
			const [n, setN] = useState(0);
			bump = () => setN(1);
			useEffect(() => {}, [n]);
			return <u>{n}</u>;
		}

		function App() {
			const [which, setWhich] = useState('old');
			const [title, set] = useState('open');
			show = setWhich;
			setTitle = set;
			return <div title={title}>{which == 'old' ? <Old /> : <New />}</div>;
		}

		render(<App />, scratch);
		await afterPaint();
		show('new');
		await Promise.resolve();
		// `New` rerenders before the frame that would run `Old`'s cleanup.
		bump();
		await afterPaint();

		expect(scratch.innerHTML).to.equal('<div title="closed"><u>1</u></div>');
	});

	it('keeps the cleanup of a component the current render unmounts after paint when that render commits another root', async () => {
		const log = [];
		const other = document.createElement('div');

		function X() {
			useEffect(() => () => log.push('X cleanup'), []);
			return null;
		}

		class LegacyPortal extends Component {
			componentDidMount() {
				render(<i />, other);
			}
			componentWillUnmount() {
				render(null, other);
			}
			render() {
				return null;
			}
		}

		function Y({ n }) {
			useLayoutEffect(() => {
				log.push('Y layout ' + n);
			});
			useEffect(() => {
				log.push('Y effect ' + n);
			});
			return null;
		}

		const App = ({ n, showX }) => (
			<Fragment>
				{showX && <X />}
				{showX && <LegacyPortal />}
				<Y n={n} />
			</Fragment>
		);

		render(<App n={0} showX />, scratch);
		await afterPaint();
		log.length = 0;

		render(<App n={1} showX />, scratch);
		render(<App n={2} showX={false} />, scratch);
		await afterPaint();

		expect(log).to.deep.equal([
			'Y layout 1',
			'Y effect 1',
			'Y layout 2',
			'X cleanup',
			'Y effect 2'
		]);
	});

	it('renders the rest of the queue after flushSync threw the error of an effect', async () => {
		let setV;

		function Bad({ v }) {
			useEffect(() => {
				if (v) throw new Error('bad effect');
			}, [v]);
			return null;
		}

		function Item({ v }) {
			const [n, setN] = useState(0);
			useLayoutEffect(() => {
				if (v && !n) setN(1);
			}, [v, n]);
			return <i>{n}</i>;
		}

		function App() {
			const [v, set] = useState(0);
			setV = set;
			return (
				<div>
					<Bad v={v} />
					<Item v={v} />
				</div>
			);
		}

		render(<App />, scratch);
		await afterPaint();

		expect(() => flushSync(() => setV(1))).to.throw('bad effect');
		await afterPaint();
		expect(scratch.innerHTML).to.equal('<div><i>1</i></div>');
	});

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
