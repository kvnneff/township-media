BIN := ./node_modules/.bin

lint: node_modules
	@$(BIN)/standard *.js test/**/*.js

test: node_modules lint
	@$(BIN)/tape test/**/*.js | tap-spec

node_modules:
	npm install