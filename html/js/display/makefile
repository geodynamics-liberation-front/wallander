DISPLAY=../wallander_display.js
SCRIPTS=data_field_manager.js depiction.js depiction_manager.js display.js projector.js sprintf.js state.js status_manager.js toolbox.js util.js

${DISPLAY} : ${SCRIPTS}
	touch ${DISPLAY}
	chmod +w ${DISPLAY}
	echo '"use strict";' > ${DISPLAY}
	cat ${SCRIPTS} > ${DISPLAY}
	chmod -w ${DISPLAY}

clean:
	rm -f ${DISPLAY}
