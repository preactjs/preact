import * as React from '../../src';

function ExpectType<T>(v: T) {} // type assertion helper

interface MemoProps {
	required: string;
	optional?: string;
	defaulted: string;
}

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
ExpectType<React.FunctionComponent<MemoProps>>(MemoedReadonlyComponent);
export const memoedReadonlyComponent = (
	<MemoedReadonlyComponent required="hi" />
);

// memo for non-readonly component with default comparison
const MemoedComponent = React.memo(BaseComponent);
ExpectType<React.FunctionComponent<MemoProps>>(MemoedComponent);
export const memoedComponent = <MemoedComponent required="hi" />;

// memo with custom comparison
const CustomMemoedComponent = React.memo(BaseComponent, (a, b) => {
	ExpectType<MemoProps>(a);
	ExpectType<MemoProps>(b);
	return a.required === b.required;
});
ExpectType<React.FunctionComponent<MemoProps>>(CustomMemoedComponent);
export const customMemoedComponent = <CustomMemoedComponent required="hi" />;
