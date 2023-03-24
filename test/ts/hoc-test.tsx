import { expect } from 'chai';
import {
	createElement,
	ComponentFactory,
	ComponentConstructor,
	Component
} from '../../';
import { SimpleComponent, SimpleComponentProps } from './Component-test';

export interface highlightedProps {
	isHighlighted: boolean;
}

export function highlighted<T>(
	Wrappable: ComponentFactory<T>
): ComponentConstructor<T & highlightedProps> {
	return class extends Component<T & highlightedProps> {
		constructor(props: T & highlightedProps) {
			super(props);
		}

		render() {
			let className = this.props.isHighlighted ? 'highlighted' : '';
			return (
				<div className={className}>
					<Wrappable {...this.props} />
				</div>
			);
		}

		toString() {
			return `Highlighted ${Wrappable.name}`;
		}
	};
}

const HighlightedSimpleComponent =
	highlighted<SimpleComponentProps>(SimpleComponent);

describe('hoc', () => {
	it('wraps the given component', () => {
		const highlight = new HighlightedSimpleComponent({
			initialName: 'initial name',
			isHighlighted: true
		});

		expect(highlight.toString()).to.eq('Highlighted SimpleComponent');
	});
});
