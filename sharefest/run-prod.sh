#!/bin/sh
export NODE_ENV=production
export WS_SERVER="`curl http://169.254.169.254/latest/meta-data/public-ipv4`"
export WS_PORT=443

NOW=$(date +"%F")
forever stop server.js
forever start -e err.log -o out.log -l $NOW.log --append server.js
