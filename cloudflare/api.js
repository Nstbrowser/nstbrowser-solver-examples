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
      proxy: "" // input format: schema://user:password@host:port
    },
  };

  const query = new URLSearchParams({
    'x-api-key': apiKey,
    config: JSON.stringify(config),
  }).toString();

  const resp = await fetch(`http://localhost:8848/api/agent/devtool/launch?${query}`)
  const json = await resp.json();
  console.log(JSON.stringify(json))
  return json.data
}
