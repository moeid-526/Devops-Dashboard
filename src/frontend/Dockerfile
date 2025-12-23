FROM node:20

WORKDIR /app

# Copy package.json (context is project root)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]