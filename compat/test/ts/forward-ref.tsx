import React from '../../src';

const MyInput: React.ForwardFn<{ id: string }, { focus(): void }> = (props, ref) => {
  const inputRef = React.useRef<HTMLInputElement>()

  React.useImperativeHandle(ref, () => ({
    focus: () => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }))

  return <input {...props} ref={inputRef} />
}

export const foo = React.forwardRef(MyInput)

export const Bar = React.forwardRef<HTMLDivElement, { children: any }>((props, ref) => {
	return <div ref={ref}>{props.children}</div>
})
