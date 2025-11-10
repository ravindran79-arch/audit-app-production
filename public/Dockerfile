# Use the official lightweight Node.js 20 image.
# It is recommended to use a specific version tag for production
# for example, node:20.10.0-slim
FROM node:20-slim

# Add a build argument to act as a cache buster (default value 0)
ARG CACHE_BUSTER=0

# Create and change to the application directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this first allows for better cache efficiency.
COPY package*.json ./
# Install production dependencies.
# The container will crash on startup if any dependencies are missing.
RUN npm install --omit=dev

# Use the ARG here to break the layer hash for the COPY command that follows.
# By changing this ARG in the build command, we force this layer and all
# subsequent layers (including the COPY below) to be rebuilt from scratch.
ARG CACHE_BUSTER

# TEMP CACHE BREAK: Insert a new, unique layer that must be executed.
RUN echo "Forcing a clean copy at $(date +%s)" > /tmp/cache_breaker

# Copy the local code to the container.
COPY . .

# Run the web service on the container's default port.
# Cloud Run automatically injects the PORT environment variable.

CMD [ "npm", "start" ]

