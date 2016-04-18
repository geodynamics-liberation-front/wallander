SCRIPTS=sprintf.js the_display.js projector.js depiction.js toolbox.js 

display.js : ${SCRIPTS}
	touch display.js
	chmod +w display.js
	cat ${SCRIPTS} > display.js
	chmod -w display.js

clean:
	rm display.js
