import { ComponentChildren, FunctionComponent } from '../../src/index';

export interface ActivityProps {
	children: ComponentChildren;
	mode?: 'hidden' | 'visible';
	name?: string;
}

export const Activity: FunctionComponent<ActivityProps>;
