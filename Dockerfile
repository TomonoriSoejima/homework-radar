FROM pierrezemb/gostatic
CMD ["-fallback", "index.html", "-port", "8080"]
COPY ./homework-radar/ /srv/http/
