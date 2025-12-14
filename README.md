## <img alt="logo" src="icons/icon.png" height="24"/> Custom Mode Extension

Browser extension to customize the appearance and behavior of websites:
- Inject JS, CSS
- Redirect requests
- Modify headers

>[!NOTE]
The extension is intended to be used ONLY as unpacked in **Developer mode**


### How It Works

There is a main `manifest` file for declaring custom rules: [custom/manifest.inc.json](custom/manifest.inc.json).  
Rules from this manifest (and any of the included manifests) are added using declarative MV3 API:
- https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
- https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts

### Contributing
Feel free to fork this repository, make improvements, and submit a pull request. Suggestions for new features or bug fixes are welcome!
