import { createElement, isValidElement, Component } from 'preact';
import { isValidElementTests } from '../shared/isValidElementTests';
import { expect } from '@open-wc/testing';

isValidElementTests(expect, isValidElement, createElement, Component);
