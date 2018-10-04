export interface InputPermutation {
    nodeName: string;
    cssSelector: string;
    props?: {
        [key: string]: string
    }
}

export const INPUT_NODES = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];

export const INPUT_PERMS: Array<InputPermutation> = [
    { nodeName: 'INPUT', cssSelector: 'input[type=number]', props: { type: 'number' } },
    { nodeName: 'INPUT', cssSelector: 'input[type=range]', props: { type: 'range' } },
    { nodeName: 'PROGRESS', cssSelector: 'progress' },
    { nodeName: 'BUTTON', cssSelector: 'button,input[type="reset"],input[type="button"],input[type="submit"]' },
    { nodeName: 'INPUT', cssSelector: 'button,input[type="color"],input[type="reset"],input[type="button"],input[type="submit"]', props: { type: 'color' } },
    { nodeName: 'INPUT', cssSelector: 'input[type="radio"],input[type="checkbox"]', props: { type: 'checkbox' } },
    { nodeName: 'INPUT', cssSelector: 'input[type="file"]', props: { type: 'file' } },
    { nodeName: 'INPUT', cssSelector: 'input[type="image"]', props: { type: 'image' } },
    { nodeName: 'OPTION', cssSelector: 'option:disabled,optgroup:disabled', props: { disabled: '1' } },
    { nodeName: 'INPUT', cssSelector: 'input:disabled,textarea:disabled,option:disabled,optgroup:disabled,select:disabled:disabled', props: { disabled: '1' } },
    { nodeName: 'SELECT', cssSelector: 'select[size="0"],select[size="1"]', props: { size: '1' } },
    { nodeName: 'SELECT', cssSelector: 'select[size],select[multiple],select[size][multiple]', props: { size: '2' } },
    { nodeName: 'SELECT', cssSelector: 'select' },
    { nodeName: 'TEXTAREA', cssSelector: 'textarea' },
    { nodeName: 'INPUT', cssSelector: 'input' },
];

export const isInputNode = (node: HTMLElement) => (INPUT_NODES).indexOf(node.nodeName) > -1;
export const isInVisibleNode = (node: Node) => (['#text', 'IMG', 'HEAD', 'TITLE', 'META', 'SCRIPT', 'STYLE', 'BR',
    'LINK', 'FRAMESET',]).indexOf(node.nodeName) > -1;
export const isSubDocNode = (node: Node) => (['IFRAME', 'FRAME', 'OBJECT']).indexOf(node.nodeName) > -1;
