!function initialize () {
	var create = function (create,clear,diffdate,deleteFromMap) {
		var map = {},
		clearFn = self[clear],
		clearWrapper = function (id) {
			delete map[id];
			return clear(id);
		};
		self[clear] = clearWrapper;
		clear = clearFn;
		create = self[create];

		function accessor (fn,time) {
			var i_fn = function () {
				deleteFromMap && delete map[id];
				fn();
			},
			id = create(i_fn,time);
			map[id] = {
				'fn' : i_fn,
				'time' : time,
				'start' : Date.now()
			};
			return id;
		}
		accessor.pause = function () {
			var p;
			for (p in map) {
				clear(p);
			}
		};
		accessor.stop = function () {
			var p;
			for (p in map) {
				clear(p);
			}
			map = {};
		};
		if (diffdate) {
			accessor.resume = function () {
				var p,diff,time=Date.now(),
				swap = {};
				for (p in map) {
					diff = map[p].time - time - map[p].start;
					(diff < 0 && (diff = 0));
					swap[create(map[p].fn,diff)] = map[p];
				}
				map = swap;
			};
		}  else {
			accessor.resume = function () {
				var p,swap= {};
				for (p in map) {
					swap[create(map[p].fn,map[p].time)] = map[p];
				}
				map = swap;
			};
		}
		return accessor;
	},
	ss = setTimeout;
	self.setInterval = create('setInterval','clearInterval');
	self.setTimeout = create('setTimeout','clearTimeout',true,true);

	var PAUSING = 0,
	PAUSED = 1,
	RESUMING = 2,
	RUNNING = 3,
	timer,
	received_count = 0,
	sent_count = 0,
	state = RUNNING,
	wait_for_received_count = 0,
	messageListeners = [],
	queue = [],
	postMessage = self.postMessage,
	addEventListener = self.addEventListener,
	removeEventListener = self.removeEventListener;

	self.addEventListener('message',function (message) {
		var data = message.data;
		received_count += 1;
		if (data.require) {
			importScripts(data.require);
		} else if (data.pause) {
			pause(data.pause);
		} else if (data.resume) {
			resume();
		} else if (data.data) {
			for (j=0,jln=messageListeners.length;j<jln;j++) {
				messageListeners[j].call(this,data);
			}
		}
		if (state === PAUSING && received_count === wait_for_received_count) {
			if (timer) {
				clearTimeout(timer);
			}
			timer = ss(function () {
				if (state !== PAUSING) {
					return;
				}
				timer = undefined;
				state = PAUSED;
				setTimeout.pause();
				setInterval.pause();
				sent_count += 1;
				postMessage.call(self,{
					'pause' : sent_count
				});
			},100);
		}
	});
	self.postMessage = function (message) {
		if (state === PAUSED || state === PAUSING) {
			queue.push({
				'data' : message
			});
			return undefined;
		}  else {
			sent_count += 1;
			return postMessage.call(this,{
				'data' : message
			});
		}
	};
	self.addEventListener = function (msg,fn) {
		if (msg === 'message') {
			if (messageListeners.indexOf(fn) === -1) {
				messageListeners.push(fn);
				return true;
			}
			return false;
		} else {
			return addEventListener.call(this,msg,fn);
		}
	};
	self.removeEventListener = function (msg,fn) {
		var index;
		if (msg === 'message') {
			index = messageListeners.indexOf(fn);
			if (index !== -1) {
				messageListeners.splice(index,1);
				return true;
			}
			return false;
		} else {
			return removeEventListener.call(this,msg,fn);
		}
	};
	
	function pause (count) {
		if (count > wait_for_received_count) {
			wait_for_received_count = count;
		} 
		if (state === PAUSED || state === PAUSING) {
			return self;
		}
		state = PAUSING;
		return self;
	}
	function resume () {
		if (state === RUNNING) {
			return;
		}
		wait_for_received_count = 0;
		state = RESUMING;
		if (timer) {
			clearTimeout(timer);
		}
		timer = ss(function () {
			if (state !== RESUMING) {
				return;
			} 
			timer = undefined;
			setTimeout.resume();
			setInterval.resume();
			state = RUNNING;
			sent_count += 1;
			postMessage.call(self,{
				'resume' : queue
			});
			queue = [];
		},100);
	}
}();
