FROM node:12

WORKDIR /app

COPY . .

WORKDIR /app/frontend/src/environments/

COPY frontend/src/environments/* /app/frontend/src/environments/

WORKDIR /app/uploads

WORKDIR /app

RUN npm install

RUN cd /app/frontend && npm install

RUN npm install -g @angular/cli@7.3.9

RUN cd /app/frontend && ng build --prod --output-path=dist

CMD [ "node", "server.js" ]