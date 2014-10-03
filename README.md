###Status Bar:
If you start your homescreen webapp in landscape mode, the status bar can be stuck in overlapping state.

- Add
  `<script>window.initial_orientation</script><script src="fixes.js></script>`
  to the very start of your index.html (just after DOCTYPE if you are using it).  Needs to be at the very start because orientation can change while the page is loading.
- Include fixes.js and comment out `fixSleepMode()` (unless you are also including the sleep mode fix)
- Modify body styling and framework/application overrides accordingly (for sencha touch you will need to override a number of a functions, I can provide the necessary ones for 2.3.1 if anyone needs them)


###Sleep Mode:
If you use setTimeout/setInterval/requestAnimationFrame/XMLHttpRequest after the lockscreen is shown, those functions will not work again.  Additionally, overflowchanged/resize events will no longer fire and if the keyboard is displayed when a worker.postMessage is called, all of your workers will permenantly terminate (and you will be unable to restart them).  

This fix addresses only setTimeout/setInterval/requestAnimationFrame/XMLHttpRequest and keyboard/worker functionality.
To fix resize events you will need to modify your code accordingly and perhaps override your frameworks in certain areas (SenchaTouch - we changed paintMonitor to relay on CssAnimation only).  There is more information at the end of this readme on what you currently need to address..

######How to add the fix:
- Add `<script src="fixes.js></script>` to your index.html.  This needs to be the very first script included as it will override XMLHttpRequest, Worker, setTimeout, setInterval, requestAnimationFrame, webkitRequestAnimationFrame and the clear functions.
- Modify overrideFramework/overrideApplication functions accordingly.
- Any input/contenteditable element in your application will need to make a call `this.willPauseWorkers()` so that Workers will disable when keyboard is opened.  **IMPORTANT you may need to modify overrideBrowser based on how you use input fields.  The solution in there will not work for everything.  The gist of what you need to accomplish is to force anything that opens the keyboard to call the `focus()` function that has been overridden
- If you use web workers in your application, make sure that you only use `addEventListener` to attach the 'message' listener.  Worker implementation is overriden in the fix so that all workers can be paused without requiring heavily modified Worker code.

###Other Notes:
- Synchronous XMLHttpRequests are not addressed. Only Async is included.  If you are using anything that depends on require/syncRequire you will need to hook the fixes into your application appropriately.  Consider pre/post build as well if you have a minificiation process (we have no syncRequire dependencies after our build process is complete)
- Remove webkitTransition opacity  from your application, as it will cause non-selectable areas after sleep mode has occurred..
- Rework resize/overflowchange logic as these events will not work after sleep mode.  Most resize listeners can probably be moved to orientationchange or hooked directly into other functions.  For example, Sencha Touch depended on overflowchange in the scroller, we moved the height calculations into onTouchStart for the scroller.
- Spam opening the keyboard may break Workers, you can try tweaking the timing of `handleKeyboardFocus()`
- Window Bouncing/Panning can cause workers to permenantly die, this has been prevented by `window.addEventListener('touchmove,function (e) {e.preventDefault})`

We are using this in a fairly large/complex application that depends heavily on animations and ajax requests without issues.  But let me know if you encounter any bugs or other issues.
