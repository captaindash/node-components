# Binaries
GIT?=git
NPM?=npm
RM?=rm

# Options
NODE_MODULES?=node_modules


test: clean $(NODE_MODULES)
	$(NPM) test

$(NODE_MODULES):
	$(NPM) install

clean:
	$(GIT) clean -ffdx


# Phony some rules
.PHONY: test clean
