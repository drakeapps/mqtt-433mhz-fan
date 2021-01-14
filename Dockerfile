FROM balenalib/raspberry-pi-node

RUN apt update && apt install git build-essential

WORKDIR /usr/src/app

# setup rpitx
# disable the /boot/config.txt modification
RUN git clone https://github.com/F5OEO/rpitx && \
	cd rpitx && \
	sed -i "s|read -r CONT|CONT='n'|g" install.sh && \
	./install.sh && \
	cd ..

COPY package.json package-lock.json ./
RUN npm i


COPY index.js .

CMD node index.js