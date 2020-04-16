
FROM node:12
WORKDIR /usr/src;app
RUN apt-get update && apt-get install -y --no-install-recommends vim && apt-get clean
COPY package.json .
RUN npm install serverless -g
RUN npm i
COPY . .
CMD ["npm","run" ,"start"] 
# https://www.npmjs.com/package/npm-preinstall