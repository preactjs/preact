import * as React from '../../';

export interface LazyProps {
	isProp: boolean;
}

interface LazyState {
	forState: string;
}
export default class IsLazyComponent extends React.Component<
	LazyProps,
	LazyState
> {
	render({ isProp }: LazyProps) {
		return <div>{isProp ? 'Super Lazy TRUE' : 'Super Lazy FALSE'}</div>;
	}
}
