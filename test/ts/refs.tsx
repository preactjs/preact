import {
	createElement,
	Component,
	createRef,
	FunctionalComponent,
	Fragment,
	RefObject,
	RefCallback
} from '../../';

// Test Fixtures
const Foo: FunctionalComponent = () => <span>Foo</span>;
class Bar extends Component {
	render() {
		return <span>Bar</span>;
	}
}

// Using Refs
class CallbackRef extends Component {
	divRef: RefCallback<HTMLDivElement> = div => {
		if (div !== null) {
			console.log(div.tagName);
		}
	};
	fooRef: RefCallback<Component> = foo => {
		if (foo !== null) {
			console.log(foo);
		}
	};
	barRef: RefCallback<Bar> = bar => {
		if (bar !== null) {
			console.log(bar);
		}
	};

	render() {
		return (
			<Fragment>
				<div ref={this.divRef} />
				<Foo ref={this.fooRef} />
				<Bar ref={this.barRef} />
			</Fragment>
		);
	}
}

class CreateRefComponent extends Component {
	private divRef: RefObject<HTMLDivElement> = createRef();
	private fooRef: RefObject<Component> = createRef();
	private barRef: RefObject<Bar> = createRef();

	componentDidMount() {
		if (this.divRef.current != null) {
			console.log(this.divRef.current.tagName);
		}

		if (this.fooRef.current != null) {
			console.log(this.fooRef.current);
		}

		if (this.barRef.current != null) {
			console.log(this.barRef.current);
		}
	}

	render() {
		return (
			<Fragment>
				<div ref={this.divRef} />
				<Foo ref={this.fooRef} />
				<Bar ref={this.barRef} />
			</Fragment>
		);
	}
}
