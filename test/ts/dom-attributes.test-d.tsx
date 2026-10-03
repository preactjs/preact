import {
	createElement,
	Fragment,
	SignalLike,
	UnpackSignal,
	AriaAttributes,
	AccessibleAnchorHTMLAttributes,
	AccessibleAreaHTMLAttributes,
	AccessibleImgHTMLAttributes,
	AccessibleInputHTMLAttributes,
	AccessibleSelectHTMLAttributes,
	AnchorHTMLAttributes,
	AreaHTMLAttributes,
	ComponentChildren,
	ComponentProps,
	HTMLInputTypeAttribute,
	ImgHTMLAttributes,
	InputHTMLAttributes,
	SelectHTMLAttributes
} from 'preact';

function createSignal<T>(value: T): SignalLike<T> {
	return {
		value,
		peek() {
			return value;
		},
		subscribe() {
			return () => {};
		}
	};
}

// @ts-expect-error A button should not have a role of presentation
const badAriaRole = <button role="presentation" />;
const validAriaRole = <button role="slider" />;
const signalBadAriaRole = (
	// @ts-expect-error A button should not have a role of presentation
	<button role={createSignal('presentation' as const)} />
);
const signalValidAriaRole = <button role={createSignal('slider' as const)} />;

// @ts-expect-error A map should never have any role set
const invalidAriaRole = <map role="presentation" />;
const signalInvalidAriaRole = (
	// @ts-expect-error A map should never have any role set
	<button role={createSignal('presentation' as const)} />
);
const validMissingAriaRole = <base href=""></base>;
const signalValidMissingAriaRole = (
	// @ts-expect-error A map should never have any role set
	<button role={createSignal('presentation' as const)} />
);

// More complex role tests w/ unions, the role pairing lives on the opt-in
// `Accessible*HTMLAttributes` types

const aWithHrefValid: AccessibleAnchorHTMLAttributes = {
	href: 'foo',
	role: 'button'
};
// @ts-expect-error An anchor with an href should not have a role of slider
const aWithHrefInvalid: AccessibleAnchorHTMLAttributes = {
	href: 'foo',
	role: 'slider'
};

const aWithoutHrefValid: AccessibleAnchorHTMLAttributes = { role: 'button' };

const areaWithHrefValid: AccessibleAreaHTMLAttributes = {
	href: 'foo',
	role: 'link'
};
// @ts-expect-error An area with an href should not have a role of button
const areaWithHrefInvalid: AccessibleAreaHTMLAttributes = {
	href: 'foo',
	role: 'button'
};

const areaWithoutHrefValid: AccessibleAreaHTMLAttributes = { role: 'button' };
// @ts-expect-error An area with an href should not have a role of button
const areaWithoutHrefInvalid: AccessibleAreaHTMLAttributes = { role: 'slider' };

const imgWithAccessibleNameAriaLabelValid: AccessibleImgHTMLAttributes = {
	'aria-label': 'foo',
	role: 'button'
};
const imgWithAccessibleNameAriaLabelledByValid: AccessibleImgHTMLAttributes = {
	'aria-labelledby': 'foo',
	role: 'button'
};
const imgWithAccessibleNameAltValid: AccessibleImgHTMLAttributes = {
	alt: 'foo',
	role: 'button'
};
const imgWithAccessibleNameTitleValid: AccessibleImgHTMLAttributes = {
	title: 'foo',
	role: 'button'
};
// @ts-expect-error An img with an accessible name should not have a role of presentation
const imgWithAccessibleNameAriaLabelInvalid: AccessibleImgHTMLAttributes = {
	'aria-label': 'foo',
	role: 'presentation'
};
// @ts-expect-error An img with an accessible name should not have a role of presentation
const imgWithAccessibleNameAriaLabelledByInvalid: AccessibleImgHTMLAttributes =
	{ 'aria-labelledby': 'foo', role: 'presentation' };
// @ts-expect-error An img with an accessible name should not have a role of presentation
const imgWithAccessibleNameAltInvalid: AccessibleImgHTMLAttributes = {
	alt: 'foo',
	role: 'presentation'
};
// @ts-expect-error An img with an accessible name should not have a role of presentation
const imgWithAccessibleNameValid: AccessibleImgHTMLAttributes = {
	title: 'foo',
	role: 'presentation'
};

const imgWithoutAccessibleNameValid: AccessibleImgHTMLAttributes = {
	role: 'presentation'
};
// @ts-expect-error An img without an accessible name should not have a role of button
const imgWithoutAccessibleNameInvalid: AccessibleImgHTMLAttributes = {
	role: 'button'
};

const inputTypeButtonValid: AccessibleInputHTMLAttributes = {
	type: 'button',
	role: 'checkbox'
};
const inputTypeButtonInvalid: AccessibleInputHTMLAttributes = {
	type: 'button',
	// @ts-expect-error An input of type button should not have a role of presentation
	role: 'presentation'
};

const inputTypeCheckboxValid: AccessibleInputHTMLAttributes = {
	type: 'checkbox',
	role: 'menuitemcheckbox'
};
const inputTypeCheckboxInvalid: AccessibleInputHTMLAttributes = {
	type: 'checkbox',
	// @ts-expect-error An input of type checkbox should not have a role of presentation
	role: 'presentation'
};

const inputTypeColorValid: AccessibleInputHTMLAttributes = { type: 'color' };
// @ts-expect-error An input of type color should not have a role
const inputTypeColorInvalid: AccessibleInputHTMLAttributes = {
	type: 'color',
	role: 'button'
};

const inputTypeDateValid: AccessibleInputHTMLAttributes = { type: 'date' };
// @ts-expect-error An input of type date should not have a role
const inputTypeDateInvalid: AccessibleInputHTMLAttributes = {
	type: 'date',
	role: 'button'
};

const inputTypeDatetimeLocalValid: AccessibleInputHTMLAttributes = {
	type: 'datetime-local'
};
// @ts-expect-error An input of type datetime-local should not have a role
const inputTypeDatetimeLocalInvalid: AccessibleInputHTMLAttributes = {
	type: 'datetime-local',
	role: 'button'
};

const inputTypeEmailValid: AccessibleInputHTMLAttributes = {
	type: 'email',
	role: 'textbox'
};
// @ts-expect-error An input of type email, without a list attribute, should not have a role of button
const inputTypeEmailInvalid: AccessibleInputHTMLAttributes = {
	type: 'email',
	role: 'button'
};

const inputTypeFileValid: AccessibleInputHTMLAttributes = { type: 'file' };
// @ts-expect-error An input of type file should not have a role
const inputTypeFileInvalid: AccessibleInputHTMLAttributes = {
	type: 'file',
	role: 'button'
};

const inputTypeHiddenValid: AccessibleInputHTMLAttributes = { type: 'hidden' };
// @ts-expect-error An input of type hidden should not have a role
const inputTypeHiddenInvalid: AccessibleInputHTMLAttributes = {
	type: 'hidden',
	role: 'button'
};

const inputTypeImageValid: AccessibleInputHTMLAttributes = {
	type: 'image',
	role: 'button'
};
const inputTypeImageInvalid: AccessibleInputHTMLAttributes = {
	type: 'image',
	// @ts-expect-error An input of type image should not have a role of presentation
	role: 'presentation'
};

const inputTypeMonthValid: AccessibleInputHTMLAttributes = { type: 'month' };
// @ts-expect-error An input of type month should not have a role
const inputTypeMonthInvalid: AccessibleInputHTMLAttributes = {
	type: 'month',
	role: 'button'
};

const inputTypeNumberValid: AccessibleInputHTMLAttributes = {
	type: 'number',
	role: 'spinbutton'
};
// @ts-expect-error An input of type number should not have a role of button
const inputTypeNumberInvalid: AccessibleInputHTMLAttributes = {
	type: 'number',
	role: 'button'
};

const inputTypePasswordValid: AccessibleInputHTMLAttributes = {
	type: 'password'
};
// @ts-expect-error An input of type password should not have a role
const inputTypePasswordInvalid: AccessibleInputHTMLAttributes = {
	type: 'password',
	role: 'button'
};

const inputTypeRadioValid: AccessibleInputHTMLAttributes = {
	type: 'radio',
	role: 'menuitemradio'
};
// @ts-expect-error An input of type radio should not have a role of button
const inputTypeRadioInvalid: AccessibleInputHTMLAttributes = {
	type: 'radio',
	role: 'button'
};

const inputTypeRangeValid: AccessibleInputHTMLAttributes = {
	type: 'range',
	role: 'slider'
};
// @ts-expect-error An input of type range should not have a role of button
const inputTypeRangeInvalid: AccessibleInputHTMLAttributes = {
	type: 'range',
	role: 'button'
};

const inputTypeResetValid: AccessibleInputHTMLAttributes = {
	type: 'reset',
	role: 'slider'
};
const inputTypeResetInvalid: AccessibleInputHTMLAttributes = {
	type: 'reset',
	// @ts-expect-error An input of type reset should not have a role of presentation
	role: 'presentation'
};

const inputTypeSearchValid: AccessibleInputHTMLAttributes = {
	type: 'search',
	role: 'searchbox'
};
// @ts-expect-error An input of type search should not have a role of button
const inputTypeSearchInvalid: AccessibleInputHTMLAttributes = {
	type: 'search',
	role: 'button'
};

const inputTypeSubmitValid: AccessibleInputHTMLAttributes = {
	type: 'submit',
	role: 'button'
};
const inputTypeSubmitInvalid: AccessibleInputHTMLAttributes = {
	type: 'submit',
	// @ts-expect-error An input of type submit should not have a role of presentation
	role: 'presentation'
};

const inputTypeTelValid: AccessibleInputHTMLAttributes = {
	type: 'tel',
	role: 'textbox'
};
const inputTypeTelInvalid: AccessibleInputHTMLAttributes = {
	type: 'tel',
	// @ts-expect-error An input of type tel should not have a role of presentation
	role: 'presentation'
};

const inputTypeTextValid: AccessibleInputHTMLAttributes = {
	type: 'text',
	role: 'combobox'
};
const inputTypeTextInvalid: AccessibleInputHTMLAttributes = {
	type: 'text',
	// @ts-expect-error An input of type text should not have a role of presentation
	role: 'presentation'
};

const inputTypeOmittedValid: AccessibleInputHTMLAttributes = {
	role: 'combobox'
};
const inputTypeOmittedInvalid: AccessibleInputHTMLAttributes = {
	// @ts-expect-error An input of type text should not have a role of presentation
	role: 'presentation'
};

const inputTypeEmailListValid: AccessibleInputHTMLAttributes = {
	type: 'email',
	list: 'foo',
	role: 'combobox'
};
// @ts-expect-error An input of type email, with a list attribute, should not have a role of button
const inputTypeEmailListInvalid: AccessibleInputHTMLAttributes = {
	type: 'email',
	role: 'button'
};

const inputTypeSearchListValid: AccessibleInputHTMLAttributes = {
	type: 'search',
	list: 'foo',
	role: 'combobox'
};
// @ts-expect-error An input of type search, with a list attribute, should not have a role of button
const inputTypeSearchListInvalid: AccessibleInputHTMLAttributes = {
	type: 'search',
	role: 'button'
};

const inputTypeTelListValid: AccessibleInputHTMLAttributes = {
	type: 'tel',
	list: 'foo',
	role: 'combobox'
};
// @ts-expect-error An input of type tel, with a list attribute, should not have a role of button
const inputTypeTelListInvalid: AccessibleInputHTMLAttributes = {
	type: 'tel',
	role: 'button'
};

const inputTypeTextListValid: AccessibleInputHTMLAttributes = {
	type: 'text',
	list: 'foo',
	role: 'combobox'
};
// @ts-expect-error An input of type text, with a list attribute, should not have a role of button
const inputTypeTextListInvalid: AccessibleInputHTMLAttributes = {
	type: 'text',
	role: 'button'
};

const inputTypeOmittedListValid: AccessibleInputHTMLAttributes = {
	type: 'text',
	list: 'foo',
	role: 'combobox'
};
// @ts-expect-error An input of type text, with a list attribute, should not have a role of button
const inputTypeOmittedListInvalid: AccessibleInputHTMLAttributes = {
	type: 'text',
	role: 'button'
};

const inputTypeUrlListValid: AccessibleInputHTMLAttributes = {
	type: 'url',
	list: 'foo',
	role: 'combobox'
};
// @ts-expect-error An input of type url, with a list attribute, should not have a role of button
const inputTypeUrlListInvalid: AccessibleInputHTMLAttributes = {
	type: 'url',
	role: 'button'
};

const inputTypeTimeValid: AccessibleInputHTMLAttributes = { type: 'time' };
// @ts-expect-error An input of type time should not have a role
const inputTypeTimeInvalid: AccessibleInputHTMLAttributes = {
	type: 'time',
	role: 'button'
};

const inputTypeUrlValid: AccessibleInputHTMLAttributes = {
	type: 'url',
	role: 'textbox'
};
// @ts-expect-error An input of type url should not have a role of button
const inputTypeUrlInvalid: AccessibleInputHTMLAttributes = {
	type: 'url',
	role: 'button'
};

const inputTypeWeekValid: AccessibleInputHTMLAttributes = { type: 'week' };
// @ts-expect-error An input of type week should not have a role
const inputTypeWeekInvalid: AccessibleInputHTMLAttributes = {
	type: 'week',
	role: 'button'
};

const selectValid: AccessibleSelectHTMLAttributes = { role: 'menu' };
// @ts-expect-error A select should not have a role of button
const selectInvalid: AccessibleSelectHTMLAttributes = { role: 'button' };

const selectMultipleValid: AccessibleSelectHTMLAttributes = {
	multiple: true,
	role: 'listbox'
};
// @ts-expect-error A select multiple should not have a role of menu
const selectMultipleInvalid: AccessibleSelectHTMLAttributes = {
	multiple: true,
	role: 'menu'
};

const selectSizeValid: AccessibleSelectHTMLAttributes = {
	size: 5,
	role: 'listbox'
};
// @ts-expect-error A select with a size other than `0` or `1` should not have a role of menu
const selectSizeInvalid: AccessibleSelectHTMLAttributes = {
	size: 5,
	role: 'menu'
};

// Intrinsic elements still restrict the role per element
// @ts-expect-error An area should not have a role of slider
const areaInvalidRole = <area role="slider" />;
// @ts-expect-error An input should not have a role of presentation
const inputInvalidRole = <input type="text" role="presentation" />;
// @ts-expect-error A select should not have a role of button
const selectInvalidRole = <select role="button" />;

// Wrappers spreading the element's attribute interface
function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
	return <a {...props} />;
}
function MapArea(props: AreaHTMLAttributes<HTMLAreaElement>) {
	return <area {...props} />;
}
function Picture(props: ImgHTMLAttributes<HTMLImageElement>) {
	return <img {...props} />;
}
function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
	return <input {...props} />;
}
function Dropdown(props: SelectHTMLAttributes<HTMLSelectElement>) {
	return <select {...props} />;
}
function SizedInput({
	size,
	...rest
}: Omit<ComponentProps<'input'>, 'size'> & { size?: 'sm' | 'lg' }) {
	return <input {...rest} data-size={size} />;
}

// Non-literal input types
declare const showPassword: boolean;
declare const numberOrDate: 'number' | 'date';
declare const inputType: HTMLInputTypeAttribute;
const passwordToggle = <input type={showPassword ? 'text' : 'password'} />;
const unionInputType = <input type={numberOrDate} />;
const attributeInputType = <input type={inputType} />;
const signalInputType = (
	<input type={createSignal<'text' | 'password'>('password')} />
);

// Polymorphic components rendering these elements. With the Accessible*
// unions mapped in, this took ~60 s and 4+ GB to check before failing (TS2589).
function Polymorphic({
	as,
	children,
	...rest
}: {
	as?: 'a' | 'area' | 'img' | 'input' | 'select' | 'div';
	children?: ComponentChildren;
	class?: string;
}) {
	const Tag = as ?? 'div';
	return <Tag {...rest}>{children}</Tag>;
}
const polymorphic = (
	<Polymorphic as="a" class="foo">
		bar
	</Polymorphic>
);

// @ts-expect-error We should correctly type aria attributes like autocomplete
const badAriaValues = <div aria-autocomplete="bad-value" />;
const validAriaValues = <div aria-autocomplete="none" />;
const undefAriaValues = <div aria-autocomplete={undefined} />;
const noAriaValues = <div />;

const signalBadAriaValues = (
	// @ts-expect-error We should correctly type aria attributes like autocomplete
	<div aria-autocomplete={createSignal('bad-value' as const)} />
);
const signalValidAriaValues = (
	<div aria-autocomplete={createSignal('none' as 'none' | undefined)} />
);
const signalValidAriaValues2 = (
	<div
		aria-autocomplete={createSignal(
			'none' as UnpackSignal<AriaAttributes['aria-autocomplete']>
		)}
	/>
);

const validRole = <div role="button" />;
// @ts-expect-error We should correctly type aria roles
const invalidRole = <div role="invalid-role" />;
// @ts-expect-error We should disallow `generic` as it should not ever be explicitly set
const invalidRole2 = <div role="generic" />;
const fallbackRole = <div role="none presentation" />;

const booleanishTest = (
	<>
		<div aria-haspopup={true} />
		<div aria-haspopup={false} />
		<div aria-haspopup={'true'} />
		<div aria-haspopup={'false'} />
		<div aria-haspopup={'dialog'} />
	</>
);

const dangerouslySetInnerHTML = (
	<>
		<div dangerouslySetInnerHTML={{ __html: 'string' }} />
	</>
);
