FROM node:18-alpine

WORKDIR /app

# Copy package configuration
COPY package.json ./

# Install packages
RUN npm install

# Copy source code
COPY . .

# Expose Vite default port
EXPOSE 3000

# Start server
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "3000"]
