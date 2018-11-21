libsLoadedArray = [];
function FantiaParser() {
	var CONST_IMAGE_FORMAT = "image/png";
	var CONST_IMAGE_QUILITY = 1.0;
	var CONST_LIB_JSZIP = "https://microsoft6477.github.io/lib/jszip.min.js";

	var baseURL = window.location.href;
	var postNumber = baseURL.split("/");
	postNumber = postNumber[postNumber.length - 1];
	
	return {
		_getHtmlContentsASync: function(URLs) {
			if(Object.prototype.toString.call(URLs) === "[object String]")
				URLs = [URLs];

			var i = 0;
			return new Promise(resolve => {
				var contents = [];
				for(var url of URLs) {
					(function(url, i) {
						var xhr = new XMLHttpRequest();
						xhr.open("GET", url, true);
						xhr.onload = () => {
							contents.push({index: i, content: xhr.responseText});
							console.log("parsing ImageUrls:" + contents.length + "/" + URLs.length);
							if(contents.length === URLs.length) {
								contents = contents.sort((a, b) => a.index - b.index);
								resolve(contents.map(item => item.content));
							}
						};
						xhr.send();
					})(url, i++);	
				}
			});
		},
		_loadLibASync: function(arrUrl, fn) {
			if(Object.prototype.toString.call(arrUrl) !== "[object Array]")
				arrUrl = [arrUrl];
			console.log("============loading libraries============");
			return new Promise(resolve => {
				var loadedCount = 0;
				var totalCount = arrUrl.length;
				for(url of arrUrl) {
					if(libsLoadedArray.includes(url)) {
						console.log(`${url.split("/").reverse()[0]}(skiped)`);
						totalCount --;
						continue;
					}
					var script = document.createElement("script");
					script.src = url;
					loadedCount ++;
					(function(script, totalCount, loadedCount) {
						script.onload = () => {
							libsLoadedArray.push(url);
							console.log(`${url.split("/").reverse()[0]}(loaded)`);
							if(totalCount === loadedCount) {
								resolve();
							}
						};
						document.body.append(script);
					})(script, totalCount, loadedCount);
					
				}
			});
			
		},
		_getExpectImgElements: function() {
			var expectImageElements = [];
			var container = document.querySelectorAll('.post-content');
			for(var el of container) {
				var sign500 = el.querySelectorAll("span.ng-binding");
				if(sign500.length === 0)
					continue;
				sign500 = sign500[0].textContent;	
				if(sign500.includes("（500円）") || sign500.includes("（500日元）")) {
					var imgs = el.querySelectorAll("img[alt]");
					expectImageElements = expectImageElements.concat(...imgs);
				}
			}
			return expectImageElements;
		},
		_convImage2Base64: function(img) {
			var canvas = document.createElement("canvas");
			canvas.width = img.width;
			canvas.height = img.height;

			var ctx = canvas.getContext("2d");
			ctx.drawImage(img, 0, 0, img.width, img.height);
			return canvas.toDataURL(CONST_IMAGE_FORMAT);
		},
		saveAs: function(blob, filename) {
			var a = document.createElement("a");
			a.download = filename;
			a.href = URL.createObjectURL(blob);
			a.click();
		},
		parseImageIDs: function() {
			return this._getExpectImgElements().map(item => {
				var currNum = item.src;
				currNum = currNum.substring(currNum.indexOf("/file/") + 6, currNum.indexOf("/thumb"));
				return parseInt(currNum);
			});
		},
		parseImageUrlsASync: function(htmlContents) {
			return new Promise(resolve => {
				resolve(htmlContents.map(item => {
					item = item.substring(item.indexOf("<img"), item.indexOf("/>"));
					item = item.split("\"")[1];
					return item.replace(/amp;/g, "");
				}));
			});
		},
		createElementTextASync: function() {
			// var arr = [];
			// var imgUrls = this.parseImageURLs();
			// for(var url of URLs) {
			// 	arr.push(`<span>${(arr.length % 4 + 1)}/${imgUrls.length}</span>`);
			// 	arr.push("<br>");
			// 	arr.push(`<img src="${url}" style="width: 50px; height: 50px">`);
			// 	arr.push("<br>");
			// }
			
			// return arr.join("");
		},
		download: function(startNumber = 1) {
			var self = this;
			this._loadLibASync(CONST_LIB_JSZIP).then(() => {
				console.log("============parse image urls============");
				return this._getHtmlContentsASync(this.parseImageIDs().map(item => `${baseURL}/post_content_photo/${item}`));
			}).then(htmlContents => {
				return this.parseImageUrlsASync(htmlContents);
			}).then(imgUrls => {
				var cachedCount = 0;
				var zip = new JSZip();
				var folder = zip.folder("幾月先人");
				console.log("============cache image files============");
				var img = document.createElement("img");
				img.setAttribute("crossOrigin", "Anonymous");
	
				img.onload = function() {
					cachedCount ++;
					var base64 = self._convImage2Base64(this);
					base64 = base64.split(";base64,");
					folder.file(
						`${startNumber + cachedCount - 1}.${base64[0].split("/")[1]}`,
						base64[1],
						{base64: true}
					);
					console.log(`images cached: ${cachedCount}/${imgUrls.length}`);
					if(cachedCount < imgUrls.length) {
						img.src = imgUrls[cachedCount];
					}
					if(cachedCount === imgUrls.length) {
						zip.generateAsync({type: "blob"}).then((content) => {
							self.saveAs(content, `fantia_${postNumber}.zip`);
						});
					}
				};
				img.src = imgUrls[cachedCount];
			});
		}
	};
}

(new FantiaParser()).download();

