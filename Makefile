# Binaries
NPM?=npm

# Options
NODE_MODULES?=node_modules


all: $(NODE_MODULES)

test: $(NODE_MODULES)
	npm test

$(NODE_MODULES):
	$(NPM) install


# Phony some rules
.PHONY: all test
