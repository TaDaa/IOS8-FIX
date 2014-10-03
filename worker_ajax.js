var sending = {};

this.addEventListener('message',function (message) {
	var data = message.data,
	xhr;

	if (data.request) {
		data = data.request;
		xhr = new XMLHttpRequest();
		data.open && xhr.open.apply(xhr,data.open);
		data.overrideMimeTypes && data.overrideMimeTypes.forEach(function (override) {
			xhr.overrideMimeType(override);
		});
		data.setRequestHeaders && data.setRequestHeaders.forEach(function (header) {
			xhr.setRequestHeader.apply(xhr,header);
		});
		data.withCredentials && (xhr.withCredentials = data.withCredentials);
		data.responseType && (xhr.responseType = data.responseType);
		data.timeout && (
			xhr.timeout = data.timeout,
			xhr.ontimeout = function () {
				var msg = {
					'readyState' : xhr.readyState,
					'response' : xhr.response,
					'responseType' : xhr.responseType,
					'responseXML' : xhr.responseXML,
					'status' : xhr.status,
					'statusText' : xhr.statusText,
					'timeout' : true,
					'id' : data.id
				};
				(!data.responseType || data.responseType === 'text') && (msg.responseText = xhr.responseText);
				(!data.responseType || data.responseType === 'document') && (msg.responseXML = xhr.responseXML);
				self.postMessage(msg);
			}
		);
		data.withCredentials && (xhr.withCredentials = true);
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				delete sending[data.id];
			}
			var msg = {
				'readyState' : xhr.readyState,
				'response' : xhr.response,
				'responseType' : xhr.responseType,
				'status' : xhr.status,
				'statusText' : xhr.statusText,
				'id' : data.id
			};
			(!data.responseType || data.responseType === 'text') && (msg.responseText = xhr.responseText);
			(!data.responseType || data.responseType === 'document') && (msg.responseXML = xhr.responseXML);

			self.postMessage(msg);
		};
		sending[data.id] = xhr;
		xhr.send.apply(xhr,data.send);
	}  else if (data.abort) {
		xhr = sending[data.id];
		if (xhr) {
			xhr.abort();
			delete sending[data.id];
		}
	}
});
