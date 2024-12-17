import { createElement, Fragment, JSX } from 'preact';

function createSignal<T>(value: T): JSX.SignalLike<T> {
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
)
const signalValidAriaRole = (
	<button role={createSignal('slider' as const)} />
)

// @ts-expect-error A map should never have any role set
const invalidAriaRole = <map role="presentation" />;
const signalInvalidAriaRole = (
	// @ts-expect-error A map should never have any role set
	<button role={createSignal('presentation' as const)} />
)
const validMissingAriaRole = <base href=""></base>
const signalValidMissingAriaRole = (
	// @ts-expect-error A map should never have any role set
	<button role={createSignal('presentation' as const)} />
)

// More complex role tests w/ unions

const aWithHrefValid = <a href="foo" role="button"></a>;
// @ts-expect-error An anchor with an href should not have a role of slider
const aWithHrefInvalid = <a href="foo" role="slider"></a>;

const aWithoutHrefValid = <a role="button"></a>;


const areaWithHrefValid = <area href="foo" role="link"></area>;
// @ts-expect-error An area with an href should not have a role of button
const areaWithHrefInvalid = <area href="foo" role="button"></area>;

const areaWithoutHrefValid = <area role="button"></area>;
// @ts-expect-error An area with an href should not have a role of button
const areaWithoutHrefInvalid = <area role="slider"></area>;


const imgWithAccessibleNameAriaLabelValid = <img aria-label="foo" role="button" />;
const imgWithAccessibleNameAriaLabelledByValid = <img aria-labelledby="foo" role="button" />;
const imgWithAccessibleNameAltValid = <img alt="foo" role="button" />;
const imgWithAccessibleNameTitleValid = <img title="foo" role="button" />;
// @ts-expect-error An img with an accessible name should not have a role of presentation
const imgWithAccessibleNameAriaLabelInvalid = <img aria-label="foo" role="presentation" />;
// @ts-expect-error An img with an accessible name should not have a role of presentation
const imgWithAccessibleNameAriaLabelledByInvalid = <img aria-labelledby="foo" role="presentation" />;
// @ts-expect-error An img with an accessible name should not have a role of presentation
const imgWithAccessibleNameAltInvalid = <img alt="foo" role="presentation" />;
// @ts-expect-error An img with an accessible name should not have a role of presentation
const imgWithAccessibleNameValid = <img title="foo" role="presentation" />;

const imgWithoutAccessibleNameValid = <img role="presentation" />;
// @ts-expect-error An img without an accessible name should not have a role of button
const imgWithoutAccessibleNameInvalid = <img role="button" />;


const inputTypeButtonValid = <input type="button" role="checkbox" />;
// @ts-expect-error An input of type button should not have a role of presentation
const inputTypeButtonInvalid = <input type="button" role="presentation" />;

const inputTypeCheckboxValid = <input type="checkbox" role="menuitemcheckbox" />;
// @ts-expect-error An input of type checkbox should not have a role of presentation
const inputTypeCheckboxInvalid = <input type="checkbox" role="presentation" />;

const inputTypeColorValid = <input type="color" />;
// @ts-expect-error An input of type color should not have a role
const inputTypeColorInvalid = <input type="color" role="button" />;

const inputTypeDateValid = <input type="date" />;
// @ts-expect-error An input of type date should not have a role
const inputTypeDateInvalid = <input type="date" role="button" />;

const inputTypeDatetimeLocalValid = <input type="datetime-local" />;
// @ts-expect-error An input of type datetime-local should not have a role
const inputTypeDatetimeLocalInvalid = <input type="datetime-local" role="button" />;

const inputTypeEmailValid = <input type="email" role="textbox" />;
// @ts-expect-error An input of type email, without a list attribute, should not have a role of button
const inputTypeEmailInvalid = <input type="email" role="button" />;

const inputTypeFileValid = <input type="file" />;
// @ts-expect-error An input of type file should not have a role
const inputTypeFileInvalid = <input type="file" role="button" />;

const inputTypeHiddenValid = <input type="hidden" />;
// @ts-expect-error An input of type hidden should not have a role
const inputTypeHiddenInvalid = <input type="hidden" role="button" />;

const inputTypeImageValid = <input type="image" role="button" />;
// @ts-expect-error An input of type image should not have a role of presentation
const inputTypeImageInvalid = <input type="image" role="presentation" />;

const inputTypeMonthValid = <input type="month" />;
// @ts-expect-error An input of type month should not have a role
const inputTypeMonthInvalid = <input type="month" role="button" />;

const inputTypeNumberValid = <input type="number" role="spinbutton" />;
// @ts-expect-error An input of type number should not have a role of button
const inputTypeNumberInvalid = <input type="number" role="button" />;

const inputTypePasswordValid = <input type="password" />;
// @ts-expect-error An input of type password should not have a role
const inputTypePasswordInvalid = <input type="password" role="button" />;

const inputTypeRadioValid = <input type="radio" role="menuitemradio" />;
// @ts-expect-error An input of type radio should not have a role of button
const inputTypeRadioInvalid = <input type="radio" role="button" />;

const inputTypeRangeValid = <input type="range" role="slider" />;
// @ts-expect-error An input of type range should not have a role of button
const inputTypeRangeInvalid = <input type="range" role="button" />;

const inputTypeResetValid = <input type="reset" role="slider" />;
// @ts-expect-error An input of type reset should not have a role of presentation
const inputTypeResetInvalid = <input type="reset" role="presentation" />;

const inputTypeSearchValid = <input type="search" role="searchbox" />;
// @ts-expect-error An input of type search should not have a role of button
const inputTypeSearchInvalid = <input type="search" role="button" />;

const inputTypeSubmitValid = <input type="submit" role="button" />;
// @ts-expect-error An input of type submit should not have a role of presentation
const inputTypeSubmitInvalid = <input type="submit" role="presentation" />;

const inputTypeTelValid = <input type="tel" role="textbox" />;
// @ts-expect-error An input of type tel should not have a role of presentation
const inputTypeTelInvalid = <input type="tel" role="presentation" />;

const inputTypeTextValid = <input type="text" role="combobox" />;
// @ts-expect-error An input of type text should not have a role of presentation
const inputTypeTextInvalid = <input type="text" role="presentation" />;

const inputTypeOmittedValid = <input role="combobox" />;
// @ts-expect-error An input of type text should not have a role of presentation
const inputTypeOmittedInvalid = <input role="presentation" />;

const inputTypeEmailListValid = <input type="email" list="foo" role="combobox" />;
// @ts-expect-error An input of type email, with a list attribute, should not have a role of button
const inputTypeEmailListInvalid = <input type="email" role="button" />;

const inputTypeSearchListValid = <input type="search" list="foo" role="combobox" />;
// @ts-expect-error An input of type search, with a list attribute, should not have a role of button
const inputTypeSearchListInvalid = <input type="search" role="button" />;

const inputTypeTelListValid = <input type="tel" list="foo" role="combobox" />;
// @ts-expect-error An input of type tel, with a list attribute, should not have a role of button
const inputTypeTelListInvalid = <input type="tel" role="button" />;

const inputTypeTextListValid = <input type="text" list="foo" role="combobox" />;
// @ts-expect-error An input of type text, with a list attribute, should not have a role of button
const inputTypeTextListInvalid = <input type="text" role="button" />;

const inputTypeOmittedListValid = <input type="text" list="foo" role="combobox" />;
// @ts-expect-error An input of type text, with a list attribute, should not have a role of button
const inputTypeOmittedListInvalid = <input type="text" role="button" />;

const inputTypeUrlListValid = <input type="url" list="foo" role="combobox" />;
// @ts-expect-error An input of type url, with a list attribute, should not have a role of button
const inputTypeUrlListInvalid = <input type="url" role="button" />;

const inputTypeTimeValid = <input type="time" />;
// @ts-expect-error An input of type time should not have a role
const inputTypeTimeInvalid = <input type="time" role="button" />;

const inputTypeUrlValid = <input type="url" role="textbox" />;
// @ts-expect-error An input of type url should not have a role of button
const inputTypeUrlInvalid = <input type="url" role="button" />;

const inputTypeWeekValid = <input type="week" />;
// @ts-expect-error An input of type week should not have a role
const inputTypeWeekInvalid = <input type="week" role="button" />;

const selectValid = <select role="menu" />;
// @ts-expect-error A select should not have a role of button
const selectInvalid = <select role="button" />;

const selectMultipleValid = <select multiple={true} role="listbox" />;
// @ts-expect-error A select multiple should not have a role of button
const selectMultipleInvalid = <select multiple={true} role="button" />;



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
			'none' as JSX.UnpackSignal<JSX.AriaAttributes['aria-autocomplete']>
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
