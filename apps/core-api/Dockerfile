# Build context is the repo root (needs Directory.Build.props, global.json, libs, plugins).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore against the project files first for better layer caching.
COPY global.json Directory.Build.props ./
COPY apps/core-api/CoreApi.csproj apps/core-api/
COPY libs/plugin-abstractions/PluginAbstractions.csproj libs/plugin-abstractions/
COPY plugins/system/system.api/SystemPlugin.csproj plugins/system/system.api/
COPY plugins/iot/iot.api/IotPlugin.csproj plugins/iot/iot.api/
COPY plugins/calendar/calendar.api/CalendarPlugin.csproj plugins/calendar/calendar.api/
COPY plugins/tasks/tasks.api/TasksPlugin.csproj plugins/tasks/tasks.api/
COPY plugins/notifications/notifications.api/NotificationsPlugin.csproj plugins/notifications/notifications.api/
COPY plugins/search/search.api/SearchPlugin.csproj plugins/search/search.api/
COPY plugins/weather/weather.api/WeatherPlugin.csproj plugins/weather/weather.api/
COPY plugins/rss/rss.api/RssPlugin.csproj plugins/rss/rss.api/
COPY plugins/goodreads/goodreads.api/GoodreadsPlugin.csproj plugins/goodreads/goodreads.api/
RUN dotnet restore apps/core-api/CoreApi.csproj

# Copy sources and publish.
COPY apps/core-api/ apps/core-api/
COPY libs/plugin-abstractions/ libs/plugin-abstractions/
COPY plugins/system/system.api/ plugins/system/system.api/
COPY plugins/iot/iot.api/ plugins/iot/iot.api/
COPY plugins/calendar/calendar.api/ plugins/calendar/calendar.api/
COPY plugins/tasks/tasks.api/ plugins/tasks/tasks.api/
COPY plugins/notifications/notifications.api/ plugins/notifications/notifications.api/
COPY plugins/search/search.api/ plugins/search/search.api/
COPY plugins/weather/weather.api/ plugins/weather/weather.api/
COPY plugins/rss/rss.api/ plugins/rss/rss.api/
COPY plugins/goodreads/goodreads.api/ plugins/goodreads/goodreads.api/
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
