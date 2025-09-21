FROM node:20-alpine

WORKDIR /app

# Install dependencies first
COPY package.json yarn.lock ./

# Install dependencies with platform-specific handling
RUN yarn install --frozen-lockfile --network-timeout 1000000

# Copy source code
COPY . .

# Build the application
RUN yarn build

EXPOSE 3000

# Use production start command
CMD ["yarn", "start"]