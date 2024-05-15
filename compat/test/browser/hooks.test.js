import { createContext } from 'preact';
import React, {
	createElement,
	useDeferredValue,
	useInsertionEffect,
	useTransition,
	render,
	useState,
	useContext,
	useEffect
} from 'preact/compat';
import { setupRerender, act } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';

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
			const spy = sinon.spy();
			const App = () => {
				useInsertionEffect(spy, []);
				return <p>hello world</p>;
			};

			act(() => {
				render(<App />, scratch);
			});

			expect(scratch.innerHTML).to.equal('<p>hello world</p>');
			expect(spy).to.be.calledOnce;
		});
	});

	describe('useTransition', () => {
		it('runs transitions', () => {
			const spy = sinon.spy();

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
			expect(spy).to.be.calledOnce;
			expect(scratch.innerHTML).to.equal('<p>Pending: no</p>');
		});
	});

	it('should release ._force on context-consumers', () => {
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
