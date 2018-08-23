import { isContrasty, toRGB } from './color';

declare function getDefaultComputedStyle(elt: Element, pseudoElt?: string): CSSStyleDeclaration;

export const INPUT_NODES = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];

export const isInputNode = (node: HTMLElement) => (INPUT_NODES).indexOf(node.nodeName) > -1;
export const isInVisibleNode = (node: Node) => (['#text', 'IMG', 'HEAD', 'TITLE', 'META', 'SCRIPT', 'STYLE', 'BR',
  'LINK', 'FRAMESET',]).indexOf(node.nodeName) > -1;
export const isSubDocNode = (node: Node) => (['IFRAME', 'FRAME', 'OBJECT']).indexOf(node.nodeName) > -1;

export const checkUserInverted = () => {
  const defaultFg =
    toRGB(getDefaultComputedStyle(document.documentElement).getPropertyValue('color'));

  if (!isContrasty(defaultFg, { r: 255, g: 255, b: 255, a: 1 })) {
    // Contrast check against what sites will assume to be default
    // (black fg, white bg) failed, so user most likely has 'Use system
    // colors' on
    return true;
  }

  return false;
};
