OUTPUT_SCRIPT=../widgets.js
SCRIPTS=widgets.js colormap_selector.js color_picker.js drop_down.js svg_button.js 

${OUTPUT_SCRIPT} : ${SCRIPTS}
	touch ${OUTPUT_SCRIPT}
	chmod +w ${OUTPUT_SCRIPT}
	echo '"use strict";' > ${OUTPUT_SCRIPT}
	cat ${SCRIPTS} >> ${OUTPUT_SCRIPT}
	chmod -w ${OUTPUT_SCRIPT}

clean:
	rm -f ${OUTPUT_SCRIPT}
