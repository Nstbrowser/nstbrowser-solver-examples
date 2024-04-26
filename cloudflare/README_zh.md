# Nstbrowser-solver-Cloudflare

## 使用 Nstbrowser 绕过 Cloudflare Turnstile 🔥🔥🔥
欢迎光临来到本教程！在本教程中我们将使用 Nstbrowser，完成从使用了Cloudflare Turnstile 站点的表单中抓取 turnstile token的步骤。

![turnstile_token.gif](./screenshots/turnstile_token.gif)

让我们通过一个简单的例子来了解它是如何工作的。

###

### **第 1 步：安装 Nstbrowser**

首先，从这个网址下载 Nstbrowser 客户端安装程序：https://www.nstbrowser.io/download。

下载完成后，打开安装程序并按照提示的步骤完成安装过程。安装完成后，你可以在你的设备上找到并启动 Nstbrowser 客户端。

###

### **第 2 步：设置您的 Nstbrowser**

在这个地址注册一个账户：https://app.nstbrowser.io/account/register。

注册成功后，使用你的注册信息在 Nstbrowser 客户端进行登录。登录成功后，你可以在 API 菜单中生成你自己的专属 `API Key`。

![api_key.png](./screenshots/api_key.png)

###

### **第 3 步：编写Token获取代码**

现在，创建一个node 项目，在项目目录中创建一个 `api.js` 文件，并插入以下代码，用于创建并启动一个随机的指纹浏览器实例

```js

// Api Docs: https://apidocs.nstbrowser.io/api-5418530
export async function getBrowserWSEndpoint(apiKey) {
    const config = {
        once: true, // one_time browser
        headless: false, // support: true, 'new'
        autoClose: false,
        // remoteDebuggingPort: 9223,
        fingerprint: {
            name: 'test-turnstile',
            platform: 'windows', // support: windows, mac, linux
            kernel: 'chromium', // only support: chromium
            kernelMilestone: '120', // support: 113, 115, 118, 120
            hardwareConcurrency: 2, // support: 2, 4, 8, 10, 12, 14, 16
            deviceMemory: 8, // support: 2, 4, 8
        },
    };

    const query = new URLSearchParams({
        'x-api-key': apiKey,
        config: JSON.stringify(config),
    }).toString();

    const resp = await fetch(`http://localhost:8848/api/agent/devtool/launch?${query}`)
    const json = await resp.json();
    return json.data
}

```

接下来，创建再创建一个 `turnstile.js` 文件，并插入以下代码，使用 Puppeteer 来自动化获取Turnstile 的 Token 数据。

```jsx
import puppeteer from "puppeteer-core";
import {getBrowserWSEndpoint} from "./api.js";

const apiKey = 'API Key'

async function delay(time) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

let browser = null;

async function turnstile() {
    const {webSocketDebuggerUrl} = await getBrowserWSEndpoint(apiKey)
    browser = await puppeteer.connect({
        browserWSEndpoint: webSocketDebuggerUrl,
        defaultViewport: null,
    });

    let resolveToken = null;
    const tokenPromise = new Promise((resolve) => {
        resolveToken = resolve;
    });

    const page = await browser.newPage();
    
    // This method is used to monitor whether the Checkbox exists on the page and click it
    const checkbox = async () => {
        while (true) {
            try {
                if (page.isClosed()) return;
                const targetFrameUrl = 'cdn-cgi/challenge-platform/';
                const iframe = page.frames().find((frame) => frame.url().includes(targetFrameUrl));
                if (iframe) {
                    const box_element = await iframe.waitForSelector('input[type="checkbox"]', {
                        timeout: 1000,
                        visible: true,
                    });
                    await box_element.click();
                }
            } catch (e) {

            } finally {
                await delay(1000)
            }
        }
    }

    // This method is used to monitor whether the token is returned
    const getResponse = async () => {
        while (true) {
            if (page.isClosed()) return;

            const response = await page.evaluate(() => {
                const token = window?.turnstile?.getResponse()
                if (token) {
                    return {
                        data: token,
                        userAgent: navigator.userAgent,
                    }
                }
            });
            if (response) {
                resolveToken(response);
                page.close().then()
                return;
            }
            await delay(1000)
        }
    }

    getResponse().then()
    checkbox().then()

    await page.goto('https://xxxx.com/turnstile_url');
    return tokenPromise;
}

// Test get trunstile token
turnstile().then(result => {
    console.log(result)
}).catch(err => {
    console.error(err)
}).finally(() => {
    if (browser) {
        browser.close()
    }
})
```

您可以访问Nstbrowser 官方开源仓库查看完整的示例代码：https://github.com/Nstbrowser/nstbrowser-solver-examples.git
