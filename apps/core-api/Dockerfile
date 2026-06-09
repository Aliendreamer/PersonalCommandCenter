# Build context is the repo root (needs Directory.Build.props, global.json, libs, plugins).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore against the project files first for better layer caching.
COPY global.json Directory.Build.props ./
COPY apps/core-api/CoreApi.csproj apps/core-api/
COPY libs/plugin-abstractions/PluginAbstractions.csproj libs/plugin-abstractions/
COPY plugins/system/system.api/SystemPlugin.csproj plugins/system/system.api/
COPY plugins/iot/iot.api/IotPlugin.csproj plugins/iot/iot.api/
RUN dotnet restore apps/core-api/CoreApi.csproj

# Copy sources and publish.
COPY apps/core-api/ apps/core-api/
COPY libs/plugin-abstractions/ libs/plugin-abstractions/
COPY plugins/system/system.api/ plugins/system/system.api/
COPY plugins/iot/iot.api/ plugins/iot/iot.api/
RUN dotnet publish apps/core-api/CoreApi.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "CoreApi.dll"]
