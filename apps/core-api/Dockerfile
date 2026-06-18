# Build context is the repo root (needs Directory.Build.props, global.json, libs, plugins).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy the build inputs. Plugins are referenced by a glob (plugins/*/*.api/*Plugin.csproj) and the
# host's plugin list is source-generated (libs/plugin-generator), so a new plugin needs no edit here —
# the whole plugins/ + libs/ trees are copied wholesale.
COPY global.json Directory.Build.props ./
COPY apps/core-api/ apps/core-api/
COPY libs/ libs/
COPY plugins/ plugins/
RUN dotnet publish apps/core-api/CoreApi.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
# Npgsql probes GSSAPI/Kerberos; install the lib so it doesn't error on connect.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/publish ./
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "CoreApi.dll"]
