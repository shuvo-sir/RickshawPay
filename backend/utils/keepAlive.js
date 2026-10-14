const https = require('https');

const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000;

function keepAlive() {
	const renderUrl = process.env.RENDER_EXTERNAL_URL;

	if (!renderUrl) {
		console.error('Keep-alive ping skipped: RENDER_EXTERNAL_URL is not configured.');
		return;
	}

	try {
		const healthUrl = new URL('/health', renderUrl);
		const request = https.get(healthUrl, (response) => {
			response.on('error', (error) => {
				console.error('Keep-alive ping failed:', error.message);
			});
			response.resume();

			if (response.statusCode < 200 || response.statusCode >= 300) {
				console.error(`Keep-alive ping failed with status ${response.statusCode}.`);
			}
		});

		request.on('error', (error) => {
			console.error('Keep-alive ping failed:', error.message);
		});
	} catch (error) {
		console.error('Keep-alive ping failed:', error.message);
	}
}

function startKeepAlive() {
	if (process.env.NODE_ENV !== 'production') {
		return;
	}

	setInterval(keepAlive, KEEP_ALIVE_INTERVAL);
}

module.exports = { keepAlive, startKeepAlive, KEEP_ALIVE_INTERVAL };
