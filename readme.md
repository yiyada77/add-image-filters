## Dependency Installation
To develop this project, we need three primary packages: [jimp](https://www.npmjs.com/package/jimp), [jsdom](https://www.npmjs.com/package/jsdom), and [node-canvas](https://www.npmjs.com/package/canvas).

The `jimp` package allows us to load images for use with OpenCV.js. The `jsdom` and `node-canvas` packages provide the necessary environment to enable `cv.imread()` and `cv.imshow()` functions respectively.

Keep in mind, while installing these packages, you may encounter some errors. To troubleshoot and successfully install these packages, it's recommended to review the installation documentation for each one.

Please note that there are specific additional dependencies required for node-canvas.

| OS       | Command                                                                                                  |
|----------|----------------------------------------------------------------------------------------------------------|
| OS X     | Using Homebrew: `brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman`                  |
| Ubuntu   | `sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev` |
| Fedora   | `sudo yum install gcc-c++ cairo-devel pango-devel libjpeg-turbo-devel giflib-devel`                      |
| Solaris  | `pkgin install cairo pango pkg-config xproto renderproto kbproto xextproto`                              |
| OpenBSD  | `doas pkg_add cairo pango png jpeg giflib`                                                               |
| Windows  | See the wiki                                                                                             |
| Others   | See the wiki                                                                                             |

Then run script at the root directory to install dependencies
```
npm install
```

## How to use

Before you run this project, you should create two folders `input` and `output`.

run project
```
node index.js
```
