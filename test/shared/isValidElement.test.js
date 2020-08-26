import { createElement, isValidElement, Component } from '../../';
import { expect } from '@open-wc/testing';
import { isValidElementTests } from './isValidElementTests';

isValidElementTests(expect, isValidElement, createElement, Component);
