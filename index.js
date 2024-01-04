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
	params.push(parseFloat((Math.random() - 0.5).toFixed(1)));
	params.push(Math.round(Math.random() * 200) - 100);
	params.push(Math.round(Math.random() * 250) - 50);
	// console.log(params)
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
	// try {
	// 	src = sharpenAdjustment(src, params[3]); // [-0.5,0.5]
	// } catch (e) {
	// 	console.log('sharpenAdjustment');
	// }
	try {
		src = saturationAdjustment(src, params[4]); // [-100,100]
	} catch (e) {
		console.log('saturationAdjustment');
	}
	try {
		src = highlightAdjustment(src, params[5]); // [-50,200]
	} catch (e) {
		console.log('highlightAdjustment');
	}
	const canvas = createCanvas(image.width, image.height);

	cv.imshow(canvas, src);
	writeFileSync(`output/${path.parse(fileName).name}_contrast[${params[0]}]_lightness[${params[1]}]_colorTemperature[${params[2]}]_sharpen[${params[3]}]_saturation[${params[4]}]_highlight[${params[5]}].jpg`, canvas.toBuffer('image/jpeg'));
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

// sharpen
function sharpenAdjustment(src, percent) {
	const result = new cv.Mat();
	const kernel = cv.matFromArray(3, 3, cv.CV_32F, [-1, -1, -1, -1, 9 + percent, -1, -1, -1, -1]);
	cv.filter2D(src, result, -1, kernel);
	kernel.delete();
	return result;
}

// saturation
function saturationAdjustment(src, percent) {
	const increment = percent / 100;
	const temp = src.clone();
	const row = src.rows,
		col = src.cols;
	for (let i = 0; i < row; i++) {
		const t = temp.ptr(i);
		const s = src.ptr(i);
		for (let j = 0; j < col; j++) {
			const r = s[4 * j + 2],
				g = s[4 * j + 1],
				b = s[4 * j],
				max = max3(r, g, b),
				min = min3(r, g, b),
				delta = (max - min) / 255;
			// 灰点不做处理
			if (delta === 0) {
				continue;
			}

			const value = (max + min) / 255,
				L = value / 2;
			let S;
			if (L < 0.5) {
				S = delta / value;
			} else {
				S = delta / (2 - value);
			}

			let alpha;
			if (increment >= 0) {
				if ((increment + S) >= 1) {
					alpha = S;
				} else {
					alpha = 1 - increment;
				}
				alpha = 1 / alpha - 1;
				t[4 * j + 2] = r + (r - L * 255) * alpha;
				t[4 * j + 1] = g + (g - L * 255) * alpha;
				t[4 * j] = b + (b - L * 255) * alpha;
			} else {
				alpha = increment;
				t[4 * j + 2] = L * 255 + (r - L * 255) * (1 + alpha);
				t[4 * j + 1] = L * 255 + (g - L * 255) * (1 + alpha);
				t[4 * j] = L * 255 + (b - L * 255) * (1 + alpha);
			}
			t[4 * j + 3] = s[4 * j + 3];
		}
	}

	return temp;
}

function max3(a, b, c) {
	const max2 = (a, b) => (a > b ? a : b);
	return (a > b ? max2(a, c) : max2(b, c));
}

function min3(a, b, c) {
	const min2 = (a, b) => (a < b ? a : b);
	return (a < b ? min2(a, c) : min2(b, c));
}

// highlight
function highlightAdjustment(input, light) {
	// 生成灰度图
	const gray = new cv.Mat(input.size(), cv.CV_32FC1);
	cv.cvtColor(input, gray, cv.COLOR_RGBA2GRAY, 0);

	// 确定高光区
	let thresh = gray.clone();
	cv.multiply(gray, gray, thresh);

	// 取平均值作为阈值
	const mean = cv.mean(thresh);
	const mask = new cv.Mat(gray.size(), cv.CV_8UC1);
	cv.threshold(thresh, mask, mean[0], 255, cv.THRESH_BINARY);

	// 参数设置
	const max = 4;
	const bright = light / 100 / max;
	const mid = 1 + max * bright * 0.75;

	// 边缘平滑过渡
	const ROWS = mask.rows,
		COLS = mask.cols;
	const midRate = cv.Mat.zeros(input.size(), cv.CV_32FC1);
	const brightRate = cv.Mat.zeros(input.size(), cv.CV_32FC1);
	// mask255 & mask0
	const constantMask = new cv.Mat(ROWS, COLS, cv.CV_32FC1, new cv.Scalar(255));
	const onesMask = cv.Mat.ones(ROWS, COLS, cv.CV_32FC1);
	const mask255 = mask.clone();
	mask255.convertTo(mask255, cv.CV_32FC1);
	const mask0 = new cv.Mat(ROWS, COLS, cv.CV_32FC1);
	cv.subtract(constantMask, mask255, mask0);
	cv.multiply(mask255, onesMask, mask255, 1 / 255);
	cv.multiply(mask0, onesMask, mask0, 1 / 255);
	// midRate
	const constA = new cv.Mat(ROWS, COLS, cv.CV_32FC1, new cv.Scalar(mid));
	const constB = new cv.Mat(ROWS, COLS, cv.CV_32FC1, new cv.Scalar((mid - 1) / mean[0]));
	const temp1 = new cv.Mat(ROWS, COLS, cv.CV_32FC1); // mask255
	const temp2 = new cv.Mat(ROWS, COLS, cv.CV_32FC1); // mask0
	// 将 mask 中对应 255 的部分设为 a
	cv.multiply(mask255, constA, temp1);
	// 计算 mask 中对应 0 的部分，然后乘上 constB，对应位置为 b*thresh + 1
	const thresh32F = thresh.clone();
	thresh32F.convertTo(thresh32F, cv.CV_32FC1);
	cv.multiply(constB, thresh32F, temp2);
	cv.add(temp2, onesMask, temp2);
	cv.multiply(mask0, temp2, temp2);
	cv.add(temp1, temp2, midRate); // 将两部分相加，得到最终的 midRate
	// brightRate
	const temp3 = new cv.Mat(ROWS, COLS, cv.CV_32FC1); // mask255
	const temp4 = new cv.Mat(ROWS, COLS, cv.CV_32FC1); // mask0
	cv.multiply(mask255, onesMask, temp3, bright);
	cv.multiply(mask0, thresh32F, temp4, bright / mean[0]);
	cv.add(temp3, temp4, brightRate); // 将两部分相加，得到最终的 brightRate

	// 高光提亮，获取结果图
	const result32FC3 = new cv.Mat(input.size(), cv.CV_32FC3);
	const midRate32FC3 = new cv.Mat();
	const tmpMats = new cv.MatVector();
	tmpMats.push_back(midRate);
	tmpMats.push_back(midRate);
	tmpMats.push_back(midRate);
	cv.merge(tmpMats, midRate32FC3);
	const brightRate32FC3 = new cv.Mat();
	const tmpMats1 = new cv.MatVector();
	tmpMats1.push_back(brightRate);
	tmpMats1.push_back(brightRate);
	tmpMats1.push_back(brightRate);
	cv.merge(tmpMats1, brightRate32FC3);

	const input32FC4 = new cv.Mat();
	input.convertTo(input32FC4, cv.CV_32FC4);
	const input32FC3 = new cv.Mat();
	cv.cvtColor(input32FC4, input32FC3, cv.COLOR_RGBA2RGB);

	cv.multiply(input32FC3, midRate32FC3, input32FC3);
	cv.add(input32FC3, brightRate32FC3, input32FC3);

	const result = new cv.Mat(input.size(), input.type());
	cv.threshold(input32FC3, result32FC3, 255, 255, cv.THRESH_TRUNC);

	const result8UC3 = new cv.Mat();
	result32FC3.convertTo(result8UC3, cv.CV_8UC3);

	const alpha = cv.Mat.ones(input.size(), cv.CV_8UC1);
	cv.multiply(alpha, cv.Mat.ones(input.size(), cv.CV_8UC1), alpha, 255);
	const rgbMats = new cv.MatVector();
	const rgbaMats = new cv.MatVector();
	cv.split(result8UC3, rgbMats);
	rgbaMats.push_back(rgbMats.get(0));
	rgbaMats.push_back(rgbMats.get(1));
	rgbaMats.push_back(rgbMats.get(2));
	rgbaMats.push_back(alpha);
	cv.merge(rgbaMats, result);

	gray.delete();
	thresh.delete();
	mask.delete();
	midRate.delete();
	brightRate.delete();
	constantMask.delete();
	onesMask.delete();
	mask255.delete();
	mask0.delete();
	constA.delete();
	constB.delete();
	temp1.delete();
	temp2.delete();
	thresh32F.delete();
	temp3.delete();
	temp4.delete();
	result32FC3.delete();
	midRate32FC3.delete();
	tmpMats.delete();
	brightRate32FC3.delete();
	tmpMats1.delete();
	input32FC4.delete();
	input32FC3.delete();
	result8UC3.delete();
	alpha.delete();
	rgbMats.delete();
	rgbaMats.delete();

	return result;
}