const TRUE_VALUES = ['1', 'true', 'yes', 'on']

function parseBoolean(value, fallback = false) {
	if (typeof value === 'boolean') return value
	if (value === undefined || value === null || value === '') return fallback
	return TRUE_VALUES.includes(String(value).trim().toLowerCase())
}

function parseNumber(value, fallback) {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : fallback
}

export function parseInternalDesignCapture(options = {}, defaults = {}) {
	const scrollTop = Math.max(0, parseNumber(options.scrollTop, defaults.scrollTop ?? 0))
	const hideBottomBar = parseBoolean(options.hideBottomBar, defaults.hideBottomBar ?? false)
	const repeatCount = Math.max(1, Math.min(4, parseNumber(options.repeatCount, defaults.repeatCount ?? 3)))
	const delayMs = Math.max(0, parseNumber(options.captureDelay, defaults.delayMs ?? 320))
	const repeatIntervalMs = Math.max(120, parseNumber(options.repeatIntervalMs, defaults.repeatIntervalMs ?? 560))
	const enabled = parseBoolean(options.capture, defaults.enabled ?? false) || scrollTop > 0 || hideBottomBar

	return {
		enabled,
		scrollTop,
		hideBottomBar,
		repeatCount,
		delayMs,
		repeatIntervalMs
	}
}

export function runInternalDesignCaptureScroll(captureOptions) {
	if (!captureOptions || (!captureOptions.enabled && captureOptions.scrollTop <= 0)) {
		return
	}

	for (let index = 0; index < captureOptions.repeatCount; index += 1) {
		setTimeout(() => {
			uni.pageScrollTo({
				scrollTop: captureOptions.scrollTop,
				duration: 0
			})
		}, captureOptions.delayMs + captureOptions.repeatIntervalMs * index)
	}
}
