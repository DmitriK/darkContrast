ROLLUP = node node_modules/rollup/bin/rollup

CSS_FILES = js/fixContrast.css js/stdAll.css

.PHONY: build/transpiled build/css

all: build/ext/bg.js build/ext/fixInputs.js build/ext/fixAll.js \
	build/ext/popup/toggles.js build/ext/frameListener.js build/ext/css \
	build/ext/others

build/transpiled:
	tsc -p .

build/ext/bg.js: build/transpiled
	$(ROLLUP) build/transpiled/bg.js --output.format iife --output.file $@

build/ext/frameListener.js: build/transpiled
	$(ROLLUP) build/transpiled/frameListener.js --output.format iife --output.file $@

build/ext/fixInputs.js: build/transpiled
	$(ROLLUP) build/transpiled/fixInputs.js --output.format iife --output.file $@

build/ext/fixAll.js: build/transpiled
	$(ROLLUP) build/transpiled/fixAll.js --output.format iife --output.file $@

build/ext/css: src/css/*.css
	cp -r $? build/ext/

build/ext/others: src/manifest.json src/opt src/popup src/icons
	cp -r $? build/ext/

build/ext/popup/toggles.js: build/transpiled build/ext/others
	$(ROLLUP) build/transpiled/popup_toggles.js --output.format iife --output.file $@
