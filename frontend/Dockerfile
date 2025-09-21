# Stage 0, "build-stage", based on Node.js, to build and compile the frontend with multi-stage builds
FROM node:22.12 as angular-build-stage

WORKDIR /app

COPY dreamboard/package*.json dreamboard/package-lock.json /app/

RUN npm install -g npm@latest

RUN npm install

COPY dreamboard /app/

ARG configuration=production

RUN npm run build --configuration=production


# Use a lightweight Node.js base image
FROM node:22.12-alpine

# Set the working directory in the container
WORKDIR /app

COPY --from=angular-build-stage /app/dist/dreamboard ./dist/dreamboard

# Copy package.json and package-lock.json (if present)
COPY server/package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of your application code
COPY server/ .

# Expose the port your app listens on (Cloud Run will inject the PORT env var)
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]