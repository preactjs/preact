import { h, render, Component, SFC, ChildContextProvider, ComponentProps, ComponentClass } from 'preact';

import 'preact/devtools';

// #Components and StatellesComponents
type DummyProps = { initialInput: string; }
type DummyState = { input: string; }

class DummyComponent extends Component<DummyProps, DummyState> {
	// static members cannot be typechecked by inferenece
	static defaultProps: DummyProps = {
		initialInput: 'hmm'
	}
	constructor(props: DummyProps) {
		super(props);
		this.state = {
			input: `x${this.props}x`
		}
	}

	render(props: DummyProps, state: DummyState) {
		const { initialInput } = this.props;
		const { input } = this.state;
		return (
			<DummerComponent
				initialInput={initialInput}
				input={input}
			/>
		);
	}
}

type DummerComponentProps = DummyProps & DummyState;

function DummerComponent({ input, initialInput }: DummerComponentProps) {
	return <div>Input: {input}, initial: {initialInput}</div>;
}
DummerComponent.defaultProps = { input: 'yay' };
DummerComponent.displayName = 'Hello';

const DummerComponent2: SFC<DummerComponentProps> = ({ initialInput, input }) => (
	<div>Input: {input}, initial: {initialInput}</div>
);
DummerComponent2.defaultProps = { input: 'yay' };
DummerComponent2.displayName = 'Hello2';


// #HOC

function HOCBaseRender<Props, State, ComponentState>(
	Cmp: ComponentClass<Props & State, ComponentState>
) {
	return class HOCBase extends Component<Props, State> {
		render() {
			return <Cmp {...this.props} {...this.state} />;
		}
	}
}

function HOCStateToProps<Props, State, ComponentState>(
	Cmp: ComponentClass<Props & State, ComponentState>,
	getState: () => State
) {
	return class HOCWrapper extends HOCBaseRender<Props, State, ComponentState>(Cmp) {
		// ... Implementation
		constructor() {
			super();
			this.state = getState();
		}
	}
}

class NameAndAge extends Component<{ name: string, age: number }, void> {
	render() {
		return <div>Name: {this.props.name}, Age: {this.props.age}</div>;
	}
}

const HOCNameAndAge = HOCStateToProps<{ name: string }, { age: number }, void>(NameAndAge, () => ({ age: 12 }));

const HocApp = () => (<HOCNameAndAge name="Iron Man" />)


// ## Highlighted

function Highlighted<Props, State>(WCmp: ComponentClass<Props & Partial<MyPropsCommon>, State>) {
	const cxName = 'not-sure';
	WCmp.defaultProps = {}
	return class extends Component<Props, State> {
		render() {
			return (
				<div class={cxName}>
					<WCmp count={1} {...this.props} />
				</div>
			);
		}
	}
}

type MyPropsCommon = { count: number };
type MyInputProps = { inputValue: string; }
class MyInput extends Component<MyInputProps & MyPropsCommon, void> { render() { return null } };

type MyLinkProps = { linkAddress: string; }
class MyLink extends Component<MyLinkProps & MyPropsCommon, void> { render() { return null } };

/* wrapped components */
// NOTE: Explicit generics is needed here because TS cannot infer(pick) just particular properties from generics
// https://github.com/Microsoft/TypeScript/issues/7423
// https://github.com/Microsoft/TypeScript/issues/6895
const HighlightedInput = Highlighted<MyInputProps, void>(MyInput);
const HighlightedLink = Highlighted<MyLinkProps, void>(MyLink);

/* usage example */
class Form extends Component<any, void> {
	render() {
		return (
			<div>
				<HighlightedInput inputValue={"inputValue"} />
				<HighlightedLink linkAddress={"/home"} />
				<MyInput inputValue="hello" count={111} />
				<MyLink linkAddress="/about" count={123} />
			</div>
		);
	}
}


// ## controller indout HOC

const controlledCmpHOC = <Props, State>(WrappedComponent: ComponentClass<Props, State> | SFC<Props>) => {
	return class PP extends Component<Partial<Props>, { name: string }> {
		constructor(props: Props) {
			super(props)
			this.state = {
				name: ''
			}

			this.onNameChange = this.onNameChange.bind(this)
		}
		onNameChange(event: KeyboardEvent) {
			this.setState({
				name: (event.target as HTMLInputElement).value
			})
		}
		render() {
			const newProps = {
				name: {
					value: this.state.name,
					onChange: this.onNameChange
				}
			}
			return <WrappedComponent {...this.props} {...newProps} />
		}
	}
}

type CCProps = {
	name: {
		value: string,
		onChange(event: KeyboardEvent): void,
	}
}
class Input extends Component<CCProps, void> {
	render() {
		return <input name="name" {...this.props.name} />
	}
}

const SFCInput: SFC<CCProps> = (props) => <input name="name" {...props.name} />;

const ControlledInput = controlledCmpHOC(Input);
const ControlledInput2 = controlledCmpHOC(SFCInput);

class PpHocExample extends Component<any, void>{
	render() {
		return (
			<form>
				<ControlledInput />
				<ControlledInput2 />
			</form>
		)
	}
}

// ## Connect like for provider

function connect() {
	return function Wrapper<Props, State>(WrappedComponent: ComponentClass<Props, State> | SFC<Props>) {
		return class ConnectHOC extends Component<Props, void> {

			static WrappedComponent = WrappedComponent;
			static displayName = `Connect(${getDisplayName(WrappedComponent)})`;
			private store: Store;

			constructor(props: Props, context: ProviderContext) {
				// when creating HOC we need always call super to propagate props/context correctly
				super(props, context);
				this.store = context.store;
			}

			render() {
				const extraProps = { store: this.store };

				return (
					<WrappedComponent {...this.props} {...extraProps} />
				);

				// Alterative return withouth JSX:

				// return h(
				//   WrappedComponent,
				//		@TODO TS error on  ...this.props
				//   {...this.props, ...extraProps}
				// );

				// return h(
				//   WrappedComponent,
				//   Object.assign({},this.props, extraProps)
				// );
			};
		}
	}
}

function getDisplayName(component: ComponentClass<any, any> | SFC<any>): string {
	return component.displayName || component.name || 'Component';
}

type ContainerProps = { time: Date }
type ContainerMappedProps = Partial<ProviderContext>;
class Container extends Component<ContainerProps & ContainerMappedProps, void>{
	render() {
		const { store } = this.props;
		return (
			<section>
				<div>Container</div>
				<button onClick={this.handleClick}>dispatch</button>
			</section>
		)
	}
	private handleClick = (ev: MouseEvent) => {
		const store = this.props.store;
		store && store.dispatch({ type: 'WAT' })
	}
}

const ConnectedContainer = connect()(Container);

type GreeterProps = { who: string };
type GreeterMappedProps = Partial<ProviderContext>;
const Greeter: SFC<GreeterProps & GreeterMappedProps> = ({ who }) => (
	<div>Hello {who}</div>
)
const ConnectedGreeter = connect()(Greeter);


// #Providers

type Store = {
	state: object,
	dispatch(payload: object): any,
	subscribe(listener: () => void): void,
	getState(): any,
}
type ProviderProps = {
	store: {},
	children?: [JSX.Element],
};
type ProviderContext = {
	store: Store,
};
class Provider extends Component<ProviderProps, void> implements ChildContextProvider<ProviderContext>{

	store = this.props.store || {}

	private dispatch = () => { }
	private getState = () => { }
	private subscribe = () => { }

	getChildContext() {
		return {
			store: {
				state: this.store,
				dispatch: this.dispatch,
				subscribe: this.subscribe,
				getState: this.getState,
			}
		}
	}
	render() {
		const { children = [] } = this.props

		return children[0];
	}
}

const App = () => (
	<Provider store={{ loading: true }}>
		<ConnectedGreeter who="Jason" />
		<ConnectedContainer time={new Date()} />
	</Provider>
)


// #render

const mountPoint = document.getElementById('app') as HTMLElement;
const initialProps = { initialInput: 'The input' };

render(<App />, mountPoint);
render(
	h(DummyComponent, initialProps),
	mountPoint
);
render(
	h(DummerComponent, { ...initialProps, input: 'one' }),
	mountPoint
);
render(
	h(DummerComponent2, { ...initialProps, input: 'one' }),
	mountPoint
);
render(
	<DummyComponent {...initialProps} />,
	mountPoint
);
render(
	<DummerComponent {...initialProps} input="one" />,
	mountPoint
);
render(
	<DummerComponent2 {...initialProps} input="two" />,
	mountPoint
);
