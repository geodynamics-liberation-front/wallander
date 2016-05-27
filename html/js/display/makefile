DISPLAY=../wallander_display.js

SCRIPTS=data_field_manager.js depiction.js depiction_manager.js display.js projector.js sprintf.js status_manager.js toolbox.js util.js

IMAGES=img/*
IMAGE_DIR=../../img

CSS=css/*
CSS_DIR=../../css

all: ${DISPLAY} ${IMAGES} ${CSS}

${DISPLAY}: ${SCRIPTS}  ${IMAGES} ${CSS}
	touch ${DISPLAY}
	chmod +w ${DISPLAY}
	echo '"use strict";' > ${DISPLAY}
	cat ${SCRIPTS} > ${DISPLAY}
	chmod -w ${DISPLAY}
	cp -fv ${IMAGES} ${IMAGE_DIR}
	cp -fv ${CSS} ${CSS_DIR}

clean:
	rm -f ${DISPLAY}

