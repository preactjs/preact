import 'mocha';
import { expect } from 'chai';
import { createElement, Component, RenderableProps, Fragment } from '../../';

export class ContextComponent extends Component<{ foo: string }> {
	getChildContext() {
		return { something: 2 };
	}

	render() {
		return null;
	}
}

export interface SimpleComponentProps {
	initialName: string | null;
}

export interface SimpleState {
	name: string | null;
}

export class SimpleComponent extends Component<
	SimpleComponentProps,
	SimpleState
> {
	constructor(props: SimpleComponentProps) {
		super(props);
		this.state = {
			name: props.initialName
		};
	}

	render() {
		if (!this.state.name) {
			return null;
		}
		const { initialName, children } = this.props;
		return (
			<div>
				<span>
					{initialName} / {this.state.name}
				</span>
				{children}
			</div>
		);
	}
}

class DestructuringRenderPropsComponent extends Component<
	SimpleComponentProps,
	SimpleState
> {
	constructor(props: SimpleComponentProps) {
		super(props);
		this.state = {
			name: props.initialName
		};
	}

	render({ initialName, children }: RenderableProps<SimpleComponentProps>) {
		if (!this.state.name) {
			return null;
		}
		return (
			<span>
				{this.props.initialName} / {this.state.name}
			</span>
		);
	}
}

interface RandomChildrenComponentProps {
	num?: number;
	val?: string;
	span?: boolean;
}

class RandomChildrenComponent extends Component<RandomChildrenComponentProps> {
	render() {
		const { num, val, span } = this.props;
		if (num) {
			return num;
		}
		if (val) {
			return val;
		}
		if (span) {
			return <span>hi</span>;
		}
		return null;
	}
}

class StaticComponent extends Component<SimpleComponentProps, SimpleState> {
	static getDerivedStateFromProps(
		props: SimpleComponentProps,
		state: SimpleState
	): Partial<SimpleState> {
		return {
			...props,
			...state
		};
	}

	static getDerivedStateFromError(err: Error) {
		return {
			name: err.message
		};
	}

	render() {
		return null;
	}
}

function MapperItem(props: { foo: number }) {
	return <div />;
}

function Mapper() {
	return [1, 2, 3].map(x => <MapperItem foo={x} key={x} />);
}

describe('Component', () => {
	const component = new SimpleComponent({ initialName: 'da name' });

	it('has state', () => {
		expect(component.state.name).to.eq('da name');
	});

	it('has props', () => {
		expect(component.props.initialName).to.eq('da name');
	});

	it('has no base when not mounted', () => {
		expect(component.base).to.not.exist;
	});

	describe('setState', () => {
		// No need to execute these tests. because we only need to check if
		// the types are working. Executing them would require the DOM.
		// TODO: Run TS tests in our standard karma setup
		it.skip('can be used with an object', () => {
			component.setState({ name: 'another name' });
		});

		it.skip('can be used with a function', () => {
			const updater = (state: any, props: any) => ({
				name: `${state.name} - ${props.initialName}`
			});
			component.setState(updater);
		});
	});

	describe('render', () => {
		it('can return null', () => {
			const comp = new SimpleComponent({ initialName: null });
			const actual = comp.render();

			expect(actual).to.eq(null);
		});
	});

	describe('Fragment', () => {
		it('should render nested Fragments', () => {
			var vnode = (
				<Fragment>
					<Fragment>foo</Fragment>
					bar
				</Fragment>
			);

			expect(vnode.type).to.be.equal(Fragment);
		});
	});
});
