FROM node:20-alpine
WORKDIR /usr/src/app
RUN apk update && apk add --no-cache ffmpeg
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
