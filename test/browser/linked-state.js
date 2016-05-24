import { Component } from '../../src/preact';
import { createLinkedState } from '../../src/linked-state';

describe('linked-state', () => {
	class TestComponent extends Component {	}
	let testComponent, linkFunction;

	before( () => {
		testComponent = new TestComponent();
		sinon.spy(TestComponent.prototype, 'setState');
	});

	describe('createLinkedState without eventPath argument', () => {

		before( () => {
			linkFunction = createLinkedState(testComponent,'testStateKey');
			expect(linkFunction).to.be.a('function');
		});

		beforeEach( () => {
			TestComponent.prototype['setState'].reset();
		});

		it('should use value attribute on text input when no eventPath is supplied', () => {
			let element = document.createElement('input');
			element.type= 'text';
			element.value = 'newValue';

			linkFunction({ currentTarget: element });

			expect(TestComponent.prototype.setState).to.have.been.calledOnce;
			expect(TestComponent.prototype.setState).to.have.been.calledWith({'testStateKey': 'newValue'});

			linkFunction.call(element);

			expect(TestComponent.prototype.setState).to.have.been.calledTwice;
			expect(TestComponent.prototype.setState.secondCall).to.have.been.calledWith({'testStateKey': 'newValue'});
		});

		it('should use checked attribute on checkbox input when no eventPath is supplied', () => {
			let checkboxElement = document.createElement('input');
			checkboxElement.type= 'checkbox';
			checkboxElement.checked = true;

			linkFunction({ currentTarget: checkboxElement });

			expect(TestComponent.prototype.setState).to.have.been.calledOnce;
			expect(TestComponent.prototype.setState).to.have.been.calledWith({'testStateKey': true});
		});

		it('should use checked attribute on radio input when no eventPath is supplied', () => {
			let radioElement = document.createElement('input');
			radioElement.type= 'radio';
			radioElement.checked = true;

			linkFunction({ currentTarget: radioElement });

			expect(TestComponent.prototype.setState).to.have.been.calledOnce;
			expect(TestComponent.prototype.setState).to.have.been.calledWith({'testStateKey': true});
		});


		it('should set dot notated state key appropriately', () => {
			linkFunction = createLinkedState(testComponent,'nested.state.key');
			let element = document.createElement('input');
			element.type= 'text';
			element.value = 'newValue';

			linkFunction({ currentTarget: element });

			expect(TestComponent.prototype.setState).to.have.been.calledOnce;
			expect(TestComponent.prototype.setState).to.have.been.calledWith({nested: {state: {key: 'newValue'}}});
		});

	});

	describe('createLinkedState with eventPath argument', () => {

		before( () => {
			linkFunction = createLinkedState(testComponent,'testStateKey', 'nested.path');
			expect(linkFunction).to.be.a('function');
		});

		beforeEach( () => {
			TestComponent.prototype['setState'].reset();
		});

		it('should give precedence to nested.path on event over nested.path on component', () => {
			let event = {nested: {path: 'nestedPathValueFromEvent'}};
			let component = {_component: {nested: {path: 'nestedPathValueFromComponent'}}};

			linkFunction.call(component, event);

			expect(TestComponent.prototype.setState).to.have.been.calledOnce;
			expect(TestComponent.prototype.setState).to.have.been.calledWith({'testStateKey': 'nestedPathValueFromEvent'});
		});

		it('should use nested.path when supplied on component and nested.path not in event', () => {
			let event = {};
			let component = {_component: {nested: {path: 'nestedPathValueFromComponent'}}};

			linkFunction.call(component, event);
			expect(TestComponent.prototype.setState).to.have.been.calledOnce;
			expect(TestComponent.prototype.setState).to.have.been.calledWith({'testStateKey': 'nestedPathValueFromComponent'});
		});

		it('should call the function with the calling element as "this" if value is a function', () => {
			let element = document.createElement('input');
			element.type= 'text';
			element.anAttribute = 'functionValue';
			let testFunction = function() { return this.anAttribute; };

			linkFunction({ currentTarget:element, nested: {path: testFunction}});

			expect(TestComponent.prototype.setState).to.have.been.calledOnce;
			expect(TestComponent.prototype.setState).to.have.been.calledWith({'testStateKey': 'functionValue'});
		});

	});
});
