# Binaries
NPM?=npm
RM?=rm

# Options
NODE_MODULES?=node_modules


test: $(NODE_MODULES)
	$(NPM) test

$(NODE_MODULES):
	$(NPM) install

clean:
	$(RM) -rf $(NODE_MODULES)


# Phony some rules
.PHONY: test clean
