export const INPUT_NODES = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];

export const isInputNode = (node: HTMLElement) => (INPUT_NODES).indexOf(node.nodeName) > -1;
export const isInVisibleNode = (node: Node) => (['#text', 'IMG', 'HEAD', 'TITLE', 'META', 'SCRIPT', 'STYLE', 'BR',
  'LINK', 'FRAMESET',]).indexOf(node.nodeName) > -1;
export const isSubDocNode = (node: Node) => (['IFRAME', 'FRAME', 'OBJECT']).indexOf(node.nodeName) > -1;
