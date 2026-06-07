FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN rm -rf learning-notes
COPY --from=learning_notes_source . ./learning-notes
RUN npm run build
RUN chown -R node:node /app

ENV npm_config_cache=/tmp/.npm

USER node
CMD ["npm", "run", "start"]
