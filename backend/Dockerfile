FROM node:20-alpine

ENV NODE_ENV=development
WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm install

# Copy the rest of the source
COPY . .

# Run as the non-root user that ships with the node image
RUN chown -R node:node /app
USER node

EXPOSE 5000

CMD ["npm", "run", "dev"]
