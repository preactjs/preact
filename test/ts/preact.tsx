import {
	createElement,
	render,
	Component,
	ComponentProps,
	FunctionalComponent,
	AnyComponent,
	h,
	createRef
} from '../../';

interface DummyProps {
	initialInput: string;
}

interface DummyState {
	input: string;
}

class DummyComponent extends Component<DummyProps, DummyState> {
	constructor(props: DummyProps) {
		super(props);
		this.state = {
			input: `x${this.props}x`
		};
	}

	private setRef = (el: AnyComponent<any>) => {
		console.log(el);
	};

	render({ initialInput }: DummyProps, { input }: DummyState) {
		return (
			<div>
				<DummerComponent initialInput={initialInput} input={input} />
				{/* Can specify all Preact attributes on a typed FunctionalComponent */}
				<ComponentWithChildren
					initialInput={initialInput}
					input={input}
					key="1"
					ref={this.setRef}
				/>
			</div>
		);
	}
}

interface DummerComponentProps extends DummyProps, DummyState {}

function DummerComponent({ input, initialInput }: DummerComponentProps) {
	return (
		<div>
			Input: {input}, initial: {initialInput}
		</div>
	);
}

render(createElement('div', { title: 'test', key: '1' }), document);
render(
	createElement(DummyComponent, { initialInput: 'The input', key: '1' }),
	document
);
render(
	createElement(DummerComponent, {
		initialInput: 'The input',
		input: 'New input',
		key: '1'
	}),
	document
);
render(h('div', { title: 'test', key: '1' }), document);
render(h(DummyComponent, { initialInput: 'The input', key: '1' }), document);
render(
	h(DummerComponent, {
		initialInput: 'The input',
		input: 'New input',
		key: '1'
	}),
	document
);

// Mounting into different types of Nodes
render(h('div', {}), document.createElement('div'));
render(h('div', {}), document);
render(h('div', {}), document.createElement('div').shadowRoot!);
render(h('div', {}), document.createDocumentFragment());

// From https://gist.github.com/developit/f4c67a2ede71dc2fab7f357f39cff28c, modified to be TypeScript compliant
function createRootFragment(parent: Element, replaceNode: Element | Element[]) {
	const replaceNodes: Element[] = ([] as Element[]).concat(replaceNode);
	const s = replaceNodes[replaceNodes.length - 1].nextSibling;
	function insert(c: Node, r: Node | null) {
		return parent.insertBefore(c, r || s);
	}
	return ((parent as any).__k = {
		nodeType: 1,
		parentNode: parent,
		firstChild: replaceNodes[0],
		childNodes: replaceNodes,
		insertBefore: insert,
		appendChild: (c: Node) => insert(c, null),
		removeChild: function (c: Node) {
			return parent.removeChild(c);
		}
	});
}

render(
	h('div', {}),
	createRootFragment(
		document.createElement('div'),
		document.createElement('div')
	)
);

// Accessing children
const ComponentWithChildren: FunctionalComponent<DummerComponentProps> = ({
	input,
	initialInput,
	children
}) => {
	return (
		<div>
			<span>{initialInput}</span>
			<span>{input}</span>
			<span>{children}</span>
		</div>
	);
};

const UseOfComponentWithChildren = () => {
	return (
		<ComponentWithChildren initialInput="initial" input="input">
			<span>child 1</span>
			<span>child 2</span>
		</ComponentWithChildren>
	);
};

// TODO: make this work
// const DummyChildren: FunctionalComponent = ({ children }) => {
// 	return children;
// };

// function ReturnChildren(props: { children: preact.ComponentChildren }) {
// 	return props.children;
// }

// function TestUndefinedChildren() {
// 	return (
// 		<ReturnChildren>
// 			<ReturnChildren>Hello</ReturnChildren>
// 		</ReturnChildren>
// 	);
// }

// using ref and or jsx
class ComponentUsingRef extends Component<any, any> {
	private array: string[];
	private refs: (Element | null)[] = [];

	constructor() {
		super();
		this.array = ['1', '2'];
	}

	render() {
		this.refs = [];
		return (
			<div jsx>
				{this.array.map(el => (
					<span ref={this.setRef}>{el}</span>
				))}

				{/* Can specify Preact attributes on a component */}
				<DummyComponent initialInput="1" key="1" ref={this.setRef} />
			</div>
		);
	}

	private setRef = (el: Element | null) => {
		this.refs.push(el);
	};
}

// using lifecycles
class ComponentWithLifecycle extends Component<DummyProps, DummyState> {
	render() {
		return <div>Hi</div>;
	}

	componentWillMount() {
		console.log('componentWillMount');
	}

	componentDidMount() {
		console.log('componentDidMount');
	}

	componentWillUnmount() {
		console.log('componentWillUnmount');
	}

	componentWillReceiveProps(nextProps: DummyProps, nextCtx: any) {
		const { initialInput } = nextProps;
		console.log('componentWillReceiveProps', initialInput, nextCtx);
	}

	shouldComponentUpdate(
		nextProps: DummyProps,
		nextState: DummyState,
		nextContext: any
	) {
		return false;
	}

	componentWillUpdate(
		nextProps: DummyProps,
		nextState: DummyState,
		nextContext: any
	) {
		console.log('componentWillUpdate', nextProps, nextState, nextContext);
	}

	componentDidUpdate(
		previousProps: DummyProps,
		previousState: DummyState,
		previousContext: any
	) {
		console.log(
			'componentDidUpdate',
			previousProps,
			previousState,
			previousContext
		);
	}
}

// Default props: JSX.LibraryManagedAttributes

class DefaultProps extends Component<{ text: string; bool: boolean }> {
	static defaultProps = {
		text: 'hello'
	};

	render() {
		return <div>{this.props.text}</div>;
	}
}

const d1 = <DefaultProps bool={false} text="foo" />;
const d2 = <DefaultProps bool={false} />;

class DefaultPropsWithUnion extends Component<
	{ default: boolean } & (
		| {
				type: 'string';
				str: string;
		  }
		| {
				type: 'number';
				num: number;
		  }
	)
> {
	static defaultProps = {
		default: true
	};

	render() {
		return <div />;
	}
}

const d3 = <DefaultPropsWithUnion type="string" str={'foo'} />;
const d4 = <DefaultPropsWithUnion type="number" num={0xf00} />;
const d5 = <DefaultPropsWithUnion type="string" str={'foo'} default={false} />;
const d6 = <DefaultPropsWithUnion type="number" num={0xf00} default={false} />;

class DefaultUnion extends Component<
	| {
			type: 'number';
			num: number;
	  }
	| {
			type: 'string';
			str: string;
	  }
> {
	static defaultProps = {
		type: 'number',
		num: 1
	};

	render() {
		return <div />;
	}
}

const d7 = <DefaultUnion />;
const d8 = <DefaultUnion num={1} />;
const d9 = <DefaultUnion type="number" />;
const d10 = <DefaultUnion type="string" str="foo" />;

class ComponentWithDefaultProps extends Component<{ value: string }> {
	static defaultProps = { value: '' };
	render() {
		return <div>{this.props.value}</div>;
	}
}

const withDefaultProps = <ComponentWithDefaultProps />;

interface PartialState {
	foo: string;
	bar: number;
}

class ComponentWithPartialSetState extends Component<{}, PartialState> {
	render({}, { foo, bar }: PartialState) {
		return (
			<button onClick={() => this.handleClick('foo')}>
				{foo}-{bar}
			</button>
		);
	}
	handleClick = (value: keyof PartialState) => {
		this.setState({ [value]: 'updated' });
	};
}

const withPartialSetState = <ComponentWithPartialSetState />;

let functionalProps: ComponentProps<typeof DummerComponent> = {
	initialInput: '',
	input: ''
};

let classProps: ComponentProps<typeof DummyComponent> = {
	initialInput: ''
};

let elementProps: ComponentProps<'button'> = {
	type: 'button'
};

// Typing of style property
const acceptsNumberAsLength = <div style={{ marginTop: 20 }} />;
const acceptsStringAsLength = <div style={{ marginTop: '20px' }} />;

const ReturnNull: FunctionalComponent = () => null;

// Refs should work on elements
const ref = createRef<HTMLDivElement>();
createElement('div', { ref: ref }, 'hi');
h('div', { ref: ref }, 'hi');

// Refs should work on functions
const functionRef = createRef();
const RefComponentTest = () => <p>hi</p>;
createElement(RefComponentTest, { ref: functionRef }, 'hi');
h(RefComponentTest, { ref: functionRef }, 'hi');

// Should accept onInput
const onInput = (e: h.JSX.TargetedEvent<HTMLInputElement>) => {};
<input onInput={onInput} />;
createElement('input', { onInput: onInput });
h('input', { onInput: onInput });
