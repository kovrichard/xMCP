FROM docker:dind AS base

# Install dependencies
RUN apk add --no-cache \
    nodejs npm \
    python3 py3-pip curl bash

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

ENV PATH="/root/.bun/bin:${PATH}"

# Install uvicorn (use --break-system-packages for Docker isolation)
RUN pip3 install --break-system-packages uvicorn

# Setup aliases
RUN echo "alias uv='uvicorn'" >> ~/.bashrc
RUN echo "alias bunx='bun x'" >> ~/.bashrc

WORKDIR /app

# ------------------------------------------------------------

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install

RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production --ignore-scripts

# ------------------------------------------------------------

FROM base AS prerelease

COPY --from=install /temp/dev/node_modules /app/node_modules
COPY . .

RUN bun run build

# ------------------------------------------------------------

FROM base AS release

COPY --from=prerelease /app /app

CMD ["bun", "run", "dist/server.js"]

# ------------------------------------------------------------

FROM base AS dev

COPY --from=install /temp/dev/node_modules /app/node_modules
