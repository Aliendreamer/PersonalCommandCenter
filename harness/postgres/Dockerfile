FROM postgres:18-alpine

# hypopg (postgres-mcp hypothetical-index analysis) is built from source against this image's own
# pg_config: the apk postgresql-hypopg package installs under Alpine's /usr/lib/postgresql18 +
# /usr/share/postgresql18, which the docker-library from-source build in /usr/local never reads.
ENV HYPOPG_VERSION=1.4.2
RUN apk add --no-cache --virtual .build-deps build-base \
 && wget -qO- "https://github.com/HypoPG/hypopg/archive/refs/tags/${HYPOPG_VERSION}.tar.gz" | tar xz -C /tmp \
 && make -C "/tmp/hypopg-${HYPOPG_VERSION}" install with_llvm=no \
 && rm -rf "/tmp/hypopg-${HYPOPG_VERSION}" \
 && apk del .build-deps
