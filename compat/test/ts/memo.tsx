import * as React from '../../src';
import { expectType } from './utils';

interface MemoProps {
	required: string;
	optional?: string;
	defaulted: string;
}

interface MemoPropsExceptDefaults {
	required: string;
	optional?: string;
}

const ComponentExceptDefaults = () => <div></div>;

const ReadonlyBaseComponent = (props: Readonly<MemoProps>) => (
	<div>{props.required + props.optional + props.defaulted}</div>
);
ReadonlyBaseComponent.defaultProps = { defaulted: '' };

const BaseComponent = (props: MemoProps) => (
	<div>{props.required + props.optional + props.defaulted}</div>
);
BaseComponent.defaultProps = { defaulted: '' };

// memo for readonly component with default comparison
const MemoedReadonlyComponent = React.memo(ReadonlyBaseComponent);
expectType<React.FunctionComponent<MemoProps>>(MemoedReadonlyComponent);
export const memoedReadonlyComponent = (
	<MemoedReadonlyComponent required="hi" />
);

// memo for non-readonly component with default comparison
const MemoedComponent = React.memo(BaseComponent);
expectType<React.FunctionComponent<MemoProps>>(MemoedComponent);
export const memoedComponent = <MemoedComponent required="hi" />;

// memo with custom comparison
const CustomMemoedComponent = React.memo(BaseComponent, (a, b) => {
	expectType<MemoProps>(a);
	expectType<MemoProps>(b);
	return a.required === b.required;
});
expectType<React.FunctionComponent<MemoProps>>(CustomMemoedComponent);
export const customMemoedComponent = <CustomMemoedComponent required="hi" />;

const MemoedComponentExceptDefaults = React.memo<MemoPropsExceptDefaults>(
	ComponentExceptDefaults
);
expectType<React.FunctionComponent<MemoPropsExceptDefaults>>(
	MemoedComponentExceptDefaults
);
export const memoedComponentExceptDefaults = (
	<MemoedComponentExceptDefaults required="hi" />
);
