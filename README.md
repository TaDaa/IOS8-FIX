####Apple has fixed the sleep mode issue as of IOS8.1.1 .
Keeping the fix here in case Apple reintroduces the same bug or if anyone needs to specifically target 8.0 -> 8.1.1.










###Status Bar:
If you start your homescreen webapp in landscape mode, the status bar can be stuck in overlapping state.

- Add
  `<script>window.initial_orientation=window.orientation</script><script src="fixes.js></script>`
  to the very start of your index.html (just after DOCTYPE if you are using it).  Needs to be at the very start because orientation can change while the page is loading.
- Include fixes.js and comment out `fixSleepMode()` (unless you are also including the sleep mode fix)
- Modify body styling and framework/application overrides accordingly (for sencha touch you will need to override a number of a functions, I can provide the necessary ones for 2.3.1 if anyone needs them)


###Sleep Mode:
If you use setTimeout/setInterval/requestAnimationFrame/XMLHttpRequest after the lockscreen is shown, those functions will not work again.  Additionally, overflowchanged/resize events will no longer fire and if the keyboard is displayed when a worker.postMessage is called, all of your WebWorkers will permenantly terminate (and you will be unable to restart them).  

This fix addresses only setTimeout/setInterval/requestAnimationFrame/XMLHttpRequest and keyboard/WebWorker functionality.
To fix resize events you will need to modify your code accordingly and perhaps override your frameworks in certain areas (SenchaTouch - we changed paintMonitor to rely on CssAnimation only).  There is more information at the end of this readme on what you currently need to address..

######How to add the fix:
- Add `<script src="fixes.js></script>` to your index.html.  This needs to be the very first script included as it will override XMLHttpRequest, WebWorker, setTimeout, setInterval, requestAnimationFrame, webkitRequestAnimationFrame and the clear functions.
- Modify overrideFramework/overrideApplication functions accordingly.
- Any input/contenteditable element in your application will need to make a call `this.willPauseWorkers()` after the element has a parent.  `willPauseWorkers` will prevent focus/"keyboard opening" on the given element until all WebWorkers are paused.  **IMPORTANT you may need to modify overrideBrowser based on how you use input fields.  The solution in there will not work for everything.  The gist of what you need to accomplish is to force anything that opens the keyboard to call the `focus()` function that has been overridden  You may need to modify the styling and focus logic here depending on your frameworks.` 
- If you use WebWorkers in your application, make sure that you only use `addEventListener` to attach the 'message' listener (do not use `onmessage=[function]`).  WebWorker implementation is overriden in the fix so that all WebWorkers can be paused without requiring heavily modified Worker code.

###Other Notes:
- WebSockets are currently not addressed, but should be fixable using the same approach.  If I have time or if someone has already done it, I will add an implementation.
- Synchronous XMLHttpRequests are not addressed. Only Async is included.  If you are using anything that depends on require/syncRequire you will need to hook the fixes into your application appropriately.  Consider pre/post build as well if you have a minificiation process (we have no syncRequire dependencies after our build process is complete)
- Remove webkitTransition opacity  from your application, as it will cause non-selectable areas after sleep mode has occurred..
- Rework resize/overflowchange logic as these events will not work after sleep mode.  Most resize listeners can probably be moved to orientationchange or hooked directly into other functions.  For example, Sencha Touch depended on overflowchange in the scroller, we moved the height calculations into onTouchStart for the scroller.
- Spam opening the keyboard may break WebWorkers, you can try tweaking the timing of `handleKeyboardFocus()`
- Window Bouncing/Panning can cause WebWorkers to permenantly die, this has been prevented by `window.addEventListener('touchmove,function (e) {e.preventDefault})`.  If you need to be able to scroll the main viewport, I recommend that you use an alternative for momentum scrolling or include a framework/separate implementation for scrolling.

We are using this in a fairly large/complex application that depends heavily on animations and ajax requests without issues.  But let me know if you encounter any bugs or other issues.

========================
###Sencha Touch 2.3.1 framework overrides
Here are the overrideFramework functions for Sencha Touch 2.3.1.   If you have any other components that display custom pickers instead of the keyboard and backed by an input field, add the is_select=true flag to the component's prototype.

####Status Bar
```
function overrideFramework () 
{
      var viewport_prototype = Ext.viewport.Default.prototype;
			var onReady = viewport_prototype.onReady;
			viewport_prototype.onReady = function () {
				var me = this;
				onReady.apply(this,arguments);
				setTimeout(function () {
					var style = me.element.dom.style;
					style.setProperty('position','absolute','important');
					style.setProperty('top','20px','important');
					style.setProperty('height','auto','important');
					style.setProperty('bottom','0px','important');
				});
			};
			viewport_prototype.doSetHeight = function () {};
			viewport_prototype.scrollToTop = function () {};
			viewport_prototype.maximize = function () {};
			viewport_prototype.doAutoMaximizeOnReady = function () {};
			viewport_prototype.doAutoMaximize = function () {};
			viewport_prototype.doAutoMaximizeOnOrientationChange = function () {};
			Ext.viewport.Ios.prototype.setViewportSizeToAbsolute = function () {};
			Ext.viewport.Ios.prototype.getWindowHeight = function () {
				return window.innerHeight-20;
			}
}

```
####Sleep Mode
```
function overrideFramework () {
			Ext.util.PaintMonitor.prototype.constructor = function (config) {
				return new Ext.util.paintmonitor.CssAnimation(config);
			};
			var inputInitElement = Ext.field.Input.prototype.initElement;
			Ext.Decorator.prototype.applyComponent = function (config) {
				config.owner = this;
				config = Ext.factory(config,Ext.Component);
				return config;
			};
			var ods = Ext.scroll.Scroller.prototype.onTouchStart;
			Ext.scroll.Scroller.prototype.onTouchStart = function () {
				var container = this.getContainer(),
				element = this.getElement(),
				box;
				if (container && container.dom) {
					box = container.dom.getBoundingClientRect();
					this.setContainerSize({
						'x' : box.width,
						'y' : box.height
					});
				} 
				if (element) {
					box = element.dom.getBoundingClientRect();
					this.setSize({
						'x' : box.width,
						'y' : box.height
					});
				}
				ods.apply(this,arguments);
			};
			Ext.field.Select.prototype.is_select =  Ext.field.DatePicker.prototype.is_select = true;
			Ext.field.Input.prototype.initElement = function () {
				var inputDom;
				if (this.initialConfig && this.initialConfig.owner) {
					if (this.initialConfig.owner.is_select) {
						return inputInitElement.call(this);
					}
				}
				inputInitElement.call(this);
				inputDom = this.input && this.input.dom;
				if (!inputDom) {
					inputDom = this.element.dom.querySelector('input');
					if (!inputDom) {
						return undefined;
					}
				}
				inputDom.style.setProperty('border-width','0px','important');
				inputDom.style.setProperty('box-sizing','border-box','important');
				inputDom.willPauseWorkers(false);
				inputDom.parentNode._inputWrapper = true;
				inputDom.parentNode.style.setProperty('width','100%','important');
				new Ext.Element(inputDom.parentNode).on('tap',function () {
					inputDom.focus();
				});
				return undefined;
			};
			Ext.viewport.Default.prototype.doBlurInput = function (e) {
				var target = e.target,
				focusedElement = this.focusedElement;
				if (focusedElement && focusedElement.nodeName.toUpperCase() != 'BODY' && (!target._inputWrapper && !this.isInputRegex.test(target.tagName))) {
					delete this.focusedElement;
					focusedElement.blur();
				}
			}
}
```
