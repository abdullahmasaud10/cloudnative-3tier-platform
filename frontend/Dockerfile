FROM nginx:alpine

# Purani default NGINX configuration hatao aur apni lagao
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Apni HTML files NGINX ke folder mein copy karo
COPY . /usr/share/nginx/html/

# Port 80 kholo
EXPOSE 80

# NGINX ko background mein band hone se rokna (Foreground mein zinda rakhna)
CMD ["nginx", "-g", "daemon off;"]
