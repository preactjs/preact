import {
	createElement,
	Component,
} from "../../../src";

export interface LazyProps {
	isProp: boolean;
}

interface LazyState {
	forState: string;
}
export default class IsLazyComponent extends Component<LazyProps, LazyState> {
	render ({ isProp }: LazyProps) {
		return (
			<div>{
				isProp ?
				'Super Lazy TRUE' :
				'Super Lazy FALSE'
			}</div>
		)
	}
}
