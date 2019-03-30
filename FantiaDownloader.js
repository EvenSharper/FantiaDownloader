let loadedLibs = [];
function FantiaDownloader() {
    const LIB_JSZIP = "https://microsoft6477.github.io/lib/jszip.min.js";
    let _baseURL = window.location.href,
        _postID = _baseURL.substr(_baseURL.lastIndexOf("/") + 1),
        _author = this.config.author || document.querySelector(".fanclub-name a").textContent,
        _jsonTemplet = {author: _author, postID: _postID, files: []};

    /** @param  {Array<String>} URLs */
    let loadLibs = (URLs) => {
        if(Object.prototype.toString.call(URLs) === "[object String]")
            URLs = [URLs];
        return new Promise((resolve) => {
            let count = 0;
            let filename = "";
            for(let url of URLs) {
                filename = url.substr(url.lastIndexOf("/") + 1);
                if(loadedLibs.includes(filename)) {
                    count ++;
                    console.log(`(${count}/${URLs.length})${filename}(skiped)`);
                    if(count === URLs.length)
                        resolve();
                    continue;
                }
                let script = document.createElement("script");
                script.src = url;
                script.onload = () => {
                    count ++;
                    console.log(`(${count}/${URLs.length})${filename}(loaded)`);
                    loadedLibs.push(filename);
                    if(count === URLs.length)
                        resolve();
                }
                document.body.append(script);
            }
        });
    }
    /** @returns {Array<String>} */
    let getTargetPageURLs = () => {
        let targetPageURLs = [],
            imagesContainers = document.querySelectorAll(".post-content");
        for(let el of imagesContainers) {
            let price = el.querySelectorAll("span.ng-binding");
            if(price.length === 0)
                continue;
            price = price[0].textContent.split("（");
            if(price.length < 2)
                continue;
            price = price[1];
            price = parseInt(price.replace(/[^0-9]/ig, ""));
            if(price === this.config.price) {
                let images = el.querySelectorAll("img[alt]");
                for(let image of images) {
                    let imageSrc = image.src;
                    let imageId = imageSrc.substring(imageSrc.indexOf("/file/") + 6, imageSrc.indexOf("/thumb")).replace(/[^0-9]/ig, "")
                                || imageSrc.substring(imageSrc.indexOf("/file/") + 6, imageSrc.indexOf("/main")).replace(/[^0-9]/ig, "");
                    targetPageURLs.push(`${_baseURL}/post_content_photo/${imageId}`);
                }
            }
        }
        return targetPageURLs;
    }
    /** 
     * @param {Array<String>} targetPageURLs 
     * @returns {Promise<Array<String>>}
     */
    let getTargetImageURLs = (targetPageURLs) => {
        return new Promise(resolve => {
            let targetImageURLs = [];
            for(let i = 0; i < targetPageURLs.length; i++) {
                (function(index, URL) {
                    fetch(URL).then(response => response.text()).then(htmlContent => {
                        let imageURL = htmlContent.substring(htmlContent.indexOf("<img"), htmlContent.indexOf("/>"));
                        imageURL = imageURL.split("\"")[1];
                        targetImageURLs.push({index: index, url: imageURL.replace(/amp;/g, "")});
                        console.log(`parse Image URL(${targetImageURLs.length}/${targetPageURLs.length})`)
                        if(targetImageURLs.length === targetPageURLs.length) {
                            targetImageURLs.sort((a, b) => a.index - b.index);
                            resolve(targetImageURLs.map(item => item.url));
                        }
                    });
                })(i, targetPageURLs[i]);
            }
        });
    }
    /**
     * @param {Array<String>} targetImageURLs
     * @returns {Promise<Array<String>>}
     */
    let cacheImageToBase64Array = (targetImageURLs) => {
        return new Promise(resolve => {
            let base64Array = [],
                image = new Image(),
                counter = 1;
            let canvas = document.createElement("canvas"),
                ctx = canvas.getContext("2d");
            let preHeight = 0,
                preWidth = 0;
            image.setAttribute("crossOrigin", "Anonymous");
            image.src = targetImageURLs[0];
            image.onload = () => {
                counter ++;
                ctx.clearRect(0, 0, preWidth, preHeight);
                canvas.height = image.height;
                canvas.width = image.width;
                ctx.drawImage(image, 0, 0, image.width, image.height);
                preWidth = image.width;
                preHeight = image.height;
                base64Array.push(canvas.toDataURL(this.config.imageFormate, this.config.imageQuility));
                console.log(`cached image (${counter - 1}/${targetImageURLs.length})`);
                if(counter === targetImageURLs.length + 1) 
                    resolve(base64Array);
                else
                    image.src = targetImageURLs[counter - 1];
            };
        });
    }
    let saveAs = (filename, blob) => {
        let a = document.createElement("a");
        a.download = filename;
        a.href = URL.createObjectURL(blob);
        a.click();
    }
    this.download = async () => {
        await loadLibs(LIB_JSZIP);

        let targetPageURLs = getTargetPageURLs(),
            targetImageURLs = await getTargetImageURLs(targetPageURLs),
            base64Array = await cacheImageToBase64Array(targetImageURLs);

        let zip = new JSZip(),
            folder = zip.folder(_author);
        for(let i = 0; i < base64Array.length; i++) {
            let arr = base64Array[i].split(";base64,"),
                filename = `${_postID}-${i + 1}.${arr[0].split("/")[1]}`;
            folder.file(filename, arr[1], {base64: true});
            if(this.config.isGenerateJsonFile)
                _jsonTemplet.files.push(filename);
        }
        if(this.config.isGenerateJsonFile) 
            zip.folder("./").file(`${_postID}.json`, JSON.stringify(_jsonTemplet), {base64: false});
        zip.generateAsync({type: "blob"}).then((content) => {
            saveAs(`fantia_${_postID}.zip`, content);
        });
    }
}

FantiaDownloader.prototype.config = {
    price: 300,
    isGenerateJsonFile: true,
    imageFormate: "image/png",
    imageQuility: 1.0,
    author: ""
};
(new FantiaDownloader()).download();