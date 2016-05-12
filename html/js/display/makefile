DISPLAY=../wallander_display.js
SCRIPTS=util.js sprintf.js display.js projector.js depiction.js toolbox.js 

${DISPLAY} : ${SCRIPTS}
	touch ${DISPLAY}
	chmod +w ${DISPLAY}
	echo '"use strict";' > ${DISPLAY}
	cat ${SCRIPTS} > ${DISPLAY}
	chmod -w ${DISPLAY}

clean:
	rm -f ${DISPLAY}
