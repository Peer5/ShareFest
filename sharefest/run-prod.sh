#!/bin/sh
# Starts sharefest server "daemon"
# Using forever (npm install forever -g)

# run in production mode (port 443 and 80)
export NODE_ENV=production

# enforce https
export REQUIRE_HTTPS=1

# configure logs
NOW=$(date +"%F")

# stop existing if found
forever stop server.js

#
forever start -e err.log -o out.log -l $NOW.log --append server.js