import { createElement, isValidElement, Component } from 'preact';
import { isValidElementTests } from '../shared/isValidElementTests';
import { expect } from 'chai';

isValidElementTests(expect, isValidElement, createElement, Component);
