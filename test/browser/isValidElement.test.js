import { createElement, isValidElement, Component } from 'preact';
import { isValidElementTests } from '../shared/isValidElementTests';
import { expect } from 'expectus';

isValidElementTests(expect, isValidElement, createElement, Component);
