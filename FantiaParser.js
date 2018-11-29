libsLoadedArray = [];
function FantiaParser() {
	var CONST_LIB_JSZIP = "https://microsoft6477.github.io/lib/jszip.min.js";

	var _self = this;

	var _baseURL = window.location.href;
	var _postID = _baseURL.split("/");
	_postID = _postID[_postID.length - 1];

	var _author = !_self.config.author ? document.querySelector('.fanclub-name').textContent : _self.config.author;
	var _jsonTemplet = {author: _author, postID: _postID, files: []};
	
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
			return canvas.toDataURL(_self.config.imageFormat, _self.config.imageQuility);
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
		download: function(startNumber = 1) {
			var self = this;
			this._loadLibASync(CONST_LIB_JSZIP).then(() => {
				console.log("============parse image urls============");
				return this._getHtmlContentsASync(this.parseImageIDs().map(item => `${_baseURL}/post_content_photo/${item}`));
			}).then(htmlContents => {
				return this.parseImageUrlsASync(htmlContents);
			}).then(imgUrls => {
				var cachedCount = 0;
				var zip = new JSZip();
				var folder = zip.folder(_author);
				console.log("============cache image files============");
				var img = document.createElement("img");
				img.setAttribute("crossOrigin", "Anonymous");
	
				img.onload = function() {
					cachedCount ++;
					var base64 = self._convImage2Base64(this);
					base64 = base64.split(";base64,");
					var filename = `${_postID}${("00000" + (startNumber + cachedCount - 1)).substr(-5)}.${base64[0].split("/")[1]}`;
					folder.file(
						filename,
						base64[1],
						{base64: true}
					);
					console.log(`images cached: ${cachedCount}/${imgUrls.length}`);
					if(_self.config.isGenerateJsonFile) 
						_jsonTemplet.files.push(filename);
					if(cachedCount < imgUrls.length) {
						img.src = imgUrls[cachedCount];
					}
					if(cachedCount === imgUrls.length) {
						if(_self.config.isGenerateJsonFile) {
							zip.folder("./").file(
								"package.json",
								JSON.stringify(_jsonTemplet),
								{base64: false}
							);
						}
						zip.generateAsync({type: "blob"}).then((content) => {
							self.saveAs(content, `fantia_${_postID}.zip`);
						});
					}
				};
				img.src = imgUrls[cachedCount];
			});
		}
	};
}

FantiaParser.prototype.config = {
	isGenerateJsonFile: true,	// 一般不用开, 这个只是为了我自己用
	imageFormat: "image/png",	// 生成的图片格式, 比如image/png, image/jpeg
	imageQuility: 1.0,			// 只有格式是 "image/jpeg" 的时候才有效
	author: ""					// 如果不填写, 或者填写false, 或者null的话, 则程序从页面上扒上传者名字
};

(new FantiaParser()).download();

