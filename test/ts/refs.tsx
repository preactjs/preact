import {
	createElement,
	Component,
	createRef,
	FunctionalComponent,
	Fragment,
	RefObject,
	RefCallback
} from '../../src';

/* @jsx createElement */

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
		console.log(div.tagName);
	};
	fooRef: RefCallback<Component> = foo => {
		console.log(foo.base);
	};
	barRef: RefCallback<Bar> = bar => {
		console.log(bar.base);
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
		console.log(this.divRef.current.tagName);
		console.log(this.fooRef.current.);
		console.log(this.barRef.current.base);
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
