DISPLAY=../wallander_display.js
SCRIPTS=sprintf.js display.js projector.js depiction.js toolbox.js 

${DISPLAY} : ${SCRIPTS}
	touch ${DISPLAY}
	chmod +w ${DISPLAY}
	cat ${SCRIPTS} > ${DISPLAY}
	chmod -w ${DISPLAY}

clean:
	rm ${DISPLAY}
