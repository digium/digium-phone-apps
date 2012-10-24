#!/bin/sh

APPNAME=helloworld
if [ -z ${IP_ADDR} ]; then
IP_ADDR=192.168.0.10
fi
ADMIN_PW=789

case "$1" in
  install)
     zip /tmp/${APPNAME}.zip *.png app.json helloworld.js
     curl --anyauth --form file=@/tmp/${APPNAME}.zip --form mode=install http://${IP_ADDR}/cgi-bin/uapp.cgi --user admin:${ADMIN_PW}
     ;;
  uninstall)
     curl --anyauth --form appname=${APPNAME} --form mode=uninstall http://${IP_ADDR}/cgi-bin/uapp.cgi --user admin:${ADMIN_PW}
     ;;
  start)
     curl --anyauth --form appname=${APPNAME} --form mode=start http://${IP_ADDR}/cgi-bin/uapp.cgi --user admin:${ADMIN_PW}
     ;;
  stop)
     curl --anyauth --form appname=${APPNAME} --form mode=shutdown http://${IP_ADDR}/cgi-bin/uapp.cgi --user admin:${ADMIN_PW}
     ;;
  show)
     curl --anyauth --form appname=${APPNAME} --form mode=show http://${IP_ADDR}/cgi-bin/uapp.cgi --user admin:${ADMIN_PW}
     ;;
  log)
     curl --anyauth --form appname=${APPNAME} --form mode=log http://${IP_ADDR}/cgi-bin/uapp.cgi --user admin:${ADMIN_PW}
     ;;
  *)
    echo "Usage: $1 {install|uninstall|start|stop|log|show}" >&2
    exit 1
    ;;
esac

exit 0

