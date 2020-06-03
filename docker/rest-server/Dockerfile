# Use an official Node.js image to create the build artifacts
# https://hub.docker.com/_/node
FROM node:14-alpine as builder

# Create and change to the repo directory.
WORKDIR /repo

# Retrieve package dependencies, including dev dependencies.
COPY package.json ./
COPY yarn.lock ./
RUN yarn --frozen-lockfile
# Copy local code to the container image. This is split out
# in an attempt to improve Docker cache hits so that the full
# dependency installation step doesn't need to be run again.
COPY ./ ./
RUN yarn --frozen-lockfile

# Build the packages.
RUN yarn clean && yarn build:all

# Use the official Alpine image for a lean production container.
# https://github.com/nodejs/docker-node#nodealpine
# https://docs.docker.com/develop/develop-images/multistage-build/#use-multi-stage-builds
FROM node:14-alpine
# RUN apk add --no-cache ca-certificates

# Create and change to the app directory.
WORKDIR /app

# Copy the binary to the production image from the builder stage.
COPY --from=builder /repo/packages/rest-server ./
COPY --from=builder /repo/packages/google-sheets-dal ./google-sheets-dal

# Overwrite the google-sheets-dal dependency with the local
# version, and simultaneously install its subdependencies.
# Yarn doesn't work for this operation (it attempts to resolve
# the existing entry from the registry first, and a remove operation
# won't work without a yarn.lock file which this package doesn't
# have because it's a sub package in the monorepo).
RUN npm add "file:./google-sheets-dal" --ci

# Run the web service on container startup.
CMD ["npm", "start"]
