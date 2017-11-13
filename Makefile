ROLLUP = node node_modules/rollup/bin/rollup

CSS_FILES = js/fixContrast.css js/stdAll.css

.PHONY: js/transpiled js/css

all: js/bg.js js/fixInputs.js js/fixAll.js js/css

js/transpiled:
	tsc -p .

js/bg.js: js/transpiled
	$(ROLLUP) js/transpiled/bg.js --output.format iife --output.file js/bg.js

js/fixInputs.js: js/transpiled
	$(ROLLUP) js/transpiled/fixInputs.js --output.format iife --output.file js/fixInputs.js

js/fixAll.js: js/transpiled
	$(ROLLUP) js/transpiled/fixAll.js --output.format iife --output.file js/fixAll.js

js/css: src/stdAll.css src/fixContrast.css
	cp src/stdAll.css js/stdAll.css
	cp src/fixContrast.css js/fixContrast.css
