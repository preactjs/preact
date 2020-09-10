import { createElement, isValidElement, Component } from '../../';
import { expect } from 'expectus';
import { isValidElementTests } from './isValidElementTests';

isValidElementTests(expect, isValidElement, createElement, Component);
