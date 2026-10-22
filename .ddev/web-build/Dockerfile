# The ddev-webserver image bakes in whatever PHP patch release was current
# when it was built. Pull the core php8.4 packages up to the latest patch from
# deb.sury.org, and fail the build if that is still below the required minimum.
# Bumping PHP_MIN_VERSION also invalidates the layer cache, forcing a rebuild.
# --force-confold keeps DDEV's customised conffiles (e.g. php-fpm.conf).
ARG PHP_MIN_VERSION=8.4.27
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --only-upgrade --no-install-recommends \
       -o Dpkg::Options::=--force-confold \
       $(dpkg-query -W -f='${db:Status-Abbrev} ${Package} ${Version}\n' 'php8.4-*' | awk '$1 == "ii" && $3 ~ /^8\.4\./ { print $2 }') \
    && rm -rf /var/lib/apt/lists/* \
    && for pkg in php8.4-cli php8.4-fpm; do \
         dpkg --compare-versions "$(dpkg-query -W -f='${Version}' "$pkg")" ge "$PHP_MIN_VERSION" \
           || { echo "$pkg is older than $PHP_MIN_VERSION" >&2; exit 1; }; \
       done
