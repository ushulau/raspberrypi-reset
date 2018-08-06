#!/usr/bin/env bash
################################################
# Example of application build and deployment  #
# script                                       #
################################################

HOST_IP=#host name or ip
PORT=#ssh port
FOLDER_NAME="overlord" #folder name to create

cd ~/work/raspberry-pi-test/
ssh -p $PORT pi@$HOST_IP "bash -s $FOLDER_NAME" << 'ENDSSH'
echo "Creating folder if not exists"
mkdir -p ~/$1
echo "Removing old source files"
rm -f ~/$1/rig-overlord.js
rm -f ~/$1/package.json
ENDSSH
echo "Copy to remote"
scp -P $PORT ./src/rig-overlord.js package.json  pi@$HOST_IP:~/${FOLDER_NAME}


ssh -p $PORT pi@$HOST_IP "bash -s $FOLDER_NAME" << 'ENDSSH'

cd ~/$1
echo "Removing old executable linux app"
rm -f ~/$1/rig-overlord
echo "Checking for new dependencies"
npm install
echo "Building to executable"
pkg rig-overlord.js -t node8-linux-armv7
echo "Make it runnable"
chmod +x rig-overlord
ENDSSH

