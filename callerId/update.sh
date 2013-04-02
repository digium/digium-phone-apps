#!/bin/sh

# Pull the application name from the app.json file.
#APPNAME=`cat app.json | grep "name" | cut -f 2 -d\: | sed -e "s/\s\+\"\(\w\+\)\",/\1/"`
APPNAME=callerId

#
if [ -z ${IP_ADDR} ]; then
  echo "Please set IP_ADDR in the environment for where the phone is." >&2
  exit 1
fi

if [ -z ${PHONE_PW} ]; then
PHONE_PW=789
fi

case "$1" in
  install)
     zip /tmp/${APPNAME}.zip app.json startup.js strings-en_us.js
     curl --anyauth --form file=@/tmp/${APPNAME}.zip --form mode=install http://${IP_ADDR}/cgi-bin/uapp.cgi --user admin:${PHONE_PW}
     ;;
  uninstall)
     curl --anyauth --form appname=${APPNAME} --form mode=uninstall http://${IP_ADDR}/cgi-bin/uapp.cgi --user admin:${PHONE_PW}
     ;;
  start)
     curl --anyauth --form appname=${APPNAME} --form mode=start http://${IP_ADDR}/cgi-bin/uapp.cgi --user admin:${PHONE_PW}
     ;;
  stop)
     curl --anyauth --form appname=${APPNAME} --form mode=shutdown http://${IP_ADDR}/cgi-bin/uapp.cgi --user admin:${PHONE_PW}
     ;;
  show)
     curl --anyauth --form appname=${APPNAME} --form mode=show http://${IP_ADDR}/cgi-bin/uapp.cgi --user admin:${PHONE_PW}
     ;;
  log)
     curl --anyauth --form appname=${APPNAME} --form mode=log http://${IP_ADDR}/cgi-bin/uapp.cgi --user admin:${PHONE_PW}
     ;;
  *)
    echo "Usage: $0 {install|uninstall|start|stop|log|show}" >&2
    exit 1
    ;;
esac

exit 0

