#!/bin/bash

RED='\033[0;31m'
NC='\033[0m' # No Color
VERSION=$(jq -r '.version' package.json)

echo -e "${BLUE}Pushing 'dev' image...${NC}"
docker push sivajone/odrabiamy-bot:$VERSION
docker push sivajone/odrabiamy-bot:dev
