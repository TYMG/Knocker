
FROM node:12
RUN apt-get update && apt-get install -y --no-install-recommends vim && apt-get clean
WORKDIR /app
RUN npm install serverless npm-preinstall -g
CMD ["npm-preinstall", '--cmd=\"npm run start\"'] 
# https://www.npmjs.com/package/npm-preinstall