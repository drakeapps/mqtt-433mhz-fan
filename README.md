# 433 Mhz Fan HomeKit Server

This is similar to the [433 Mhz Light Server](https://github.com/drakeapps/light-server) but with signals that are just recorded and replayed.

Uses:
* [rpitx](https://github.com/F5OEO/rpitx/) + rtl-sdr for capturing the signal and writing it to an iq file
* rpitx for transmitting the captured signal

## Capturing 

`./rtlmenu.sh` from rpitx folder. Place these recordings in the `fan-recordings` folder and match them up to the action you want to perform in the server `index.js`

# Docker

Web server is run in docker, though to increase reliability of rpitx, the `/boot/config.txt` will need to be modified outside of docker

The docker image is hosted on docker hub, but this is my specific version with specific recordings. If there is a demand for it, this can be refactored to reflect a more generic version

This repo includes a workflow to build it and push it to docker hub. I would recommend changing the settings to match your info as this makes building the image much easier

## Raspberry Pi Modification

Set the GPU frequency as done in the install.sh

https://github.com/F5OEO/rpitx/blob/master/install.sh#L35

