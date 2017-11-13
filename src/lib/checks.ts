declare function getDefaultComputedStyle(elt: Element, pseudoElt?: string): CSSStyleDeclaration;

export const isInputNode = (node: HTMLElement) => (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']).indexOf(node.nodeName) > -1;
export const isInVisibleNode = (node: Node) => (['HEAD', 'TITLE', 'META', 'SCRIPT', 'IMG', 'STYLE', 'BR', 'LINK',
                                                 '#text', 'FRAMESET',]).indexOf(node.nodeName) > -1;
export const isSubDocNode = (node: Node) => (['IFRAME', 'SVG', 'OBJECT', 'EMBED', 'FRAME']).indexOf(node.nodeName) > -1;

export const isFgDefined = (e: HTMLElement): boolean => getComputedStyle(e).color !== getDefaultComputedStyle(e).color;
export const isBgDefined = (e: HTMLElement): boolean => getComputedStyle(e).backgroundColor !== getDefaultComputedStyle(e).backgroundColor;
export const isBgImgDefined = (e: HTMLElement): boolean => getComputedStyle(e).backgroundImage !== 'none';

