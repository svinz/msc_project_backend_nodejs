FROM node:14

WORKDIR /usr/src/app

RUN npm install mqtt@4.2.8 js-yaml@4.1.0 pino@6.13.0 rhea@2.0.4
ENV NODE_ENV=production

ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]
USER node
STOPSIGNAL SIGINT
COPY src .

CMD [ "node", "main.js" ]