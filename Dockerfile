FROM php:8.2-cli

WORKDIR /app
COPY index.html ./
COPY css ./css
COPY js ./js
COPY html ./html

EXPOSE 8080
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-8080} -t /app"]
