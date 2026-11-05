import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { controllerButtonLabel } from './controllerLabels';
import { ControllerGuide } from './components/ControllerGuide';
import { DEFAULT_CONTROLS, bindButton, readActions } from './controls';
import { REBLITZ } from './robot/registry';

it('names standard triggers and face buttons and preserves custom button indices', () => {
  expect(controllerButtonLabel(0)).toBe('A / Cross'); expect(controllerButtonLabel(7)).toBe('RT / R2');
  expect(controllerButtonLabel(31)).toBe('Button 31'); expect(controllerButtonLabel(null)).toBe('Unbound');
});

it('shows the saved assignment that actually fires and hides unsupported actions', () => {
  const controls = bindButton(DEFAULT_CONTROLS, 'shoot', 1);
  const html = renderToStaticMarkup(createElement(ControllerGuide, { controls, robot: REBLITZ, humanSupply: false }));
  expect(html).toContain('B / Circle'); expect(html).not.toContain('RT / R2');
  expect(html).not.toContain('Toggle climber'); expect(html).not.toContain('Human-player supply');
  const buttons = Array.from({ length: 17 }, (_, index) => ({ pressed: index === 1, touched: false, value: index === 1 ? 1 : 0 }));
  expect(readActions(new Set(), controls, { axes: [], buttons }).shoot).toBe(1);
  expect(renderToStaticMarkup(createElement(ControllerGuide, { controls: { ...controls, gamepad: false }, robot: REBLITZ, humanSupply: false }))).toBe('');
});
