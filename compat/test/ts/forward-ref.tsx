import React from '../../src';

const MyInput: React.ForwardRefRenderFunction<
	{ focus(): void },
	{ id: string }
> = (props, ref) => {
	const inputRef = React.useRef<HTMLInputElement>(null);

	React.useImperativeHandle(ref, () => ({
		focus: () => {
			if (inputRef.current) {
				inputRef.current.focus();
			}
		}
	}));

	return <input {...props} ref={inputRef} />;
};

export const foo = React.forwardRef(MyInput);

export const Bar = React.forwardRef<HTMLDivElement, { children: any }>(
	(props, ref) => {
		return <div ref={ref}>{props.children}</div>;
	}
);

export const baz = (
	ref: React.ForwardedRef<HTMLElement>
): React.Ref<HTMLElement> => ref;
