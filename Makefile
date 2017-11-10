ROLLUP = node node_modules/rollup/bin/rollup

.PHONY: js/transpiled

all: js/bg.js js/fixInputs.js

js/transpiled:
	tsc -p .

js/bg.js: js/transpiled
	$(ROLLUP) js/transpiled/bg.js --output.format iife --output.file js/bg.js

js/fixInputs.js: js/transpiled
	$(ROLLUP) js/transpiled/fixInputs.js --output.format iife --output.file js/fixInputs.js
