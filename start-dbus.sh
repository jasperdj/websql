#!/bin/bash
echo "To start D-Bus system bus, run:"
echo "sudo service dbus start"
echo ""
echo "Or to run without D-Bus (which should work for Electron):"
echo "export DISPLAY=:0"
echo "export DBUS_SESSION_BUS_ADDRESS=''"
echo "npm run electron:dev"