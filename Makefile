BIN := ./node_modules/.bin
TAPE := $(BIN)/tape
TAP-SPEC := ./node_modules/tap-spec/bin/cmd.js

lint: node_modules
	@$(BIN)/standard *.js test/**/*.js

test: node_modules lint
	@$(TAPE) test/**/*.js | $(TAP-SPEC)

node_modules:
	npm install