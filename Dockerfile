FROM node:lts-alpine
WORKDIR /client

COPY package.json /client/package.json
COPY yarn.lock /client/yarn.lock
RUN yarn install

COPY . /client

EXPOSE 8080
ENTRYPOINT ["sh", "entrypoint.sh"]