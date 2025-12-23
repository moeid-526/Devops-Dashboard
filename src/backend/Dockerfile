FROM node:20

# Install Docker CLI
RUN apt-get update && apt-get install -y docker.io

WORKDIR /app

# Copy package.json (context is project root, so package.json is at same level)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy backend source files
COPY src/backend/ ./

EXPOSE 5000

CMD ["node", "server.js"]