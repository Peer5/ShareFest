#!/bin/sh
export NODE_ENV=production

NOW=$(date +"%F")
forever stop server.js
forever start -e err.log -o out.log -l $NOW.log --append server.js
