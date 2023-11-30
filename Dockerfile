# To prevent cache invalidation from changes in fields other than dependencies and scripts
# https://stackoverflow.com/a/58487433
FROM endeveit/docker-jq AS deps

COPY package.json /tmp
RUN jq '{ scripts, main, type, dependencies, devDependencies }' < /tmp/package.json > /tmp/deps.json

# Actual image
FROM node:lts-slim
WORKDIR /app

# Install dependencies
RUN apt-get update
RUN apt-get install -y ca-certificates \
fonts-liberation \
libasound2 \
libatk-bridge2.0-0 \
libatk1.0-0 \
libc6 \
libcairo2 \
libcups2 \
libdbus-1-3 \
libexpat1 \
libfontconfig1 \
libgbm1 \
libgcc1 \
libglib2.0-0 \
libgtk-3-0 \
libnspr4 \
libnss3 \
libpango-1.0-0
libpangocairo-1.0-0 \
libstdc++6 \
libx11-6 \
libx11-xcb1 \
libxcb1 \
libxcomposite1 \
libxcursor1 \
libxdamage1 \
libxext6 \
libxfixes3 \
libxi6 \
libxrandr2 \
libxrender1 \
libxss1 \
libxtst6 \
lsb-release \
wget \
xdg-utils
RUN apt-get install -y curl
RUN apt-get install -y fonts-noto-color-emoji

# Set environment variables
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=server

# Install packages
COPY --from=deps /tmp/deps.json ./package.json
COPY package-lock.json ./
RUN npm ci --omit=dev

# Copy required files to /app
COPY tsconfig.json ./
COPY /src ./src
RUN mkdir -p screenshots/
RUN mkdir -p ./src/config

# Check express.js endpoint
HEALTHCHECK --interval=3s --timeout=30s --start-period=10s --retries=5 \
	CMD curl --fail http://localhost:3000

# Get version from outside since we can't get it from package.json
# Has to be last beacuse it invalidates cache every time we change the version
ARG VERSION=0.0.0
ENV npm_package_version=$VERSION

# Run npm start
CMD ["npm", "start"]
