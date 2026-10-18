// The one file that imports the engine and configures it. Everything else imports engine names from here.
// Module bindings are read-only, so engine settings go through the engine's setters.
import {
    hsl, isTouchDevice, setCanvasClearColor, setCanvasPixelRatio, setCanvasPixelated, setShowSplashScreen,
    setSoundDefaultRange, setSoundVolume, setTilesPixelated, setTouchGamepadAlpha, setTouchGamepadAnalog,
    setTouchGamepadButtonCount, setTouchGamepadDisplayTime, setTouchGamepadEnable, setTouchGamepadPassthrough,
    setTouchGamepadSize,
} from 'littlejsengine';
export * from 'littlejsengine';

// a phone or tablet: a touch screen whose main pointer is a finger. A laptop with a touch screen keeps the mouse and
// keys, and its touches still work as the mouse
export const MOBILE = isTouchDevice && matchMedia('(pointer: coarse)').matches;

setShowSplashScreen(false);
setTilesPixelated(false);
setCanvasPixelated(false);
setCanvasClearColor(hsl(.72, .6, .02));
setSoundVolume(.5);
setSoundDefaultRange(60);
setCanvasPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.25 : 1.5));
setTouchGamepadEnable(MOBILE);
setTouchGamepadButtonCount(0);
setTouchGamepadPassthrough(true);
setTouchGamepadAnalog(true);
setTouchGamepadSize(120);     // until ui/touch.js sets it from style.css's --stick, which scales with the screen
setTouchGamepadAlpha(.35);
setTouchGamepadDisplayTime(0);
