// The one file that imports the engine and configures it. Everything else imports engine names from here.
// Module bindings are read-only, so engine settings go through the engine's setters.
import {
    hsl, isTouchDevice, setCanvasClearColor, setCanvasPixelRatio, setCanvasPixelated, setShowSplashScreen,
    setSoundDefaultRange, setSoundVolume, setTilesPixelated, setTouchGamepadAlpha, setTouchGamepadAnalog,
    setTouchGamepadButtonCount, setTouchGamepadDisplayTime, setTouchGamepadEnable, setTouchGamepadPassthrough,
    setTouchGamepadSize,
} from 'littlejsengine';
export * from 'littlejsengine';

export const MOBILE = isTouchDevice;

setShowSplashScreen(false);
setTilesPixelated(false);
setCanvasPixelated(false);
setCanvasClearColor(hsl(.72, .6, .02));
setSoundVolume(.5);
setSoundDefaultRange(60);
setCanvasPixelRatio(Math.min(window.devicePixelRatio || 1, isTouchDevice ? 1.25 : 1.5));
setTouchGamepadEnable(isTouchDevice);
setTouchGamepadButtonCount(0);
setTouchGamepadPassthrough(true);
setTouchGamepadAnalog(true);
setTouchGamepadSize(120);
setTouchGamepadAlpha(.35);
setTouchGamepadDisplayTime(0);
