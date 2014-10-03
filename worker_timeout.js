var INTERVAL = 0,
TIMEOUT = 1,
ANIMATION = 2,
timeout_map = {},
interval_map = {},
animationFrame = false,
create,
b_id,
stop;


this.addEventListener('message',function (message) {
	var data = message.data,map;

	data.type === TIMEOUT && (
		create = setTimeout,
		stop = clearTimeout,
		map = timeout_map
	) ||
	data.type === INTERVAL && (
		create = setInterval,
		stop = clearInterval,
		map = interval_map
	) ||
	data.type === ANIMATION && (
		create = function (frame) {
			if (animationFrame === false) {
				animationFrame = setTimeout(function () {
					if (animationFrame) {
						animationFrame = false;
						self.postMessage('a');
					}
				},data.time);
			}
			return false;
		},
		stop = function () {
			animationFrame !== false && (
				clearTimeout(animationFrame),
				animationFrame = false)
		}
	);
	data.type !== ANIMATION && data.clear && (
		stop(map[data.id]),
		delete map[data.id],
		true
	) ||
	(
		b_id = data.time ? create(function () {
			if (map[data.id]) {
				self.postMessage(data.id);
				data.type === TIMEOUT && (delete map[data.id]);
			}
		},data.time) : create(function () {
			if (map[data.id]) {
				self.postMessage(data.id);
				data.type === TIMEOUT && (delete map[data.id]);
			}

		}),
		b_id !== false && (map[data.id]=b_id)
	);
});

