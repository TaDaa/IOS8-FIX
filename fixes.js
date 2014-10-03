var isMobile = navigator.userAgent.toLowerCase().match(/\b(ipad|iphone)\b([^\)]+)/),
version;

//DETECT IOS8
if (isMobile && isMobile.length >= 2) {
    version = isMobile[2].match(/(\d[_]{0,1})+/)
    version && version.length > 1 && (
	    version = version[0],
	    version = version.split(/_/g),
	    version[0] === '8' && IOS8()
    );
}


function IOS8 () {
	IOS8 = function () {};
	var state = {},
	onLoadedFixes = [];
	document.addEventListener('DOMContentLoaded',function () {
		for (var i=0,ln=onLoadedFixes.length;i<ln;i++) {
			onLoadedFixes.shift()();
		}
	});
	fixStatusBar();
	fixSleepMode();
	function fixStatusBar () {
		onLoadedFixes.push(overrideBrowser,overrideFramework);
		function overrideBrowser () {
			var spacer;
			document.body.style.setProperty('height','auto','important');
			document.body.style.setProperty('top','0px','important');
			document.body.style.setProperty('padding-top','20px','important');
			document.body.style.setProperty('bottom','0px','important');
			document.body.style.setProperty('position','absolute','important');
			spacer = document.createElement('div');
			spacer.style.setProperty('height','20px','important');
			spacer.style.setProperty('width','100%','important');
			spacer.style.setProperty('top','0px','important');
			spacer.style.setProperty('position','absolute');
			spacer.style.setProperty('background-color','black');
			document.body.insertBefore(spacer,document.body.firstChild);
		}
		function overrideFramework () {
		}
	}

	function fixSleepMode () {
		WorkerManager = window.WorkerManager = new WorkerManager();
		setupWorkerTimeout();
		setupWorkerAjax();

		overrideBrowser();
		onLoadedFixes.push(overrideFramework,overrideApplication);

		function WorkerManager () {
			var Worker = window.Worker,
			terminate = Worker.prototype.terminate,
			activeWorkers = this.activeWorkers =  {},
			PAUSING = 0,
			PAUSED = 1,
			RESUMING = 2,
			RUNNING = 3;
			window.Worker = function (file) {
				var worker = new Worker('worker_wrapper.js'),
				state = RUNNING,
				postMessage = worker.postMessage,
				addEventListener = worker.addEventListener,
				removeEventListener = worker.removeEventListener,
				callbacks = [],
				messageListeners = [],
				paused = false,
				queue = [],
				received_count = 0,
				sent_count = 0,
				wait_for_received_count = 0;

				worker.wid = WorkerManager.cnt=(WorkerManager.cnt|0)+1;
				activeWorkers[worker.wid] = worker;
				worker.addEventListener('message',function (message) {
					var i,ln,j,jln,
					data = message.data;
					onmessage = worker.onmessage;
					received_count += 1;
					if (data) {
						if (data.pause) {
							wait_for_received_count = data.pause;
						} else if (data.resume) {
							data = data.resume;
							for (i=0,ln=data.length;i<ln;i++) {
								for (j=0,jln=messageListeners.length;j<jln;j++) {
									messageListeners[j].call(this,data[i]);
								}
								onmessage && onmessage.call(this,data[i]);
							}
							if (state !== PAUSED && state !== PAUSING) {
								state = RUNNING;
								for (i=0,ln=queue.length;i<ln;i++) {
									worker.postMessage(queue.shift());
								}
								for (i=0,ln=callbacks.length;i<ln;i++) {
									try {
										callbacks.shift()();
									} catch (e) {
										console.error(e);
									}
								}
							}
						} else if (data.data) {
							for (j=0,jln=messageListeners.length;j<jln;j++) {
								messageListeners[j].call(this,data);
							}
							//onmessage will get called naturally -- if you use onmessage, make sure you are handling your data and not pause/resume
						}
					}
					if (state === PAUSING && wait_for_received_count === received_count) {
						state = PAUSED;
						for (i=0,ln=callbacks.length;i<ln;i++) {
							try {
								callbacks.shift()();
							} catch (e) {
								console.error(e);
							}
						}
					}
				});
				sent_count += 1;
				postMessage.call(worker,{
					'require' : file
				});
				worker.postMessage = function (message) {
					if (state !== PAUSED && state !== PAUSING) {
						sent_count += 1;
						return postMessage.call(this,{
							'data' : message
						});
					} else {
						queue.push(message);
						return undefined;
					}
				};
				worker.terminate = function () {
					this.activeWorkers[this.wid] && delete this.activeWorkers[this.wid];
					return terminate.call(this);
				};
				worker.resume = function (resumeFn) {
					if (state === RUNNING) {
						resumeFn && resumeFn();
						return this;
					}
					if (state !== RESUMING) {
						callbacks = [];
						state = RESUMING;
						wait_for_received_count = 0;
						sent_count += 1;
						postMessage.call(this,{
							'resume' : true
						});
					}
					callbacks.push(resumeFn);
					return this;
				};
				worker.getState = function () {
					return state;
				};
				worker.pause = function (pauseFn) {
					if (state === PAUSED) {
						pauseFn && pauseFn();
						return this;
					} 
					if (state !== PAUSING) {
						callbacks = [];
						state = PAUSING;
						sent_count += 1;
						postMessage.call(this,{
							'pause' : sent_count
						});
					}
					callbacks.push(pauseFn);
					return this;
				};
				worker.addEventListener = function (msg,fn) {
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
				worker.removeEventListener = function (msg,fn) {
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
				return worker;
			};
		}
		WorkerManager.pauseWorkers = function (done) {
			return function () {
				var keys = Object.keys(WorkerManager.activeWorkers),i,ln,count=0;
				function pause (id) {
					if (++count === ln) {
						done && done();
					} 
					return pause;
				}
				for (i=0,ln=keys.length;i<ln;i++) {
					WorkerManager.activeWorkers[keys[i]].pause(function () {
						pause(i);
					});
				}
			};
		};
		WorkerManager.resumeWorkers = function (done) {
			return function () {
				var keys = Object.keys(WorkerManager.activeWorkers),i,ln,count=0;
				function resume (id) {
					if (++count === ln) {
						done && done();
					} 
					return resume;
				}
				for (i=0,ln=keys.length;i<ln;i++) {
					WorkerManager.activeWorkers[keys[i]].resume(function () {
						resume(i);
					});
				}
			};
		};
		function setupWorkerTimeout () {
			var 
			INTERVAL = 0,
			TIMEOUT = 1,
			ANIMATION = 2,
			dispatch = {},
			worker,
			w_animations = [],
			w_fn_map = {},
			w_fn_cnt = 0;
			window.setInterval = dispatch[INTERVAL] = relay(INTERVAL);
			window.setTimeout = dispatch[TIMEOUT] = relay(TIMEOUT);
			requestAnimationFrame = webkitRequestAnimationFrame = dispatch[ANIMATION] =  relay(ANIMATION);
			clearTimeout = relay(TIMEOUT,true);
			clearInterval = relay(INTERVAL,true);
			cancelAnimationFrame = cancelRequestAnimationFrame = webkitCancelAnimationFrame = webkitCancelRequestAnimationFrame = relay(ANIMATION,true);
			worker = window.worker_timeout = new Worker('worker_timeout.js');
			worker.addEventListener('message',function (message) {
				var data = message.data;
				if (data === 'a') {
					var dup = w_animations;
					w_animations = [];
					for (var w_i=0,w_ln=dup.length;w_i<w_ln;w_i++) {
						try {
							delete dup[w_i].time;
							delete dup[w_i].type;
							delete dup[w_i].id;
							delete w_fn_map[dup[w_i].id];
							dup[w_i] && dup[w_i]();
						} catch (e) {}
					}
				} else {
					try {
						fn = w_fn_map[data];
						fn.type !== INTERVAL && (
							delete w_fn_map[message.data],
							delete fn.id,
							delete fn.type,
							delete fn.time
						);
						fn && (
							fn.args && (
								fn.apply(window,fn.args),
								true
							) || 
							fn()
						);
					} catch (e) {}
				}
			});
			function relay (type,clear) {
				var template = {
					id : undefined,
					type : type
				};
				if (!clear) {
					return type == ANIMATION ? function (done,time,args) {
						if (arguments.length > 2) {
							done.args = Array.prototype.slice.call(arguments,2,arguments.length);
						}
						template.clear = false;
						done.id ? (template.id = done.id) : (w_fn_map[(done.id = template.id = ++w_fn_cnt)]= done);
						template.time = time||16;
						done.time == undefined && time && (done.time = template.time);
						done.type === undefined && (done.type = type);
						done.id === undefined && (done.id =  w_fn_cnt);
						w_animations.push(done);
						worker.postMessage(template);
						return w_fn_cnt;
					} : function (done,time,args) {
						if (arguments.length > 2) {
							done.args = Array.prototype.slice.call(arguments,2,arguments.length);
						}
						template.clear = false;
						done.id ? (template.id = done.id) : (w_fn_map[(done.id = template.id = ++w_fn_cnt)]= done);
						template.time = time;
						done.time === undefined && time && (done.time = template.time);
						done.type === undefined && (done.type = type);
						done.id === undefined && (done.id =  w_fn_cnt);
						worker.postMessage(template);
						return w_fn_cnt;
					};
				} else {
					return type === ANIMATION ? function (id) {
						var idx = w_animations.indexOf(w_fn_map[id]);
						template.clear = true;
						template.id = id;
						worker.postMessage(template);
						delete w_fn_map[template.id];
						idx !== -1 && w_animations.splice(idx,1);
					} : function (id) {
						template.clear = true;
						template.id = id;
						worker.postMessage(template);
						delete w_fn_map[template.id];
					};
				}
			}
		}
		function setupWorkerAjax () {
			var w_ajax_cnt = 0,
			sending = {},
			worker = worker_ajax = new Worker('worker_ajax.js');
			worker.addEventListener('message',function (message) {
				var data,xhr,timeout,p,i,ln;
				if (!message || !message.data) {
					return;
				}
				data = message.data;
				xhr = sending[data.id];
				timeout = data.timeout;
				timeout && delete data.timeout;
				for (p in data) {
					xhr[p] = data[p];
				}
				if (xhr) {
					if (timeout) {
						if (xhr.ontimeout) {
							xhr.ontimeout.call(xhr,xhr);
						}
						if (xhr.events.timeout) {
							for (i=0,ln=xhr.events.timeout.length;i<ln;i++) {
								xhr.events.timeout[i].call(xhr,xhr);
							}
						}
					} else {
						if (this.readyState === 4 && xhr) {
							delete sending[this.id];
						}
						if (xhr.onreadystatechange) {
							xhr.onreadystatechange.call(xhr,xhr);
						}
						if (xhr.events.readystatechange) {
							for (i=0,ln=xhr.events.readystatechange.length;i<ln;i++) {
								xhr.events.readystatechange[i].call(xhr,xhr);
							}
						}
					}
				}
			});
			window.XMLHttpRequest = function () {
				this.state = {
					id : w_ajax_cnt++
				};
				this.events = {
					'timeout' :undefined,
					'readystatechange' : undefined
				};
			};
			XMLHttpRequest.prototype.setRequestHeader = function (a,b) {
				if (!this.state.setRequestHeaders) {
					this.state.setRequestHeaders = [];
				} 
				this.state.setRequestHeaders.push(Array.prototype.slice.apply(arguments));
			};
			XMLHttpRequest.prototype.open = function (a,b,async) {
				this.state.async = true; //cant support sync
				async = true;
				this.state.open = Array.prototype.slice.apply(arguments);
			};
			XMLHttpRequest.prototype.overrideMimeType = function (mime) {
				if (!this.state.overrideMimeTypes) {
					this.state.overrideMimeTypes = [];
				}
				this.state.overrideMimeTypes.push(mime);
			};
			XMLHttpRequest.prototype.getAllResponseHeaders = function () {
				console.error('getAllResponseHeaders not implemented');
				//TODO implement this if you need it -- we have no dependencies here
				return '';
			};
			XMLHttpRequest.prototype.getResponseHeader = function (header) {
				console.error('getResponseHeader not implemented');
				//TODO implement this if you need it -- we have no dependencies here
				return '';
			};
			XMLHttpRequest.prototype.addEventListener = function (eventName,fn) {
				if (eventName in this.events) {
					(!this.events[eventName])  && (this.events[eventName] = []);
					this.events[eventName].push(fn);
				}
			};
			XMLHttpRequest.prototype.removeEventListener = function (eventName,fn) {
				var index;
				if (eventName in this.events) {
					if (this.events[eventName]) {
						index = this.events[eventName].indexOf(fn);
						index !== -1 && (
							this.events[eventName].splice(index,1)
						);
					}
				}
			};
			XMLHttpRequest.prototype.abort = function () {
				if (sending[this.state.id]) {
					worker.postMessage({
						'abort' : this.state
					});
				}
			};
			XMLHttpRequest.prototype.send = function () {
				if (this.state.send) {
					throw e;
				}
				this.state.open[0] = this.state.open[0].toUpperCase();

				this.withCredentials && (this.state.withCredentials = this.withCredentials);
				this.responseType && (this.state.responseType = this.responseType);
				this.state.send = Array.prototype.slice.apply(arguments);
				sending[this.state.id] = this;
				worker.postMessage({
						request : this.state
				});

			};
		}
		function overrideBrowser () {
			HTMLElement.prototype._focus = HTMLInputElement.prototype.focus;

			//window bounce will kill workers after sleep mode
			//if you need scrolling near the root, you should try iframe/ -webkit-overflow-scrolling
			//or custom implementation
			window.addEventListener('touchmove',function (e) {
				e.preventDefault();
			})
			//call when in DOM or has has parent (need to wrap with mask)
			HTMLElement.prototype.willPauseWorkers = function () {
				var me = this,
				focus = this.focus,
				bluring = false,
				focusing = false,
				blurFocus = false,
				wrapper,
				mask;
				if (!this.parentNode) {
					console.error('no parent, input needs a parentNode first');
					return;
				}
				wrapper= document.createElement('div');
				wrapper.style.display = 'inline-block';
				this.style.pointerEvents = 'none';
				this.parentNode.insertBefore(wrapper,this);
				wrapper.appendChild(this);
				wrapper.addEventListener('click',function () {
					me.focus();
				},false);

				this._pausesWorkers = true;
				this.willPauseWorkers = function () {};
				this._focus = this.focus;
				this.focus = function () {
					if (focusing || document.activeElement === me) {
						return;
					} 
					bluring = false;
					focusing = true;
					me.style.pointerEvents = null;
					WorkerManager.pauseWorkers(function() {
						me._focus();
					})();
				};
				this.addEventListener('focusin',function (e) {
					e.preventDefault();
					if (!focusing && next_cycle) {
						blurFocus = true;
						me.blur();
						blurFocus = false;
					} 
					return false;
				},false);
				this.addEventListener('blur',function (e) {
					focusing = false;
					bluring = true;
					if (blurFocus) {
						return false;
					}
				},false);
				this.addEventListener('focusout',function (e) {
					focusing = false;
					me.style.pointerEvents = 'none';
					if (blurFocus) {
						blurFocus = false;
						me.focus();
					} else {
						handleKeyboardFocus(0,function () {
							WorkerManager.resumeWorkers(function() {})();
						},200);
					}
					return false;
				},false);
			};
			var CHECK_FOCUS = 99,
			next_cycle = true,
			check_start_time,
			check_fn,
			check_id,
			check_time;
			function handleKeyboardFocus (id,fn,t) {
				next_cycle = false;
				check_start_time = Date.now();
				check_id = id;
				check_fn = fn;
				check_time = t || 0;
				window.postMessage(CHECK_FOCUS,document.location.origin);
				next_cycle = true;
			}
			window.addEventListener('message',function (msg) {
				if (msg.origin === document.location.origin) {
					if (msg.data === CHECK_FOCUS) {
						if ( (Date.now() - check_start_time > check_time) && next_cycle) {
							if (document.activeElement && document.activeElement._pausesWorkers) {
							} else {
								check_fn()
								//WorkerManager.resumeWorkers(function () {})();
							}
						}  else {
							window.postMessage(CHECK_FOCUS,document.location.origin);
						}
					}
				}
			})
		}
		function overrideFramework () {
		}
		function overrideApplication () {
		}
	}
}
