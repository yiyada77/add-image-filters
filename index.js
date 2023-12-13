const { Canvas, createCanvas, Image, ImageData, loadImage } = require('canvas');
const { JSDOM } = require('jsdom');
const { writeFileSync, readdir } = require('fs');
const path = require('path');

const dirPath = './input/';

(async () => {
	// emulate a minimal HTML DOM
	installDOM();
	await loadOpenCV();

	readdir(dirPath, (err, files) => {
		if (err) {
			console.log('Error getting directory information.');
		} else {
			files.forEach((file) => {
				for (let i = 0; i < 5; i++) {
					addFilters(file);
				}
			});
		}
	});
})();

async function addFilters(fileName) {
	const image = await loadImage(dirPath + fileName);
	let src = cv.imread(image);

	const params = [];
	params.push(Math.round(Math.random() * 100) - 50);
	params.push(Math.round(Math.random() * 100) - 50);
	params.push(Math.round(Math.random() * 200) - 100);

	try {
		src = contrastAdjustment(src, params[0]); // [-50,50]
	} catch (e) {
		console.log('contrastAdjustment');
	}
	try {
		src = lightnessAdjustment(src, params[1]); // [-50,50]
	} catch (e) {
		console.log('lightnessAdjustment');
	}
	try {
		src = colorTemperatureAdjustment(src, params[2]); // [-100,100]
	} catch (e) {
		console.log('colorTemperatureAdjustment');
	}

	const canvas = createCanvas(image.width, image.height);

	cv.imshow(canvas, src);
	writeFileSync(`output/${ path.parse(fileName).name }_contrast[${ params[0] }]_ightness[${ params[1] }]_colorTemperature[${ params[2] }].jpg`, canvas.toBuffer('image/jpeg'));
	src.delete();
}

/**
 * Using jsdom and node-canvas we define some global variables to emulate HTML DOM.
 * Although a complete emulation can be archived, here we only define those globals used
 * by cv.imread() and cv.imshow().
 */
function installDOM() {
	const dom = new JSDOM();
	global.document = dom.window.document;
	// The rest enables DOM image and canvas and is provided by node-canvas
	global.Image = Image;
	global.HTMLCanvasElement = Canvas;
	global.ImageData = ImageData;
	global.HTMLImageElement = Image;
}

/**
 * Load opencv.js just like before but using Promise instead of callbacks:
 */
function loadOpenCV() {
	return new Promise(resolve => {
		global.Module = {
			onRuntimeInitialized: resolve,
		};
		global.cv = require('./opencv.js');
	});
}

// contrast
function contrastAdjustment(src, percent) {
	const alpha = percent / 100;

	const temp = new cv.Mat();
	src.copyTo(temp);

	const row = src.rows;
	const col = src.cols;
	const threshold = 127;

	for (let i = 0; i < row; i++) {
		const t = temp.ptr(i);
		const s = src.ptr(i);

		for (let j = 0; j < col; j++) {
			const r = s[4 * j + 2];
			const g = s[4 * j + 1];
			const b = s[4 * j];

			let newB, newG, newR;

			if (alpha === 1) {
				t[4 * j + 2] = r > threshold ? 255 : 0;
				t[4 * j + 1] = g > threshold ? 255 : 0;
				t[4 * j] = b > threshold ? 255 : 0;
				continue;
			} else if (alpha >= 0) {
				newR = Math.round(threshold + (r - threshold) / (1 - alpha));
				newG = Math.round(threshold + (g - threshold) / (1 - alpha));
				newB = Math.round(threshold + (b - threshold) / (1 - alpha));
			} else {
				newR = Math.round(threshold + (r - threshold) * (1 + alpha));
				newG = Math.round(threshold + (g - threshold) * (1 + alpha));
				newB = Math.round(threshold + (b - threshold) * (1 + alpha));
			}

			newR = Math.max(0, Math.min(255, newR));
			newG = Math.max(0, Math.min(255, newG));
			newB = Math.max(0, Math.min(255, newB));

			t[4 * j + 3] = s[4 * j + 3]; // alpha
			t[4 * j + 2] = newR;
			t[4 * j + 1] = newG;
			t[4 * j] = newB;
		}
	}

	return temp;
}

// lightness
function lightnessAdjustment(src, percent) {
	const alpha = percent / 100;

	const temp = new cv.Mat();
	src.copyTo(temp); // copy alpha channel

	const row = src.rows;
	const col = src.cols;

	for (let i = 0; i < row; i++) {
		const t = temp.ptr(i);
		const s = src.ptr(i);

		for (let j = 0; j < col; j++) {
			const r = s[4 * j + 2];
			const g = s[4 * j + 1];
			const b = s[4 * j];

			if (alpha >= 0) {
				t[4 * j + 2] = r * (1 - alpha) + 255 * alpha;
				t[4 * j + 1] = g * (1 - alpha) + 255 * alpha;
				t[4 * j] = b * (1 - alpha) + 255 * alpha;
			} else {
				t[4 * j + 2] = r * (1 + alpha);
				t[4 * j + 1] = g * (1 + alpha);
				t[4 * j] = b * (1 + alpha);
			}
		}
	}

	return temp;
}

// colorTemperature
function colorTemperatureAdjustment(src, n) {
	const result = src.clone(), row = src.rows, col = src.cols, level = Math.floor(n / 2);

	for (let i = 0; i < row; i++) {
		const a = src.ptr(i);
		const r = result.ptr(i);
		for (let j = 0; j < col; j++) {
			let R, G, B;
			// R channel
			R = a[j * 4 + 2] + level;
			if (R > 255) {
				r[j * 4 + 2] = 255;
			} else if (R < 0) {
				r[j * 4 + 2] = 0;
			} else {
				r[j * 4 + 2] = R;
			}
			// G channel
			G = a[j * 4 + 1] + level;
			if (G > 255) {
				r[j * 4 + 1] = 255;
			} else if (G < 0) {
				r[j * 4 + 1] = 0;
			} else {
				r[j * 4 + 1] = G;
			}
			// B channel
			B = a[j * 4] - level;
			if (B > 255) {
				r[j * 4] = 255;
			} else if (B < 0) {
				r[j * 4] = 0;
			} else {
				r[j * 4] = B;
			}
			r[j * 4 + 3] = a[j * 4 + 3];
		}
	}

	return result;
}