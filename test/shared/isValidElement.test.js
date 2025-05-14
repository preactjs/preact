import { createElement, isValidElement, Component } from '../../src/index';
import { expect } from 'chai';
import { isValidElementTests } from './isValidElementTests';

isValidElementTests(expect, isValidElement, createElement, Component);
