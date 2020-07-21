import { createElement, isValidElement, Component } from 'preact';
import { isValidElementTests } from '../shared/isValidElementTests';

isValidElementTests(expect, isValidElement, createElement, Component);
