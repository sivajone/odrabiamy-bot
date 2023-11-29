#!/bin/bash

RED='\033[0;31m'
NC='\033[0m' # No Color

./scripts/remove.sh
VERSION=$(jq -r '.version' package.json)

docker build --build-arg VERSION=$VERSION -t sivajone/odrabiamy-bot:$VERSION .
docker tag sivajone/odrabiamy-bot:$VERSION sivajone/odrabiamy-bot:dev

if [ "$1" == "--run" ]; then
	read -p "$(echo -e "${RED}Are you sure? Running in local docker container may result in a temporary ban of the premium account ${NC}(y/n) ")" -n 1 -r
	echo

	if [[ $REPLY =~ ^[Yy]$ ]]; then
		docker run -d --env-file .env-dev --name odrabiamy-bot sivajone/odrabiamy-bot:$VERSION
	fi
fi
if [ "$1" == "--push" ]; then
	./scripts/push.sh
fi
