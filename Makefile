NPM = npm
NPMFLAGS = --silent
RM = rm -fr

all: tsgraph.json tsgraph.png
	$(NPM) run solve $(NPMFLAGS)

clean:
	$(RM) tsgraph.json *.png

example:
	$(NPM) run example $(NPMFLAGS)

tsgraph.json tsgraph.png:
	$(NPM) run generate $(NPMFLAGS)

.PHONY: clean example
