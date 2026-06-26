# ============================================================
# Dockerfile - PHP 8.2 + Apache
#
# Kenapa kita perlu Dockerfile sendiri?
# Image php:8.2-apache belum punya ekstensi pdo_mysql.
# Kita install ekstensi itu di sini.
#
# PENTING: Source code (backend/, frontend/) TIDAK di-COPY di sini.
# Kita pakai bind mount di docker-compose.yml supaya:
# - Edit file langsung terlihat tanpa rebuild
# - Workflow: edit → save → refresh browser = langsung jalan
# ============================================================

FROM php:8.2-apache

# Install ekstensi PDO MySQL (dibutuhkan untuk koneksi database)
RUN docker-php-ext-install pdo pdo_mysql

# Aktifkan mod_rewrite Apache (tidak wajib untuk project ini,
# tapi berguna jika nanti mau eksperimen routing)
RUN a2enmod rewrite headers

# Izinkan .htaccess di semua folder
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Samakan uid www-data dengan host user (uid 1000) agar PHP bisa write ke bind mount
RUN usermod -u 1000 www-data && groupmod -g 1000 www-data

# Direktori kerja Apache
WORKDIR /var/www/html

# Tidak ada COPY untuk source code di sini!
# Source code akan di-mount via volume di docker-compose.yml
